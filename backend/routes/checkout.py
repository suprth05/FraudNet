from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
import uuid
from datetime import datetime
from models.transaction import Transaction
from models.alert import Alert
from extensions import db
from services.fraud_engine import fraud_engine
from utils.auth import require_role

checkout_bp = Blueprint('checkout', __name__)

@checkout_bp.route('/evaluate', methods=['POST'])
@jwt_required()
def evaluate_checkout():
    """Evaluate a checkout attempt using the fraud engine"""
    data = request.get_json()
    
    # In a real system, merchant_id would come from the cart's items
    # We'll default to a known seed merchant ID or just any merchant
    from models.merchant import Merchant
    merchant = Merchant.query.first()
    if not merchant:
        return {'error': 'No merchants available to process order'}, 500

    merchant_id = merchant.id
    amount = data.get('amount', 0)
    cardholder_name = data.get('cardholder_name', 'Unknown')
    card_last_four = data.get('card_number', '0000')[-4:]
    ip_address = request.remote_addr or data.get('ip_address', '127.0.0.1')
    device_fingerprint = data.get('device_fingerprint', 'browser_default')
    from models.user import User
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id) if current_user_id else None
    email = user.email if user else None
    location = data.get('location', 'US')

    tx_data = {
        'merchant_id': merchant_id,
        'amount': amount,
        'currency': 'USD',
        'cardholder_name': cardholder_name,
        'card_last_four': card_last_four,
        'ip_address': ip_address,
        'device_fingerprint': device_fingerprint,
        'transaction_type': 'purchase',
        'email': email,
        'location': location
    }

    # Evaluate
    evaluation = fraud_engine.evaluate_transaction(tx_data)
    risk_level = evaluation['risk_level']
    fraud_score = evaluation['fraud_score']
    
    # Workflow Decision
    # Low-risk -> approve automatically
    # Medium-risk -> additional verification (OTP)
    # High/Critical-risk -> flag
    
    if risk_level == 'Low':
        status = 'approved'
        action = 'proceed'
    elif risk_level == 'Medium':
        status = 'pending_verification'
        action = 'request_otp'
    else:
        status = 'pending_admin_review'
        action = 'under_review'

    transaction = Transaction(
        id=str(uuid.uuid4()),
        merchant_id=merchant_id,
        amount=amount,
        currency='USD',
        cardholder_name=cardholder_name,
        card_last_four=card_last_four,
        ip_address=ip_address,
        device_fingerprint=device_fingerprint,
        transaction_type='purchase',
        status=status,
        fraud_score=fraud_score,
        is_fraud=(status == 'pending_admin_review'),
        risk_level=risk_level,
        fraud_reasons=evaluation['reasons'],
        transaction_location=location,
        risk_metadata={'ml_confidence': evaluation.get('ml_confidence'), 'rule_score': evaluation.get('rule_score')}
    )
    db.session.add(transaction)

    if status == 'pending_admin_review' or fraud_score > 70:
        fraud_engine.update_collaborative_intelligence(tx_data, True)
        
        alert = Alert(
            id=str(uuid.uuid4()),
            transaction_id=transaction.id,
            alert_type='Checkout Blocked',
            severity='critical' if risk_level == 'Critical' else 'high',
            description=f"Blocked transaction with {risk_level} risk ({fraud_score}). Reasons: {', '.join(evaluation['reasons'])}",
            rule_triggered='Rules Engine Checkout',
            status='open'
        )
        db.session.add(alert)

    db.session.commit()

    from extensions import socketio
    socketio.emit('new_transaction', transaction.to_dict())
    
    if status == 'pending_admin_review' or fraud_score > 70:
        socketio.emit('new_alert', alert.to_dict())
        
    socketio.emit('dashboard_update', {})

    return {
        'transaction_id': transaction.id,
        'action': action,
        'risk_level': risk_level,
        'fraud_reasons': evaluation['reasons'] if status == 'pending_admin_review' else []
    }, 200

@checkout_bp.route('/verify-otp', methods=['POST'])
@jwt_required()
def verify_otp():
    """Verify OTP and complete transaction"""
    data = request.get_json()
    transaction_id = data.get('transaction_id')
    otp = data.get('otp')
    
    transaction = db.session.get(Transaction, transaction_id)
    if not transaction:
        return {'error': 'Transaction not found'}, 404
        
    if transaction.status != 'pending_verification':
        return {'error': 'Transaction does not require verification'}, 400
        
    from extensions import socketio
        
    if otp == '123456': # Mock OTP validation
        transaction.status = 'approved'
        db.session.commit()
        
        # Emit real-time transaction update
        socketio.emit('transaction_update', transaction.to_dict())
        
        return {'success': True, 'message': 'Verification successful. Order placed!'}, 200
    else:
        # Failed verification could increase fraud score
        transaction.otp_failed_attempts = (transaction.otp_failed_attempts or 0) + 1
        
        reasons = transaction.fraud_reasons or []
        if transaction.otp_failed_attempts == 1:
            if "Warning: Failed OTP verification attempt" not in reasons:
                reasons.append("Warning: Failed OTP verification attempt")
        elif transaction.otp_failed_attempts >= 2:
            if "Multiple failed OTP verification attempts detected" not in reasons:
                reasons.append("Multiple failed OTP verification attempts detected")
            transaction.fraud_score = min(transaction.fraud_score + 20, 100)
            
        transaction.fraud_reasons = reasons

        if transaction.otp_failed_attempts >= 3 or transaction.fraud_score >= 60:
            if transaction.otp_failed_attempts >= 3:
                transaction.fraud_score = min(transaction.fraud_score + 20, 100)
            transaction.status = 'pending_admin_review'
            transaction.is_fraud = True
            transaction.risk_level = 'High'
            
            # create alert
            alert = Alert(
                id=str(uuid.uuid4()),
                transaction_id=transaction.id,
                alert_type='OTP Failed',
                severity='high',
                description=f"Transaction blocked after failed OTPs. Final score: {transaction.fraud_score}",
                rule_triggered='Failed Verification',
                status='open'
            )
            db.session.add(alert)

        db.session.commit()
        
        # Emit real-time transaction update
        socketio.emit('transaction_update', transaction.to_dict())
        if transaction.status == 'pending_admin_review':
            socketio.emit('new_alert', alert.to_dict())
            socketio.emit('dashboard_update', {})
        
        return {'success': False, 'error': 'Invalid OTP', 'action': 'under_review' if transaction.status == 'pending_admin_review' else 'retry'}, 400

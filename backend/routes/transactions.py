from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime, timedelta
import random
from models.transaction import Transaction
from models.alert import Alert
from extensions import db
from sqlalchemy import desc
from utils.auth import require_role
from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('', methods=['GET'])
@require_role('admin', 'analyst', 'manager', 'customer', 'merchant')
def get_transactions():
    """Get all transactions with optional filtering and pagination"""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    status = request.args.get('status')
    is_fraud = request.args.get('is_fraud')
    merchant_id = request.args.get('merchant_id')

    query = Transaction.query

    # Role-based data access control
    claims = get_jwt()
    role = claims.get('role')
    user_id = get_jwt_identity()

    if role == 'merchant':
        # In a real system, you'd link user_id to merchant_id
        # For this prototype, we'll assume they pass their merchant_id or we filter strictly if it was stored
        if merchant_id:
            query = query.filter(Transaction.merchant_id == merchant_id)
        else:
            return {'transactions': [], 'total': 0}, 200

    if status:
        query = query.filter(Transaction.status == status)
    if is_fraud is not None:
        is_fraud_bool = is_fraud.lower() == 'true'
        query = query.filter(Transaction.is_fraud == is_fraud_bool)
    if role != 'merchant' and merchant_id:
        query = query.filter(Transaction.merchant_id == merchant_id)

    # Sort by created_at descending
    query = query.order_by(desc(Transaction.created_at))

    # Paginate
    pagination = query.paginate(page=page, per_page=limit, error_out=False)

    return {
        'transactions': [t.to_dict() for t in pagination.items],
        'total': pagination.total,
        'page': page,
        'limit': limit,
        'total_pages': pagination.pages
    }, 200

@transactions_bp.route('/<transaction_id>', methods=['GET'])
@require_role('admin', 'analyst', 'manager', 'customer', 'merchant')
def get_transaction(transaction_id):
    """Get a specific transaction"""
    transaction = db.session.get(Transaction, transaction_id)

    if not transaction:
        return {'error': 'Transaction not found'}, 404

    return transaction.to_dict(), 200

from services.fraud_engine import fraud_engine

@transactions_bp.route('', methods=['POST'])
@require_role('admin', 'customer', 'merchant')
def create_transaction():
    """Create a new transaction for fraud detection"""
    data = request.get_json()

    required_fields = ['merchant_id', 'amount', 'cardholder_name', 'card_last_four']
    if not all(field in data for field in required_fields):
        return {'error': 'Missing required fields'}, 400

    # Evaluate using the rules engine
    evaluation = fraud_engine.evaluate_transaction(data)
    
    transaction = Transaction(
        id=str(uuid.uuid4()),
        merchant_id=data['merchant_id'],
        amount=data['amount'],
        currency=data.get('currency', 'USD'),
        cardholder_name=data['cardholder_name'],
        card_last_four=data['card_last_four'],
        ip_address=data.get('ip_address', '192.168.1.1'),
        device_fingerprint=data.get('device_fingerprint'),
        merchant_mcc=data.get('merchant_mcc'),
        transaction_type=data.get('transaction_type', 'purchase'),
        status='pending',
        fraud_score=evaluation['fraud_score'],
        is_fraud=evaluation['is_fraud'],
        risk_level=evaluation['risk_level'],
        fraud_reasons=evaluation['reasons']
    )
    db.session.add(transaction)

    # Update collaborative intelligence if flagged as fraud
    if transaction.is_fraud:
        fraud_engine.update_collaborative_intelligence(data, True)

    # Automatically create an alert if the transaction is highly suspicious
    if transaction.is_fraud or transaction.fraud_score > 70:
        alert = Alert(
            id=str(uuid.uuid4()),
            transaction_id=transaction.id,
            alert_type='High Fraud Risk',
            severity='critical' if transaction.fraud_score > 90 else 'high',
            description=f"Transaction flagged with {transaction.risk_level} risk ({transaction.fraud_score} score). Reasons: {', '.join(transaction.fraud_reasons)}",
            rule_triggered='Rules Engine',
            status='open'
        )
        db.session.add(alert)

    db.session.commit()

    from extensions import socketio
    socketio.emit('new_transaction', transaction.to_dict())
    
    if transaction.is_fraud or transaction.fraud_score > 70:
        socketio.emit('new_alert', alert.to_dict())
        
    socketio.emit('dashboard_update', {})

    return transaction.to_dict(), 201

@transactions_bp.route('/<transaction_id>', methods=['PUT'])
@require_role('admin', 'analyst')
def update_transaction(transaction_id):
    """Update a transaction"""
    transaction = db.session.get(Transaction, transaction_id)

    if not transaction:
        return {'error': 'Transaction not found'}, 404

    data = request.get_json()

    # Update allowed fields
    allowed_fields = ['status', 'fraud_score', 'is_fraud']
    for field in allowed_fields:
        if field in data:
            setattr(transaction, field, data[field])

    db.session.commit()

    return transaction.to_dict(), 200

@transactions_bp.route('/<transaction_id>/approve', methods=['POST'])
@require_role('admin', 'analyst')
def approve_transaction(transaction_id):
    """Approve a transaction pending admin review"""
    transaction = db.session.get(Transaction, transaction_id)
    if not transaction:
        return {'error': 'Transaction not found'}, 404

    data = request.get_json() or {}
    notes = data.get('notes', '')

    current_user_id = get_jwt_identity()
    from models.user import User
    user = db.session.get(User, current_user_id)
    reviewer_name = user.full_name if user else 'System Admin'

    transaction.status = 'approved'
    transaction.review_status = 'approved'
    transaction.reviewed_by = reviewer_name
    transaction.reviewed_at = datetime.utcnow()
    transaction.review_notes = notes
    transaction.admin_decision_reason = 'Manually approved by admin'
    transaction.is_fraud = False # Reset fraud flag on manual approval

    db.session.commit()

    from extensions import socketio
    socketio.emit('transaction_update', transaction.to_dict())
    socketio.emit('transaction_approved', transaction.to_dict())
    socketio.emit('review_queue_updated', {})
    socketio.emit('dashboard_update', {})

    return transaction.to_dict(), 200

@transactions_bp.route('/<transaction_id>/reject', methods=['POST'])
@require_role('admin', 'analyst')
def reject_transaction(transaction_id):
    """Reject a transaction pending admin review"""
    transaction = db.session.get(Transaction, transaction_id)
    if not transaction:
        return {'error': 'Transaction not found'}, 404

    data = request.get_json() or {}
    notes = data.get('notes', '')

    current_user_id = get_jwt_identity()
    from models.user import User
    user = db.session.get(User, current_user_id)
    reviewer_name = user.full_name if user else 'System Admin'

    transaction.status = 'rejected'
    transaction.review_status = 'rejected'
    transaction.reviewed_by = reviewer_name
    transaction.reviewed_at = datetime.utcnow()
    transaction.review_notes = notes
    transaction.admin_decision_reason = 'Manually rejected by admin'

    db.session.commit()

    from extensions import socketio
    socketio.emit('transaction_update', transaction.to_dict())
    socketio.emit('transaction_rejected', transaction.to_dict())
    socketio.emit('review_queue_updated', {})
    socketio.emit('dashboard_update', {})

    return transaction.to_dict(), 200

@transactions_bp.route('/stats', methods=['GET'])
@require_role('admin', 'analyst', 'manager')
def get_transaction_stats():
    """Get transaction statistics"""
    total = Transaction.query.count()
    fraudulent = Transaction.query.filter_by(is_fraud=True).count()
    fraud_rate = (fraudulent / total * 100) if total > 0 else 0

    transactions = Transaction.query.all()
    total_amount = sum(t.amount for t in transactions)
    avg_fraud_score = sum(t.fraud_score for t in transactions) / total if total > 0 else 0

    status_counts = {}
    for t in transactions:
        status = t.status
        status_counts[status] = status_counts.get(status, 0) + 1

    return {
        'total_transactions': total,
        'fraudulent_count': fraudulent,
        'fraud_rate': round(fraud_rate, 2),
        'total_amount': round(total_amount, 2),
        'average_fraud_score': round(avg_fraud_score, 2),
        'status_breakdown': status_counts
    }, 200

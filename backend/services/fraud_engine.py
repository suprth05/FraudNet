from extensions import db
from models.transaction import Transaction
from models.merchant import Merchant
from models.alert import Alert
from models.indicator import SuspiciousIndicator
from datetime import datetime, timedelta
import uuid
from services.ml_engine import ml_engine

class FraudEngine:
    def evaluate_transaction(self, tx_data):
        """
        Evaluate a transaction and return the fraud score, risk level, reasons, and any alerts.
        tx_data should be a dictionary with transaction fields.
        """
        score = 0
        reasons = []

        merchant_id = tx_data.get('merchant_id')
        amount = float(tx_data.get('amount', 0))
        card_last_four = tx_data.get('card_last_four')
        ip_address = tx_data.get('ip_address')
        device_fingerprint = tx_data.get('device_fingerprint')
        currency = tx_data.get('currency', 'USD')

        email = tx_data.get('email')
        location = tx_data.get('location', 'US')
        cardholder_name = tx_data.get('cardholder_name')

        # 1. High Transaction Amount
        if amount > 10000:
            score += 80
            reasons.append('Transaction exceeds critical financial threshold')
        elif amount > 5000:
            score += 50
            reasons.append('Unusually high transaction amount detected')
        elif amount > 2000:
            score += 30
            reasons.append('Transaction amount exceeds $2000')

        # Find previous transactions for this card
        previous_txs = []
        if card_last_four:
            previous_txs = Transaction.query.filter_by(card_last_four=card_last_four).order_by(Transaction.created_at.desc()).all()

        # 2. Geographic Location Risk Detection
        last_tx = previous_txs[0] if previous_txs else None
        if last_tx and last_tx.transaction_location and location:
            if last_tx.transaction_location != location:
                time_diff = datetime.utcnow() - last_tx.created_at
                if time_diff.total_seconds() < 3600:
                    score += 35
                    reasons.append('Impossible travel behavior detected')
                else:
                    score += 20
                    reasons.append('Transaction originated from unusual geographic location')
        elif not last_tx and location not in ['US', 'CA', 'UK']: # simple new/unusual country logic
            score += 20
            reasons.append('Transaction originated from unusual geographic location')

        # 3. New customer (no previous transactions) or rapid
        if not previous_txs:
            score += 10
            reasons.append('New customer (first time card seen)')
        else:
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            recent_txs = [t for t in previous_txs if t.created_at >= one_hour_ago]
            if len(recent_txs) > 2:
                score += 25
                reasons.append('Multiple rapid transactions detected')

            # 4. Different IP/device from previous transactions
            if ip_address and last_tx.ip_address and ip_address != last_tx.ip_address:
                score += 20
                reasons.append('IP address differs from previous transaction')
            elif device_fingerprint and last_tx.device_fingerprint and device_fingerprint != last_tx.device_fingerprint:
                score += 20
                reasons.append('Device fingerprint differs from previous transaction')

        # 5. International transaction
        merchant = db.session.get(Merchant, merchant_id) if merchant_id else None
        if merchant and currency != 'USD': # Simplified international check
            score += 15
            reasons.append('International transaction')

        # 6. High-risk merchant
        if merchant and merchant.risk_level == 'high':
            score += 25
            reasons.append('High-risk merchant')

        # 7. Known suspicious fingerprint/IP (Collaborative Intelligence)
        if device_fingerprint:
            indicator = SuspiciousIndicator.query.filter_by(indicator_type='device_fingerprint', indicator_value=device_fingerprint).first()
            if indicator and indicator.risk_score > 0:
                score += 40
                reasons.append('Known suspicious device fingerprint')

        if ip_address:
            indicator = SuspiciousIndicator.query.filter_by(indicator_type='ip_address', indicator_value=ip_address).first()
            if indicator and indicator.risk_score > 0:
                score += 35
                reasons.append('Transaction originated from blacklisted/suspicious IP address')
                if indicator.flags_count > 1:
                    score += 15
                    reasons.append('Collaborative Intelligence: IP flagged by multiple merchants')

        # 8. Blacklisted Customer Detection
        blacklisted = False
        from models.user import User
        if email:
            user = User.query.filter_by(email=email).first()
            if user and user.blacklisted:
                blacklisted = True
                
        if not blacklisted and cardholder_name:
            sus_user = User.query.filter_by(full_name=cardholder_name, blacklisted=True).first()
            if sus_user: blacklisted = True

        if not blacklisted and cardholder_name:
            prev_fraud = Transaction.query.filter_by(cardholder_name=cardholder_name, is_fraud=True).first()
            if prev_fraud:
                blacklisted = True

        if blacklisted:
            score += 50
            reasons.append('Blacklisted customer attempted transaction')

        # --- HYBRID SCORING PIPELINE ---
        
        # 1. Get ML Prediction Confidence
        # Extract fields to pass to ML engine for features
        ml_features = {
            'amount': amount,
            'new_customer': not previous_txs,
            'velocity_last_hour': len([t for t in previous_txs if t.created_at >= (datetime.utcnow() - timedelta(hours=1))]) if previous_txs else 1,
            'different_ip': ip_address and previous_txs and ip_address != previous_txs[0].ip_address,
            'international': merchant and currency != 'USD',
            'high_risk_merchant': merchant and merchant.risk_level == 'high'
        }
        
        ml_confidence = ml_engine.predict(ml_features)
        
        # 2. Combine Scores (Rule Engine 60% + ML Engine 40%)
        # Rules dominate so demo triggers behave predictably; ML adds nuance
        rule_score = min(score, 100)
        
        final_score = (rule_score * 0.6) + (ml_confidence * 0.4)
        
        if ml_confidence > 70:
            reasons.append(f'ML Model detected high risk (Confidence: {ml_confidence:.1f}%)')
            
        final_score = round(final_score, 2)

        # Determine risk level based on combined score
        if final_score <= 30:
            risk_level = 'Low'
        elif final_score <= 60:
            risk_level = 'Medium'
        elif final_score <= 80:
            risk_level = 'High'
        else:
            risk_level = 'Critical'

        return {
            'fraud_score': final_score,
            'rule_score': rule_score,
            'ml_confidence': ml_confidence,
            'risk_level': risk_level,
            'reasons': reasons,
            'is_fraud': final_score >= 75
        }

    def update_collaborative_intelligence(self, tx_data, is_fraud):
        """Update indicators based on confirmed fraud"""
        if not is_fraud:
            return

        ip_address = tx_data.get('ip_address')
        device_fingerprint = tx_data.get('device_fingerprint')

        indicators_to_update = []
        if ip_address:
            indicators_to_update.append(('ip_address', ip_address))
        if device_fingerprint:
            indicators_to_update.append(('device_fingerprint', device_fingerprint))

        merchant_id = tx_data.get('merchant_id')

        for ind_type, ind_value in indicators_to_update:
            indicator = SuspiciousIndicator.query.filter_by(indicator_type=ind_type, indicator_value=ind_value).first()
            if indicator:
                indicator.flags_count += 1
                indicator.risk_score += 10 # Increase risk score
                indicator.last_seen = datetime.utcnow()
                if merchant_id and merchant_id not in indicator.merchants_flagged:
                    # Update merchants_flagged list
                    current_merchants = list(indicator.merchants_flagged)
                    current_merchants.append(merchant_id)
                    indicator.merchants_flagged = current_merchants
                    
                    # Broad alert if same IP/device triggers fraud across multiple merchants
                    from extensions import socketio
                    socketio.emit('new_alert', {
                        'alert_type': 'Collaborative Intelligence',
                        'severity': 'critical',
                        'description': f"Suspicious {ind_type} ({ind_value}) detected across multiple merchants.",
                        'rule_triggered': 'Cross-Merchant Fraud'
                    })
            else:
                indicator = SuspiciousIndicator(
                    id=str(uuid.uuid4()),
                    indicator_type=ind_type,
                    indicator_value=ind_value,
                    risk_score=10,
                    flags_count=1,
                    merchants_flagged=[merchant_id] if merchant_id else []
                )
                db.session.add(indicator)
        db.session.commit()

fraud_engine = FraudEngine()

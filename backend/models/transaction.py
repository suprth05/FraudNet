from extensions import db
from datetime import datetime

class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.String(36), primary_key=True)
    merchant_id = db.Column(db.String(36), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    cardholder_name = db.Column(db.String(120), nullable=False)
    card_last_four = db.Column(db.String(4), nullable=False)
    ip_address = db.Column(db.String(45))
    device_fingerprint = db.Column(db.String(120))
    merchant_mcc = db.Column(db.String(10))
    transaction_type = db.Column(db.String(50), default='purchase')
    status = db.Column(db.String(50), default='pending')
    fraud_score = db.Column(db.Float)
    is_fraud = db.Column(db.Boolean, default=False)
    risk_level = db.Column(db.String(20), default='Low')
    fraud_reasons = db.Column(db.JSON)
    otp_failed_attempts = db.Column(db.Integer, default=0)
    transaction_location = db.Column(db.String(100))
    risk_metadata = db.Column(db.JSON)
    fraud_trigger_source = db.Column(db.String(100))
    
    review_status = db.Column(db.String(50), default='pending') # pending, approved, rejected
    reviewed_by = db.Column(db.String(120))
    reviewed_at = db.Column(db.DateTime)
    review_notes = db.Column(db.Text)
    admin_decision_reason = db.Column(db.String(255))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'merchant_id': self.merchant_id,
            'amount': self.amount,
            'currency': self.currency,
            'cardholder_name': self.cardholder_name,
            'card_last_four': self.card_last_four,
            'ip_address': self.ip_address,
            'device_fingerprint': self.device_fingerprint,
            'merchant_mcc': self.merchant_mcc,
            'transaction_type': self.transaction_type,
            'status': self.status,
            'fraud_score': self.fraud_score,
            'is_fraud': self.is_fraud,
            'risk_level': self.risk_level,
            'fraud_reasons': self.fraud_reasons,
            'otp_failed_attempts': self.otp_failed_attempts,
            'transaction_location': self.transaction_location,
            'risk_metadata': self.risk_metadata,
            'fraud_trigger_source': self.fraud_trigger_source,
            'review_status': self.review_status,
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'review_notes': self.review_notes,
            'admin_decision_reason': self.admin_decision_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

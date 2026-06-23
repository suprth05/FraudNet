from extensions import db
from datetime import datetime

class Merchant(db.Model):
    __tablename__ = 'merchants'

    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20))
    country = db.Column(db.String(2), default='US')
    risk_level = db.Column(db.String(20), default='low')
    monthly_transaction_volume = db.Column(db.Float, default=0.0)
    chargeback_rate = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'email': self.email,
            'phone': self.phone,
            'country': self.country,
            'risk_level': self.risk_level,
            'monthly_transaction_volume': self.monthly_transaction_volume,
            'chargeback_rate': self.chargeback_rate,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

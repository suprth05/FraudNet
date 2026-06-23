from extensions import db
from datetime import datetime

class SuspiciousIndicator(db.Model):
    __tablename__ = 'suspicious_indicators'

    id = db.Column(db.String(36), primary_key=True)
    indicator_type = db.Column(db.String(50), nullable=False) # 'ip_address', 'device_fingerprint'
    indicator_value = db.Column(db.String(255), nullable=False)
    risk_score = db.Column(db.Integer, default=0) # Collaborative risk score (e.g. +10 per incident)
    flags_count = db.Column(db.Integer, default=1) # Number of times this indicator was flagged
    merchants_flagged = db.Column(db.JSON, default=list) # List of merchant IDs that flagged this
    first_seen = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'indicator_type': self.indicator_type,
            'indicator_value': self.indicator_value,
            'risk_score': self.risk_score,
            'flags_count': self.flags_count,
            'merchants_flagged': self.merchants_flagged,
            'first_seen': self.first_seen.isoformat() if self.first_seen else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None
        }

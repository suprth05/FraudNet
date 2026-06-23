from extensions import db
from datetime import datetime

class Alert(db.Model):
    __tablename__ = 'alerts'

    id = db.Column(db.String(36), primary_key=True)
    transaction_id = db.Column(db.String(36), nullable=False)
    alert_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.String(20), default='medium')
    description = db.Column(db.Text, nullable=False)
    rule_triggered = db.Column(db.String(120))
    status = db.Column(db.String(20), default='open')
    assigned_to = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)
    resolution_notes = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'alert_type': self.alert_type,
            'severity': self.severity,
            'description': self.description,
            'rule_triggered': self.rule_triggered,
            'status': self.status,
            'assigned_to': self.assigned_to,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolution_notes': self.resolution_notes
        }

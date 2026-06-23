from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime
from models.alert import Alert
from extensions import db
from sqlalchemy import desc
from utils.auth import require_role

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('', methods=['GET'])
@require_role('admin', 'analyst')
def get_alerts():
    """Get all alerts with filtering"""
    status = request.args.get('status')
    severity = request.args.get('severity')
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)

    query = Alert.query

    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)

    # Sort by created_at descending
    query = query.order_by(desc(Alert.created_at))

    # Paginate
    pagination = query.paginate(page=page, per_page=limit, error_out=False)

    return {
        'alerts': [a.to_dict() for a in pagination.items],
        'total': pagination.total,
        'page': page,
        'limit': limit,
        'total_pages': pagination.pages
    }, 200

@alerts_bp.route('/<alert_id>', methods=['GET'])
@require_role('admin', 'analyst')
def get_alert(alert_id):
    """Get a specific alert"""
    alert = db.session.get(Alert, alert_id)

    if not alert:
        return {'error': 'Alert not found'}, 404

    return alert.to_dict(), 200

@alerts_bp.route('', methods=['POST'])
@require_role('admin')
def create_alert():
    """Create a new fraud alert"""
    data = request.get_json()

    required_fields = ['transaction_id', 'alert_type', 'description']
    if not all(field in data for field in required_fields):
        return {'error': 'Missing required fields'}, 400

    alert = Alert(
        id=str(uuid.uuid4()),
        transaction_id=data['transaction_id'],
        alert_type=data['alert_type'],
        severity=data.get('severity', 'medium'),
        description=data['description'],
        rule_triggered=data.get('rule_triggered'),
        status='open',
        assigned_to=data.get('assigned_to')
    )

    db.session.add(alert)
    db.session.commit()

    return alert.to_dict(), 201

@alerts_bp.route('/<alert_id>', methods=['PUT'])
@require_role('admin', 'analyst')
def update_alert(alert_id):
    """Update an alert"""
    alert = db.session.get(Alert, alert_id)

    if not alert:
        return {'error': 'Alert not found'}, 404

    data = request.get_json()

    # Update allowed fields
    allowed_fields = ['status', 'assigned_to', 'resolution_notes']
    for field in allowed_fields:
        if field in data:
            setattr(alert, field, data[field])

    if data.get('status') == 'resolved' and not alert.resolved_at:
        alert.resolved_at = datetime.utcnow()

    db.session.commit()

    return alert.to_dict(), 200

@alerts_bp.route('/summary', methods=['GET'])
@require_role('admin', 'analyst', 'manager')
def get_alerts_summary():
    """Get alerts summary"""
    total = Alert.query.count()
    open_alerts = Alert.query.filter_by(status='open').count()
    resolved = Alert.query.filter_by(status='resolved').count()

    severity_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
    alerts = Alert.query.all()
    for alert in alerts:
        severity = alert.severity or 'medium'
        if severity in severity_counts:
            severity_counts[severity] += 1
        else:
            severity_counts[severity] = 1

    return {
        'total_alerts': total,
        'open_alerts': open_alerts,
        'resolved_alerts': resolved,
        'severity_breakdown': severity_counts
    }, 200

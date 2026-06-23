from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime
from models.merchant import Merchant
from extensions import db
from sqlalchemy import desc
from utils.auth import require_role

merchants_bp = Blueprint('merchants', __name__)

@merchants_bp.route('', methods=['GET'])
@require_role('admin', 'analyst', 'manager')
def get_merchants():
    """Get all merchants with filtering"""
    risk_level = request.args.get('risk_level')
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)

    query = Merchant.query

    if risk_level:
        query = query.filter(Merchant.risk_level == risk_level)

    query = query.order_by(desc(Merchant.created_at))
    pagination = query.paginate(page=page, per_page=limit, error_out=False)

    return {
        'merchants': [m.to_dict() for m in pagination.items],
        'total': pagination.total,
        'page': page,
        'limit': limit,
        'total_pages': pagination.pages
    }, 200

@merchants_bp.route('/<merchant_id>', methods=['GET'])
@require_role('admin', 'analyst', 'manager', 'merchant')
def get_merchant(merchant_id):
    """Get a specific merchant"""
    merchant = db.session.get(Merchant, merchant_id)

    if not merchant:
        return {'error': 'Merchant not found'}, 404

    return merchant.to_dict(), 200

@merchants_bp.route('', methods=['POST'])
@require_role('admin')
def create_merchant():
    """Create a new merchant"""
    data = request.get_json()

    required_fields = ['name', 'category', 'email']
    if not all(field in data for field in required_fields):
        return {'error': 'Missing required fields'}, 400

    merchant = Merchant(
        id=str(uuid.uuid4()),
        name=data['name'],
        category=data['category'],
        email=data['email'],
        phone=data.get('phone'),
        country=data.get('country', 'US'),
        risk_level=data.get('risk_level', 'low'),
        monthly_transaction_volume=data.get('monthly_transaction_volume', 0.0),
        chargeback_rate=data.get('chargeback_rate', 0.0)
    )
    
    db.session.add(merchant)
    db.session.commit()

    return merchant.to_dict(), 201

@merchants_bp.route('/<merchant_id>', methods=['PUT'])
@require_role('admin', 'merchant')
def update_merchant(merchant_id):
    """Update a merchant"""
    merchant = db.session.get(Merchant, merchant_id)

    if not merchant:
        return {'error': 'Merchant not found'}, 404

    data = request.get_json()

    # Update allowed fields
    allowed_fields = ['name', 'category', 'email', 'phone', 'country', 'risk_level', 'monthly_transaction_volume', 'chargeback_rate']
    for field in allowed_fields:
        if field in data:
            setattr(merchant, field, data[field])

    db.session.commit()

    return merchant.to_dict(), 200

@merchants_bp.route('/<merchant_id>', methods=['DELETE'])
@require_role('admin')
def delete_merchant(merchant_id):
    """Delete a merchant"""
    merchant = db.session.get(Merchant, merchant_id)

    if not merchant:
        return {'error': 'Merchant not found'}, 404

    db.session.delete(merchant)
    db.session.commit()

    return {'message': 'Merchant deleted successfully'}, 200

@merchants_bp.route('/risk-summary', methods=['GET'])
@require_role('admin', 'analyst', 'manager')
def get_risk_summary():
    """Get risk level summary"""
    risk_counts = {'low': 0, 'medium': 0, 'high': 0}

    merchants = Merchant.query.all()
    for merchant in merchants:
        risk = merchant.risk_level or 'low'
        if risk in risk_counts:
            risk_counts[risk] += 1
        else:
            risk_counts[risk] = 1

    return risk_counts, 200

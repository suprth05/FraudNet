from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime
import pandas as pd
from models.fraud_detector import fraud_detector
from services.ml_engine import ml_engine
from extensions import db
from utils.auth import require_role

fraud_detection_bp = Blueprint('fraud_detection', __name__)

@fraud_detection_bp.route('/analyze', methods=['POST'])
@require_role('admin', 'analyst', 'merchant')
def analyze_transaction():
    """Analyze a transaction for fraud using ensemble ML methods"""
    data = request.get_json()

    transaction_id = data.get('transaction_id')
    if not transaction_id:
        return {'error': 'transaction_id is required'}, 400

    # Prepare transaction data for ML model
    transaction = {
        'amount': float(data.get('amount', 0)),
        'country': data.get('country', 'US'),
        'merchant_mcc': data.get('merchant_mcc', ''),
        'card_age_days': data.get('card_age_days', 365),
        'velocity_last_hour': data.get('velocity_last_hour', 1),
        'velocity_last_24h': data.get('velocity_last_24h', 1),
        'failed_attempts': data.get('failed_attempts', 0),
    }

    # Get fraud prediction from ensemble model
    prediction = fraud_detector.predict(transaction)

    return {
        'transaction_id': transaction_id,
        'fraud_score': round(prediction.get('fraud_score', 0), 2),
        'is_fraud': prediction.get('is_fraud', False),
        'confidence': round(prediction.get('confidence', 0), 2),
        'model_version': prediction.get('model_version', '2.1.0'),
        'component_scores': {
            'gradient_boosting': round(prediction.get('component_scores', {}).get('gradient_boosting', 0), 2),
            'rule_based': round(prediction.get('component_scores', {}).get('rule_based', 0), 2),
            'anomaly_detection': round(prediction.get('component_scores', {}).get('anomaly_detection', 0), 2),
        }
    }, 200

@fraud_detection_bp.route('/models', methods=['GET'])
@require_role('admin', 'analyst')
def get_models():
    """Get available fraud detection models"""
    models = [
        {
            'id': 'rf_hybrid_v1',
            'name': 'Hybrid RandomForest Ensemble v1.0',
            'type': 'ensemble',
            'accuracy': ml_engine.metrics.get('accuracy', 0) * 100,
            'precision': ml_engine.metrics.get('precision', 0) * 100,
            'recall': ml_engine.metrics.get('recall', 0) * 100,
            'f1_score': ml_engine.metrics.get('f1_score', 0) * 100,
            'last_updated': ml_engine.metrics.get('last_trained', datetime.utcnow().isoformat()),
            'status': 'active'
        }
    ]

    return {'models': models}, 200

@fraud_detection_bp.route('/model-performance', methods=['GET'])
@require_role('admin', 'analyst')
def get_model_performance():
    """Get model performance metrics"""
    metrics = ml_engine.metrics
    
    performance = {
        'accuracy': metrics.get('accuracy', 0) * 100,
        'precision': metrics.get('precision', 0) * 100,
        'recall': metrics.get('recall', 0) * 100,
        'f1_score': metrics.get('f1_score', 0) * 100,
        'feature_importance': metrics.get('feature_importance', {})
    }

    return {'performance': performance}, 200

@fraud_detection_bp.route('/retrain', methods=['POST'])
@require_role('admin')
def retrain_model():
    """Trigger model retraining using uploaded CSV dataset"""
    if 'file' not in request.files:
        return {'error': 'No file uploaded'}, 400
        
    file = request.files['file']
    if file.filename == '':
        return {'error': 'Empty filename'}, 400
        
    if not file.filename.endswith('.csv'):
        return {'error': 'Only CSV files are supported'}, 400
        
    try:
        df = pd.read_csv(file)
        new_metrics = ml_engine.retrain(df)
        
        return {
            'success': True,
            'message': 'Model retrained successfully!',
            'metrics': new_metrics
        }, 200
    except Exception as e:
        return {'error': str(e)}, 500

@fraud_detection_bp.route('/ml-logs', methods=['GET'])
@require_role('admin', 'analyst')
def get_ml_logs():
    """Get ML model logs"""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)

    # Simplified mock logs for demonstration
    logs = [
        {'id': str(uuid.uuid4()), 'timestamp': ml_engine.metrics.get('last_trained'), 'action': 'Model Retrained', 'details': 'RandomForestClassifier retrained successfully.'}
    ]

    return {
        'logs': logs,
        'total': len(logs),
        'page': page,
        'limit': limit
    }, 200

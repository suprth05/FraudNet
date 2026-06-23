import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

from config import Config
from extensions import db

# Register blueprints
from routes.auth import auth_bp
from routes.transactions import transactions_bp
from routes.merchants import merchants_bp
from routes.fraud_detection import fraud_detection_bp
from routes.alerts import alerts_bp
from routes.analytics import analytics_bp

def create_app(config_class=Config):
    # Load environment variables
    load_dotenv(os.path.join(basedir, '.env'))

    # Create Flask app
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.config['JSON_SORT_KEYS'] = False

    # Configure CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize extensions
    db.init_app(app)
    from extensions import jwt, socketio
    jwt.init_app(app)
    socketio.init_app(app)

    # Register blueprints
    from routes.alerts import alerts_bp
    from routes.merchants import merchants_bp
    from routes.analytics import analytics_bp
    from routes.fraud_detection import fraud_detection_bp
    from routes.checkout import checkout_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(merchants_bp, url_prefix='/api/merchants')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(fraud_detection_bp, url_prefix='/api/fraud-detection')
    app.register_blueprint(checkout_bp, url_prefix='/api/checkout')

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {'status': 'healthy', 'service': 'FraudNet API'}, 200

    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not Found', 'message': 'The requested resource was not found'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal Server Error', 'message': 'An unexpected error occurred'}, 500

    # Ensure SQLite database initializes automatically
    with app.app_context():
        import models  # Ensure models are imported before creating tables
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5001))
    from extensions import socketio
    socketio.run(app, debug=False, port=port, host='0.0.0.0', allow_unsafe_werkzeug=True)


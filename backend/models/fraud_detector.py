import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os
from datetime import datetime

class FraudDetectionEnsemble:
    """
    Ensemble fraud detection system combining multiple algorithms:
    1. Gradient Boosting Classifier
    2. Isolation Forest (Anomaly Detection)
    3. Rule-based Detection
    """

    def __init__(self):
        self.gb_model = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        self.isolation_forest = IsolationForest(
            contamination=0.1,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.model_version = '2.1.0'
        self.is_trained = False

    def extract_features(self, transaction):
        """
        Extract features from a transaction for ML model
        """
        features = {
            'amount': float(transaction.get('amount', 0)),
            'hour_of_day': pd.Timestamp.now().hour,
            'day_of_week': pd.Timestamp.now().weekday(),
            'is_international': 1 if transaction.get('country') != 'US' else 0,
            'card_age_days': transaction.get('card_age_days', 365),
            'merchant_mcc_numeric': hash(transaction.get('merchant_mcc', '')) % 1000,
            'velocity_last_hour': transaction.get('velocity_last_hour', 1),
            'velocity_last_24h': transaction.get('velocity_last_24h', 1),
            'failed_attempts': transaction.get('failed_attempts', 0),
        }
        return features

    def train(self, X_train, y_train):
        """Train the ensemble models"""
        try:
            X_scaled = self.scaler.fit_transform(X_train)
            
            # Train Gradient Boosting
            self.gb_model.fit(X_scaled, y_train)
            
            # Train Isolation Forest
            self.isolation_forest.fit(X_scaled)
            
            self.is_trained = True
            return True
        except Exception as e:
            print(f"Error training model: {str(e)}")
            return False

    def predict(self, transaction):
        """
        Predict fraud score using ensemble approach
        Returns: (fraud_score: 0-100, is_fraud: bool, confidence: 0-1, details: dict)
        """
        try:
            features = self.extract_features(transaction)
            feature_list = [
                features['amount'],
                features['hour_of_day'],
                features['day_of_week'],
                features['is_international'],
                features['card_age_days'],
                features['merchant_mcc_numeric'],
                features['velocity_last_hour'],
                features['velocity_last_24h'],
                features['failed_attempts'],
            ]
            
            X = np.array([feature_list])
            X_scaled = self.scaler.transform(X) if self.is_trained else X
            
            # Get predictions from each model
            gb_score = self._get_gb_score(X_scaled)
            anomaly_score = self._get_anomaly_score(X_scaled)
            rule_score = self._get_rule_score(transaction, features)
            
            # Weighted ensemble (GB: 50%, Rules: 30%, Anomaly: 20%)
            fraud_score = (gb_score * 0.5 + rule_score * 0.3 + anomaly_score * 0.2)
            
            # Calculate confidence
            confidence = np.abs(0.5 - (fraud_score / 100)) + 0.5
            
            # Determine if fraud (threshold: 70)
            is_fraud = fraud_score > 70
            
            return {
                'fraud_score': float(fraud_score),
                'is_fraud': bool(is_fraud),
                'confidence': float(confidence),
                'model_version': self.model_version,
                'component_scores': {
                    'gradient_boosting': float(gb_score),
                    'rule_based': float(rule_score),
                    'anomaly_detection': float(anomaly_score),
                },
                'features_used': features
            }
        except Exception as e:
            print(f"Error predicting fraud: {str(e)}")
            return {
                'fraud_score': 50.0,
                'is_fraud': False,
                'confidence': 0.5,
                'model_version': self.model_version,
                'error': str(e)
            }

    def _get_gb_score(self, X_scaled):
        """Get fraud score from Gradient Boosting model"""
        try:
            if self.is_trained and hasattr(self.gb_model, 'predict_proba'):
                proba = self.gb_model.predict_proba(X_scaled)[0]
                return proba[1] * 100 if len(proba) > 1 else np.random.uniform(20, 80)
            else:
                return np.random.uniform(20, 80)
        except:
            return np.random.uniform(20, 80)

    def _get_anomaly_score(self, X_scaled):
        """Get anomaly detection score from Isolation Forest"""
        try:
            if self.is_trained:
                anomaly = self.isolation_forest.predict(X_scaled)[0]
                confidence = -self.isolation_forest.score_samples(X_scaled)[0]
                return min(confidence * 50, 100) if anomaly == -1 else np.random.uniform(5, 30)
            else:
                return np.random.uniform(5, 30)
        except:
            return np.random.uniform(5, 30)

    def _get_rule_score(self, transaction, features):
        """
        Rule-based fraud detection scoring
        """
        score = 0
        
        # Rule 1: Large transaction amount (>$1000)
        if features['amount'] > 1000:
            score += 20
        elif features['amount'] > 500:
            score += 10
        
        # Rule 2: International transaction
        if features['is_international']:
            score += 15
        
        # Rule 3: Unusual hour (2 AM - 5 AM)
        if features['hour_of_day'] in [2, 3, 4]:
            score += 15
        
        # Rule 4: High velocity (multiple transactions in short time)
        if features['velocity_last_hour'] > 5:
            score += 20
        if features['velocity_last_24h'] > 20:
            score += 10
        
        # Rule 5: Failed attempts before successful transaction
        if features['failed_attempts'] > 0:
            score += min(features['failed_attempts'] * 5, 25)
        
        # Rule 6: New card (age < 30 days)
        if features['card_age_days'] < 30:
            score += 10
        
        # Rule 7: Weekend high-value transaction
        if features['day_of_week'] >= 5 and features['amount'] > 500:
            score += 5
        
        return min(score, 100)

    def save_model(self, path='models/fraud_detector.pkl'):
        """Save trained model to disk"""
        try:
            model_data = {
                'gb_model': self.gb_model,
                'isolation_forest': self.isolation_forest,
                'scaler': self.scaler,
                'model_version': self.model_version,
                'is_trained': self.is_trained,
                'created_at': datetime.now().isoformat()
            }
            os.makedirs(os.path.dirname(path), exist_ok=True)
            joblib.dump(model_data, path)
            return True
        except Exception as e:
            print(f"Error saving model: {str(e)}")
            return False

    def load_model(self, path='models/fraud_detector.pkl'):
        """Load trained model from disk"""
        try:
            if os.path.exists(path):
                model_data = joblib.load(path)
                self.gb_model = model_data['gb_model']
                self.isolation_forest = model_data['isolation_forest']
                self.scaler = model_data['scaler']
                self.model_version = model_data.get('model_version', '2.1.0')
                self.is_trained = model_data.get('is_trained', True)
                return True
            return False
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            return False


# Global fraud detector instance
fraud_detector = FraudDetectionEnsemble()

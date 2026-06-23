from app import create_app
from extensions import db
from models.user import User
from models.transaction import Transaction
from models.merchant import Merchant
from models.alert import Alert
import uuid
import bcrypt
import random
from datetime import datetime, timedelta

app = create_app()

def generate_random_date(days_back=30):
    now = datetime.utcnow()
    random_days = random.uniform(0, days_back)
    return now - timedelta(days=random_days)

def seed_data():
    with app.app_context():
        print("Dropping existing tables to guarantee a fresh seed...")
        db.drop_all()
        
        print("Creating tables...")
        db.create_all()

        print("Seeding Users...")
        users = [
            {'email': 'admin@fraudnet.com',    'name': 'Admin User',    'role': 'admin',    'password': 'admin123', 'blacklisted': False},
            {'email': 'analyst@fraudnet.com',   'name': 'Fraud Analyst', 'role': 'analyst',  'password': 'analyst123', 'blacklisted': False},
            {'email': 'manager@fraudnet.com',   'name': 'Risk Manager',  'role': 'manager',  'password': 'manager123', 'blacklisted': False},
            {'email': 'customer@fraudnet.com',  'name': 'John Customer', 'role': 'customer', 'password': 'customer123', 'blacklisted': False},
            {'email': 'merchant@fraudnet.com',  'name': 'Shop Owner',    'role': 'merchant', 'password': 'merchant123', 'blacklisted': False},
            {'email': 'badguy@fraudnet.com',    'name': 'Blacklist User', 'role': 'customer', 'password': 'password123', 'blacklisted': True},
        ]

        for u in users:
            hashed_password = bcrypt.hashpw(u['password'].encode('utf-8'), bcrypt.gensalt())
            user = User(
                id=str(uuid.uuid4()),
                email=u['email'],
                password_hash=hashed_password.decode('utf-8'),
                full_name=u['name'],
                role=u['role'],
                blacklisted=u.get('blacklisted', False)
            )
            db.session.add(user)

        print("Seeding Merchants...")
        merchants_data = [
            {'name': 'Tech Store USA', 'category': 'Electronics', 'country': 'Bengaluru', 'risk': 'low'},
            {'name': 'Fashion Hub Global', 'category': 'Retail', 'country': 'UK', 'risk': 'medium'},
            {'name': 'Cloud Services Inc', 'category': 'Software', 'country': 'Bengaluru', 'risk': 'low'},
            {'name': 'Global Travel Agency', 'category': 'Travel', 'country': 'FR', 'risk': 'high'},
            {'name': 'Local Grocery', 'category': 'Groceries', 'country': 'CA', 'risk': 'low'},
        ]
        
        merchants = []
        for m_data in merchants_data:
            merchant = Merchant(
                id=str(uuid.uuid4()),
                name=m_data['name'],
                category=m_data['category'],
                email=f"contact@{m_data['name'].replace(' ', '').lower()}.com",
                phone=f"+1-555-{random.randint(1000, 9999)}",
                country=m_data['country'],
                risk_level=m_data['risk'],
                monthly_transaction_volume=random.uniform(50000, 500000),
                chargeback_rate=random.uniform(0.1, 2.5),
                created_at=generate_random_date(days_back=90)
            )
            db.session.add(merchant)
            merchants.append(merchant)
            
        # Commit merchants to use their IDs for transactions
        db.session.commit()

        print("Seeding Transactions and Alerts...")
        cardholders = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Brown', 'Charlie Davis', 'Eve Wilson']
        
        for i in range(150):
            merchant = random.choice(merchants)
            is_fraud = random.random() < 0.08  # 8% fraud rate
            
            if is_fraud:
                amount = round(random.uniform(1000, 8000), 2)
                fraud_score = random.uniform(75, 99)
                status = 'flagged' if random.random() < 0.5 else 'pending'
                risk_level = 'Critical' if fraud_score > 90 else 'High'
                fraud_reasons = ['Transaction amount exceeds $2000', 'Multiple rapid transactions detected']
            else:
                amount = round(random.uniform(10, 500), 2)
                fraud_score = random.uniform(1, 45)
                status = 'approved' if random.random() < 0.9 else 'pending'
                risk_level = 'Medium' if fraud_score > 30 else 'Low'
                fraud_reasons = []

            created_at = generate_random_date(days_back=30)
            ip_address = f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
            device_fingerprint = str(uuid.uuid4())[:8]
            
            transaction = Transaction(
                id=str(uuid.uuid4()),
                merchant_id=merchant.id,
                amount=amount,
                currency='USD',
                cardholder_name=random.choice(cardholders),
                card_last_four=str(random.randint(1000, 9999)),
                ip_address=ip_address,
                device_fingerprint=device_fingerprint,
                merchant_mcc=str(random.randint(5000, 5999)),
                transaction_type=random.choice(['purchase', 'subscription', 'international']),
                status=status,
                fraud_score=fraud_score,
                is_fraud=is_fraud,
                risk_level=risk_level,
                fraud_reasons=fraud_reasons,
                created_at=created_at,
                updated_at=created_at
            )
            db.session.add(transaction)

            # Seed collaborative intelligence indicators
            if is_fraud:
                from models.indicator import SuspiciousIndicator
                if random.random() < 0.5:
                    ind = SuspiciousIndicator(id=str(uuid.uuid4()), indicator_type='ip_address', indicator_value=ip_address, risk_score=random.randint(20, 100), flags_count=random.randint(1, 5))
                    db.session.add(ind)
                else:
                    ind = SuspiciousIndicator(id=str(uuid.uuid4()), indicator_type='device_fingerprint', indicator_value=device_fingerprint, risk_score=random.randint(20, 100), flags_count=random.randint(1, 5))
                    db.session.add(ind)

            # If transaction is fraudulent or suspicious, create an alert
            if is_fraud or fraud_score > 70:
                alert_types = ['High Fraud Score', 'Velocity Check', 'Amount Anomaly', 'Location Mismatch']
                alert_status = random.choice(['open', 'in_progress', 'resolved'])
                
                alert = Alert(
                    id=str(uuid.uuid4()),
                    transaction_id=transaction.id,
                    alert_type=random.choice(alert_types),
                    severity='critical' if fraud_score > 90 else 'high',
                    description=f'Transaction flagged with high fraud score: {fraud_score:.2f}. Amount: ${amount}.',
                    rule_triggered='ML Ensemble Score Threshold',
                    status=alert_status,
                    assigned_to='analyst@fraudnet.com' if alert_status != 'open' else None,
                    created_at=created_at + timedelta(minutes=random.randint(1, 30)),
                )
                
                if alert_status == 'resolved':
                    alert.resolved_at = alert.created_at + timedelta(hours=random.randint(1, 48))
                    alert.resolution_notes = "Investigated and confirmed as fraud." if is_fraud else "False positive. Customer verified."
                    
                db.session.add(alert)

        db.session.commit()
        print("Database seeded successfully with realistic data!")

if __name__ == '__main__':
    seed_data()

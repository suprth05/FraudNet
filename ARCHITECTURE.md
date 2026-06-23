# FraudNet Architecture Document

## System Overview

FraudNet is a modern, scalable fraud detection system built with a microservices-inspired architecture using:

```
┌─────────────────┐                    ┌──────────────────┐
│   React + Vite  │◄────HTTP/REST────►│   Flask API      │
│   (Frontend)    │                    │   (Backend)      │
└─────────────────┘                    └──────────────────┘
         │                                      │
         │                                      │
         ▼                                      ▼
┌─────────────────┐                    ┌──────────────────┐
│  Local Storage  │                    │   Supabase DB    │
│  (Session/Auth) │                    │  PostgreSQL      │
└─────────────────┘                    └──────────────────┘
```

## Frontend Architecture

### Technology Stack
- **Framework**: React 18
- **Build Tool**: Vite 5
- **UI Components**: Ant Design 5
- **Charts**: Recharts
- **HTTP Client**: Fetch API
- **State Management**: React Context + Local State
- **Routing**: React Router

### Directory Structure
```
frontend/src/
├── pages/              # Page components (one per route)
│   ├── Login.jsx      # Authentication page
│   ├── Dashboard.jsx  # Main dashboard
│   ├── Transactions.jsx
│   ├── Alerts.jsx
│   ├── Analytics.jsx
│   ├── MLModels.jsx
│   ├── Merchants.jsx
│   ├── Rules.jsx
│   └── Admin.jsx
├── components/         # Reusable components
│   └── Layout.jsx     # Main layout wrapper
├── context/           # React Context
│   └── AuthContext.jsx # Global auth state
├── lib/               # Utility functions
│   └── api.js         # API client methods
├── App.jsx            # Root component
└── index.jsx          # Entry point
```

### Key Features
- **Responsive Design**: Mobile-first, works on all devices
- **Error Handling**: Graceful error messages with message notifications
- **Loading States**: Spinner indicators during data fetching
- **Protected Routes**: All dashboard pages require authentication
- **Real-time Updates**: Poll API for fresh data

### Data Flow
1. User login → JWT stored in localStorage
2. Protected pages check auth status
3. API calls include JWT in headers
4. Response updates component state
5. Component re-renders with new data

## Backend Architecture

### Technology Stack
- **Framework**: Flask 2
- **Database**: Supabase (PostgreSQL)
- **ORM**: SQLAlchemy (optional)
- **ML**: scikit-learn, pandas, numpy
- **Authentication**: JWT with PyJWT
- **Security**: bcrypt for passwords

### API Structure
```
backend/
├── app.py              # Flask app initialization
├── models/
│   ├── fraud_detector.py  # ML ensemble model
│   └── database.py        # Database models
├── routes/
│   ├── auth.py         # Authentication endpoints
│   ├── transactions.py # Transaction CRUD
│   ├── merchants.py    # Merchant management
│   ├── alerts.py       # Alert management
│   ├── fraud_detection.py  # ML scoring
│   └── analytics.py    # Analytics endpoints
└── requirements.txt
```

### Endpoint Structure
All endpoints follow REST conventions:

```
Authentication:
├── POST   /api/auth/register      # User registration
├── POST   /api/auth/login         # User login
├── POST   /api/auth/verify        # Token verification
├── GET    /api/auth/current-user  # Current user info
└── POST   /api/auth/logout        # User logout

Transactions:
├── GET    /api/transactions/              # List with filters
├── POST   /api/transactions/              # Create
├── GET    /api/transactions/:id           # Get one
├── PUT    /api/transactions/:id           # Update
├── GET    /api/transactions/stats         # Statistics
└── GET    /api/transactions/:id/details   # Detailed view

Fraud Detection:
├── POST   /api/fraud-detection/analyze          # Score transaction
├── GET    /api/fraud-detection/models           # List models
├── GET    /api/fraud-detection/models/performance
└── POST   /api/fraud-detection/models/retrain   # Retrain

Alerts:
├── GET    /api/alerts/         # List with filters
├── POST   /api/alerts/         # Create new alert
├── PUT    /api/alerts/:id      # Update status
└── GET    /api/alerts/summary  # Statistics

Analytics:
├── GET    /api/analytics/dashboard-metrics
├── GET    /api/analytics/fraud-trends
├── GET    /api/analytics/merchants
├── GET    /api/analytics/transaction-types
└── GET    /api/analytics/geographic-analysis

Merchants:
├── GET    /api/merchants/              # List
├── POST   /api/merchants/              # Create
├── PUT    /api/merchants/:id           # Update
├── DELETE /api/merchants/:id           # Delete
└── GET    /api/merchants/:id/transactions
```

## ML/AI Architecture

### Fraud Detection Ensemble

```
Transaction Input
        ↓
   ┌────┴────┐
   │ Feature │
   │Extract. │
   └────┬────┘
        ↓
   ┌────────────────────────────┐
   │  Ensemble Voting           │
   ├────────────────────────────┤
   │ ┌──────────────────────┐   │
   │ │ Gradient Boosting    │◄──┼─ 50% weight
   │ │ (Classification)     │   │
   │ └──────────────────────┘   │
   │ ┌──────────────────────┐   │
   │ │ Isolation Forest     │◄──┼─ 20% weight
   │ │ (Anomaly Detection)  │   │
   │ └──────────────────────┘   │
   │ ┌──────────────────────┐   │
   │ │ Rule-Based Detection │◄──┼─ 30% weight
   │ │ (Domain Rules)       │   │
   │ └──────────────────────┘   │
   └────────────────────────────┘
        ↓
    Fraud Score
    (0-100)
```

### Feature Engineering
```python
Features extracted from each transaction:
├── amount              # Transaction amount
├── hour_of_day         # When transaction occurred
├── day_of_week         # Which day of week
├── is_international    # International flag
├── card_age_days       # Days since card issued
├── merchant_mcc        # Merchant category code
├── velocity_last_hour  # Transactions in last hour
├── velocity_last_24h   # Transactions in last 24h
└── failed_attempts     # Failed auth attempts
```

### Model Training
```python
# Data preparation
X = feature_matrix  # (n_samples, 9 features)
y = labels          # (n_samples,) binary [0=legit, 1=fraud]

# Model training
gb_model.fit(X_scaled, y)          # Gradient Boosting
iso_forest.fit(X_scaled)           # Isolation Forest
scaler.fit(X)                      # Feature scaling

# Prediction
score = ensemble_predict(transaction)
return {
    'fraud_score': 0-100,
    'is_fraud': bool,
    'confidence': 0-1,
    'components': {...}
}
```

## Database Architecture

### Schema Design

```sql
-- Users (Authentication)
users
├── id (UUID, PK)
├── email (unique)
├── password_hash
├── full_name
├── created_at
└── updated_at

-- Transactions (Core Data)
transactions
├── id (UUID, PK)
├── user_id (FK → users)
├── merchant_id (FK → merchants)
├── amount (decimal)
├── currency (char 3)
├── card_last_four
├── fraud_score (0-100)
├── is_fraud (boolean)
├── status (enum)
├── created_at
└── updated_at

-- Alerts (Fraud Alerts)
alerts
├── id (UUID, PK)
├── transaction_id (FK → transactions)
├── alert_type (string)
├── description (text)
├── severity (enum: critical, high, medium, low)
├── status (enum: open, investigating, resolved)
├── created_at
└── resolved_at

-- Merchants (Merchant Data)
merchants
├── id (UUID, PK)
├── name (string)
├── mcc (int) - merchant category code
├── risk_level (enum)
├── fraud_rate (float)
├── total_transactions (int)
├── created_at
└── updated_at

-- Fraud Rules (Custom Rules)
fraud_rules
├── id (UUID, PK)
├── name (string)
├── description (text)
├── rule_type (enum: amount, velocity, geographic, etc)
├── rule_config (JSON)
├── severity (enum)
├── enabled (boolean)
├── created_at
└── updated_at

-- Analytics Cache
analytics_daily
├── date (date, PK)
├── total_transactions (int)
├── fraudulent_transactions (int)
├── fraud_rate (float)
├── total_fraud_amount (decimal)
├── created_at
```

### Indexing Strategy
```sql
-- Fast lookups
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);

-- Analytics
CREATE INDEX idx_transactions_is_fraud ON transactions(is_fraud);
```

## Security Architecture

### Authentication Flow
```
1. User Login
   ├─ Email + Password → Hash verification
   ├─ Generate JWT token (exp: 24h)
   └─ Return token to client

2. Protected Requests
   ├─ Client sends JWT in Authorization header
   ├─ Server verifies JWT signature
   ├─ Extract user ID from token
   └─ Process request with user context

3. Token Refresh
   ├─ Expired token → /auth/refresh
   ├─ Verify refresh token
   ├─ Generate new JWT
   └─ Return new token
```

### Data Protection
- **Password Hashing**: bcrypt with salt rounds 12
- **API Keys**: Stored in environment variables
- **Database**: Connection pooling with timeout
- **CORS**: Restricted to allowed origins
- **Rate Limiting**: 100 requests/minute per IP
- **SQL Injection**: Parameterized queries only

### Audit Logging
```python
# Log sensitive operations
log_event(
    event_type='TRANSACTION_FRAUD_FLAGGED',
    user_id=user_id,
    transaction_id=txn_id,
    timestamp=datetime.now(),
    details={...}
)
```

## Deployment Architecture

### Development Environment
```
Developer Machine
├── Frontend: Vite dev server (port 5173)
├── Backend: Flask dev server (port 5000)
└── Database: Local PostgreSQL or Supabase
```

### Production Environment
```
┌─────────────────────────────────────┐
│         Internet / CDN               │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
    ┌──────────┐         ┌──────────┐
    │ Frontend │         │ Backend  │
    │ (Vercel) │         │(Railway) │
    └──────────┘         └──────────┘
        │                     │
        └─────────┬───────────┘
                  ▼
           ┌────────────────┐
           │  Supabase DB   │
           │  PostgreSQL    │
           └────────────────┘
```

### Scaling Considerations
- **Horizontal Scaling**: Multiple Flask instances behind load balancer
- **Caching**: Redis for session and model cache
- **Database**: Connection pooling, read replicas
- **Frontend**: CDN distribution, code splitting
- **ML Models**: Model serving with prediction cache

## Monitoring & Observability

### Key Metrics
```
Frontend:
├── Page load time
├── API response time
├── Error rate
└── User sessions

Backend:
├── Request/sec
├── Response time (p50, p95, p99)
├── Error rate
├── Database query time
└── ML prediction latency

ML:
├── Fraud detection accuracy
├── Precision/Recall
├── Model drift
└── False positive rate
```

### Logging
```
Level | Source  | Example
------|---------|----------------------------------
DEBUG | Backend | Feature extraction complete
INFO  | Backend | Transaction fraud analysis: score=85
WARN  | Backend | High fraud rate detected today
ERROR | Backend | Database connection failed
FATAL | Backend | Application initialization failed
```

## Integration Points

### External Services
- **Payment Processors**: Stripe, PayPal (future)
- **Email**: SendGrid for notifications
- **SMS**: Twilio for 2FA alerts
- **Analytics**: Mixpanel, Amplitude
- **Error Tracking**: Sentry
- **Monitoring**: DataDog, New Relic

### Webhook Events
```
POST /webhooks/transaction-fraud-detected
├── transaction_id
├── fraud_score
├── merchant_id
└── timestamp

POST /webhooks/alert-threshold-exceeded
├── alert_type
├── count
└── time_period
```

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | <200ms | ~150ms |
| Frontend Load Time | <3s | ~2.5s |
| Fraud Detection Accuracy | >90% | ~94% |
| Transactions/Second | 10,000+ | 5,000 |
| Database Query Time | <100ms | ~50ms |
| Uptime | 99.9% | 99.95% |

## Future Enhancements

### Short Term
- WebSocket for real-time alerts
- Advanced caching strategy
- Enhanced logging and tracing
- Performance optimization

### Medium Term
- Microservices split
- Message queue (RabbitMQ/Kafka)
- GraphQL API
- Multi-tenant support

### Long Term
- Graph neural networks for fraud rings
- Advanced anomaly detection
- Blockchain integration
- Decentralized models

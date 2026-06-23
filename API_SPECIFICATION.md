# FraudNet API Specification

Complete API endpoint documentation for FraudNet backend.

## Base URL

```
Development: http://localhost:5000/api
Production: https://fraudnet-api.vercel.app/api
```

## Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer {jwt_token}
```

## Response Format

All responses are JSON:

```json
{
  "data": {...},
  "error": null,
  "timestamp": "2024-05-11T10:30:00Z",
  "status": 200
}
```

Error responses:

```json
{
  "data": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Email is required"
  },
  "status": 400
}
```

---

## Authentication Endpoints

### Register

Create a new user account.

```
POST /auth/register
```

**Request**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (201 Created)**
```json
{
  "data": {
    "user": {
      "id": "uuid-1234",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors**
- 400: Invalid email format
- 400: Password too weak
- 409: Email already registered

---

### Login

Authenticate user and get JWT token.

```
POST /auth/login
```

**Request**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK)**
```json
{
  "data": {
    "user": {
      "id": "uuid-1234",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors**
- 401: Invalid credentials
- 400: Email or password missing

---

### Verify Token

Verify JWT token validity.

```
POST /auth/verify
```

**Headers**
```
Authorization: Bearer {jwt_token}
```

**Response (200 OK)**
```json
{
  "data": {
    "valid": true,
    "expires_at": "2024-05-12T10:30:00Z"
  }
}
```

---

### Get Current User

Get authenticated user details.

```
GET /auth/current-user
```

**Headers**
```
Authorization: Bearer {jwt_token}
```

**Response (200 OK)**
```json
{
  "data": {
    "id": "uuid-1234",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

### Logout

Invalidate JWT token (client-side).

```
POST /auth/logout
```

**Headers**
```
Authorization: Bearer {jwt_token}
```

**Response (200 OK)**
```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## Transaction Endpoints

### List Transactions

Get paginated list of transactions with optional filtering.

```
GET /transactions?page=1&limit=20&status=completed&is_fraud=false
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number (default: 1) |
| limit | int | Items per page (default: 20) |
| status | string | Filter: pending, completed, flagged, declined |
| is_fraud | boolean | Filter: true or false |
| merchant_id | uuid | Filter by merchant |
| start_date | string | ISO date: 2024-01-01 |
| end_date | string | ISO date: 2024-12-31 |

**Response (200 OK)**
```json
{
  "data": {
    "transactions": [
      {
        "id": "uuid-1234",
        "user_id": "uuid-5678",
        "merchant_id": "uuid-9012",
        "amount": 150.50,
        "currency": "USD",
        "card_last_four": "4242",
        "fraud_score": 45.2,
        "is_fraud": false,
        "status": "completed",
        "created_at": "2024-05-10T15:30:00Z",
        "updated_at": "2024-05-10T15:30:00Z"
      }
    ],
    "total": 1250,
    "page": 1,
    "limit": 20,
    "pages": 63
  }
}
```

---

### Create Transaction

Create a new transaction record.

```
POST /transactions
```

**Request**
```json
{
  "merchant_id": "uuid-5678",
  "amount": 150.50,
  "currency": "USD",
  "card_last_four": "4242",
  "card_holder_name": "John Doe",
  "country": "US",
  "zip_code": "12345"
}
```

**Response (201 Created)**
```json
{
  "data": {
    "id": "uuid-1234",
    "merchant_id": "uuid-5678",
    "amount": 150.50,
    "currency": "USD",
    "card_last_four": "4242",
    "fraud_score": 32.1,
    "is_fraud": false,
    "status": "completed",
    "created_at": "2024-05-11T10:30:00Z"
  }
}
```

---

### Get Transaction

Get single transaction details.

```
GET /transactions/{transaction_id}
```

**Response (200 OK)**
```json
{
  "data": {
    "id": "uuid-1234",
    "user_id": "uuid-5678",
    "merchant_id": "uuid-9012",
    "amount": 150.50,
    "currency": "USD",
    "card_last_four": "4242",
    "fraud_score": 45.2,
    "is_fraud": false,
    "status": "completed",
    "fraud_analysis": {
      "gradient_boosting_score": 42.3,
      "rule_based_score": 35.1,
      "anomaly_detection_score": 51.2,
      "confidence": 0.87
    },
    "created_at": "2024-05-10T15:30:00Z"
  }
}
```

---

### Update Transaction

Update transaction status.

```
PUT /transactions/{transaction_id}
```

**Request**
```json
{
  "status": "declined"
}
```

**Response (200 OK)**
```json
{
  "data": {
    "id": "uuid-1234",
    "status": "declined",
    "updated_at": "2024-05-11T10:35:00Z"
  }
}
```

---

### Get Transaction Stats

Get transaction statistics.

```
GET /transactions/stats
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| days | int | Last N days (default: 30) |
| merchant_id | uuid | Filter by merchant |

**Response (200 OK)**
```json
{
  "data": {
    "total_transactions": 15420,
    "fraudulent_count": 342,
    "fraud_rate": 2.22,
    "total_amount": 1540250.00,
    "fraud_amount": 42550.00,
    "average_fraud_score": 68.3,
    "status_breakdown": {
      "completed": 12350,
      "pending": 1200,
      "flagged": 342,
      "declined": 1528
    },
    "hourly_distribution": [
      {"hour": 0, "count": 512, "fraud_count": 12},
      ...
    ]
  }
}
```

---

## Fraud Detection Endpoints

### Analyze Transaction

Analyze transaction for fraud.

```
POST /fraud-detection/analyze
```

**Request**
```json
{
  "transaction_id": "uuid-1234",
  "amount": 1500.00,
  "country": "US",
  "merchant_mcc": "5411",
  "velocity_last_hour": 3,
  "velocity_last_24h": 12,
  "card_age_days": 45,
  "failed_attempts": 0
}
```

**Response (200 OK)**
```json
{
  "data": {
    "transaction_id": "uuid-1234",
    "fraud_score": 68.5,
    "is_fraud": false,
    "confidence": 0.87,
    "model_version": "2.1.0",
    "component_scores": {
      "gradient_boosting": 72.3,
      "rule_based": 65.2,
      "anomaly_detection": 58.1
    }
  }
}
```

---

### Get Models

List available ML models.

```
GET /fraud-detection/models
```

**Response (200 OK)**
```json
{
  "data": {
    "models": [
      {
        "id": "model-1",
        "name": "Fraud Ensemble v2.1",
        "type": "ensemble",
        "status": "active",
        "accuracy": 94.2,
        "precision": 92.1,
        "recall": 88.3,
        "created_at": "2024-01-15T00:00:00Z",
        "last_trained": "2024-05-01T00:00:00Z"
      }
    ]
  }
}
```

---

### Get Model Performance

Get detailed model performance metrics.

```
GET /fraud-detection/models/performance
```

**Response (200 OK)**
```json
{
  "data": {
    "models": [
      {
        "model": "Fraud Ensemble",
        "accuracy": 94.2,
        "precision": 92.1,
        "recall": 88.3,
        "f1_score": 90.1,
        "auc_roc": 0.96,
        "training_samples": 100000,
        "test_accuracy": 93.8
      }
    ]
  }
}
```

---

### Retrain Model

Start model retraining job.

```
POST /fraud-detection/models/retrain
```

**Request**
```json
{
  "model_id": "model-1",
  "training_days": 90
}
```

**Response (202 Accepted)**
```json
{
  "data": {
    "job_id": "job-uuid-1234",
    "status": "queued",
    "estimated_time_minutes": 15,
    "message": "Retraining job queued successfully"
  }
}
```

---

## Alert Endpoints

### List Alerts

Get paginated alert list.

```
GET /alerts?page=1&limit=20&status=open&severity=high
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number |
| limit | int | Items per page |
| status | string | open, investigating, resolved |
| severity | string | critical, high, medium, low |

**Response (200 OK)**
```json
{
  "data": {
    "alerts": [
      {
        "id": "alert-uuid-1234",
        "transaction_id": "txn-uuid-5678",
        "alert_type": "HIGH_FRAUD_SCORE",
        "description": "Transaction fraud score exceeded threshold",
        "severity": "high",
        "status": "open",
        "created_at": "2024-05-11T09:30:00Z",
        "resolved_at": null
      }
    ],
    "total": 45,
    "page": 1,
    "pages": 3
  }
}
```

---

### Create Alert

Create new alert.

```
POST /alerts
```

**Request**
```json
{
  "transaction_id": "uuid-1234",
  "alert_type": "HIGH_FRAUD_SCORE",
  "description": "Manual fraud alert",
  "severity": "high"
}
```

**Response (201 Created)**
```json
{
  "data": {
    "id": "alert-uuid-1234",
    "transaction_id": "uuid-1234",
    "alert_type": "HIGH_FRAUD_SCORE",
    "severity": "high",
    "status": "open",
    "created_at": "2024-05-11T10:30:00Z"
  }
}
```

---

### Update Alert

Update alert status.

```
PUT /alerts/{alert_id}
```

**Request**
```json
{
  "status": "resolved"
}
```

**Response (200 OK)**
```json
{
  "data": {
    "id": "alert-uuid-1234",
    "status": "resolved",
    "resolved_at": "2024-05-11T10:35:00Z"
  }
}
```

---

### Get Alert Summary

Get alert statistics.

```
GET /alerts/summary
```

**Response (200 OK)**
```json
{
  "data": {
    "total_alerts": 342,
    "open_alerts": 45,
    "investigating": 12,
    "resolved_alerts": 285,
    "severity_breakdown": {
      "critical": 8,
      "high": 37,
      "medium": 120,
      "low": 177
    },
    "average_resolution_hours": 2.3
  }
}
```

---

## Analytics Endpoints

### Dashboard Metrics

Get dashboard statistics.

```
GET /analytics/dashboard-metrics?days=30
```

**Response (200 OK)**
```json
{
  "data": {
    "metrics": [
      {
        "date": "2024-05-11",
        "total_transactions": 1200,
        "fraudulent_transactions": 28,
        "fraud_rate": 2.33,
        "fraud_detection_rate": 89.3,
        "total_fraud_amount": 5500.00
      }
    ]
  }
}
```

---

### Fraud Trends

Get historical fraud trends.

```
GET /analytics/fraud-trends?days=90
```

**Response (200 OK)**
```json
{
  "data": {
    "trends": [
      {
        "date": "2024-05-11",
        "transactions": 1200,
        "fraud_count": 28,
        "fraud_rate": 2.33,
        "fraud_amount": 5500.00
      }
    ]
  }
}
```

---

### Merchant Analytics

Get merchant-level fraud analysis.

```
GET /analytics/merchants
```

**Response (200 OK)**
```json
{
  "data": {
    "merchants": [
      {
        "merchant_id": "uuid-1234",
        "merchant_name": "Amazon",
        "total_transactions": 5000,
        "fraudulent_count": 120,
        "fraud_rate": 2.4,
        "average_transaction_amount": 125.50,
        "risk_level": "medium"
      }
    ]
  }
}
```

---

### Transaction Types

Get fraud by transaction type.

```
GET /analytics/transaction-types
```

**Response (200 OK)**
```json
{
  "data": {
    "transaction_types": [
      {
        "transaction_type": "CREDIT_CARD",
        "count": 8500,
        "fraud_count": 200,
        "fraud_rate": 2.35
      },
      {
        "transaction_type": "DEBIT_CARD",
        "count": 4200,
        "fraud_count": 85,
        "fraud_rate": 2.02
      }
    ]
  }
}
```

---

### Geographic Analysis

Get fraud by geographic region.

```
GET /analytics/geographic-analysis
```

**Response (200 OK)**
```json
{
  "data": {
    "regions": [
      {
        "region": "US",
        "transactions": 10000,
        "fraud_count": 250,
        "fraud_rate": 2.5
      },
      {
        "region": "UK",
        "transactions": 2000,
        "fraud_count": 35,
        "fraud_rate": 1.75
      }
    ]
  }
}
```

---

## Merchant Endpoints

### List Merchants

```
GET /merchants?page=1&limit=20
```

**Response (200 OK)**
```json
{
  "data": {
    "merchants": [
      {
        "id": "uuid-1234",
        "name": "Amazon",
        "mcc": "5411",
        "fraud_rate": 2.33,
        "total_transactions": 5000,
        "status": "active"
      }
    ],
    "total": 150
  }
}
```

---

### Create Merchant

```
POST /merchants
```

**Request**
```json
{
  "name": "Amazon",
  "mcc": "5411",
  "country": "US"
}
```

**Response (201 Created)**
```json
{
  "data": {
    "id": "uuid-1234",
    "name": "Amazon",
    "mcc": "5411",
    "status": "active"
  }
}
```

---

### Update Merchant

```
PUT /merchants/{merchant_id}
```

**Request**
```json
{
  "name": "Amazon Updated",
  "status": "active"
}
```

**Response (200 OK)**
```json
{
  "data": {
    "id": "uuid-1234",
    "name": "Amazon Updated"
  }
}
```

---

### Delete Merchant

```
DELETE /merchants/{merchant_id}
```

**Response (204 No Content)**

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| INVALID_REQUEST | 400 | Missing or invalid parameters |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | User not authorized for resource |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| VALIDATION_ERROR | 422 | Data validation failed |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily unavailable |

---

## Rate Limiting

API is rate-limited to prevent abuse:

- **Default**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per user
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Pagination

All list endpoints support pagination:

**Query Parameters**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response**
```json
{
  "data": {
    "items": [...],
    "total": 1500,
    "page": 1,
    "limit": 20,
    "pages": 75
  }
}
```

---

## Filtering

Supported filter operations:

- `status=completed`: Exact match
- `created_at__gte=2024-01-01`: Greater than or equal (date)
- `amount__lte=1000`: Less than or equal (number)
- `merchant_id__in=uuid1,uuid2`: Multiple values

---

## Sorting

List endpoints support sorting:

```
GET /transactions?sort=-created_at,amount
```

- `-field`: Descending order
- `field`: Ascending order (default)

---

**Last Updated**: May 2024  
**Version**: 1.0.0  
**Status**: Production Ready

# FraudNet Quick Start Guide

Get FraudNet running locally in 5 minutes!

## Prerequisites Check
- Node.js 18+ (`node --version`)
- Python 3.9+ (`python --version`)
- Terminal/Command Prompt access

## Step 1: Frontend Setup (2 minutes)

```bash
# Navigate to project root
cd /path/to/fraudnet

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Frontend is now running at `http://localhost:5173`

## Step 2: Backend Setup (2 minutes)

```bash
# In a new terminal, navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server
python app.py
```

Backend API is now running at `http://localhost:5000`

## Step 3: Login & Explore (1 minute)

1. Open browser to `http://localhost:5173`
2. Click "Sign Up" to create a test account
3. Or use "Sign In" if you already created one
4. Once logged in, explore:
   - **Dashboard**: Real-time fraud metrics
   - **Transactions**: Transaction list with filtering
   - **Alerts**: Fraud alerts management
   - **Analytics**: Fraud trends and reporting
   - **ML Models**: Model performance metrics

## Default Test Credentials

```
Email: test@fraudnet.com
Password: Test123!
```

Or create your own account via Sign Up.

## API Testing

Once backend is running, test endpoints:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Get transactions
curl -X GET http://localhost:5000/api/transactions/?page=1&limit=10

# Analyze transaction for fraud
curl -X POST http://localhost:5000/api/fraud-detection/analyze \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"TXN001","amount":1500,"country":"US"}'
```

## Troubleshooting

### Frontend won't start
```bash
# Clear node modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

### Backend won't start
```bash
# Make sure Python venv is activated
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Check Python version
python --version  # Must be 3.9+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Port already in use
```bash
# Change frontend port
pnpm dev -- --port 3000

# Change backend port
python app.py --port 5001
```

### CORS errors
Make sure both frontend and backend are running. Check:
1. Frontend running on port 5173
2. Backend running on port 5000
3. API URL in frontend: `http://localhost:5000/api`

## Next Steps

### To Use Real Database (Supabase)
1. Create Supabase account at supabase.com
2. Create new project
3. Get Connection URL from Settings > Database
4. Update `.env` file with credentials
5. Run database migrations

### To Integrate ML Models
1. Prepare training data (CSV with transaction history)
2. Run: `python backend/models/train.py --data transactions.csv`
3. Model will be saved to `backend/models/fraud_detector.pkl`
4. System will automatically use trained model

### To Deploy
**Frontend (Vercel)**:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Backend (Railway/Render)**:
- Connect GitHub repo
- Set environment variables
- Deploy with one click

## Understanding the Fraud Score

FraudNet assigns a fraud score (0-100) based on:

- **0-30**: Legitimate transaction
- **30-70**: Medium risk - may require verification
- **70+**: High fraud risk - automatic flagging

The score comes from three components:
1. **Gradient Boosting (50%)**: ML pattern recognition
2. **Rule-Based (30%)**: Domain knowledge rules
3. **Anomaly Detection (20%)**: Statistical outliers

## Common Use Cases

### Monitor New Merchant
1. Go to Merchants page
2. Add merchant details
3. View real-time transaction analysis
4. Adjust risk thresholds if needed

### Configure Fraud Rules
1. Go to Rules page
2. Create new rule (e.g., "Flag transactions > $5000")
3. Test rule on sample transactions
4. Enable rule to apply system-wide

### Analyze Fraud Trends
1. Go to Analytics page
2. Select time period
3. View merchant-level fraud rates
4. Export report for further analysis

### Investigate Alert
1. Go to Alerts page
2. Click on alert to expand details
3. Review component scores
4. Mark as investigating
5. Resolve when complete

## Performance Tips

- **Faster fraud detection**: Use smaller time windows
- **Better accuracy**: Enable merchant whitelisting
- **Reduce false positives**: Adjust ML confidence threshold
- **Optimize queries**: Use date range filters

## Resources

- **Documentation**: See README.md for detailed docs
- **API Reference**: http://localhost:5000/docs (if Swagger enabled)
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions

## What's Next?

1. **Explore the dashboard**: Understand your fraud metrics
2. **Create fraud rules**: Configure custom detection rules
3. **Retrain models**: Improve accuracy with your data
4. **Set up alerts**: Get notified of suspicious transactions
5. **Review analytics**: Understand fraud patterns

## Support

Having issues? Check:
1. Both servers are running (ports 5173 and 5000)
2. Python venv is activated
3. Dependencies are installed (`pnpm install`, `pip install -r requirements.txt`)
4. No firewall blocking ports
5. Network connectivity is working

For more help, see README.md or open an issue on GitHub.

Happy fraud detecting! 🚨

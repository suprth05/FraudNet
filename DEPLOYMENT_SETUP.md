# FraudNet Production Deployment Guide

Follow this guide to deploy the entire FraudNet system (Frontend and Backend) to production.

---

## Deployment Summary
* **Frontend**: Hosted on [Vercel](https://vercel.com) (Static Vite app).
* **Backend**: Hosted on [Render](https://render.com) (Flask + Socket.IO Web Service).
* **Database**: Hosted on [Render PostgreSQL](https://render.com) (Managed database, automatically provisioned).

---

## Step-by-Step Deployment Sequence

### Step 1: Push Code to GitHub
Ensure you have committed and pushed all recent changes to your personal GitHub repository (e.g. `Monozz05/FraudNet` on the `main` branch).

### Step 2: Deploy Backend & Database on Render (One-Click Blueprint)
We have configured a `render.yaml` blueprint file. This automatically configures your web service and database with a single connection.

1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click **New** (top right) and select **Blueprint**.
3. Connect your GitHub account and select your **FraudNet** repository.
4. Render will automatically parse the `render.yaml` file.
5. Provide a service group name (e.g., `fraudnet-production`).
6. Under **Environment Variables**:
   * Render will automatically generate random secure keys for `SECRET_KEY` and `JWT_SECRET_KEY`.
   * Render will automatically provision a PostgreSQL database (`fraudnet-db`) and inject its `DATABASE_URL`.
   * Set `CORS_ORIGINS` to `*` initially, or update it later with your Vercel URL once Vercel is deployed.
7. Click **Approve** / **Apply**.
8. Wait for the database and web service to deploy. Note down your backend URL (e.g., `https://fraudnet-backend-xxxx.onrender.com`).

### Step 3: Deploy Frontend on Vercel
1. Go to the [Vercel Dashboard](https://vercel.com).
2. Click **Add New** and select **Project**.
3. Import your **FraudNet** GitHub repository.
4. Under **Environment Variables**, add the following variable:
   * **Key**: `VITE_API_URL`
   * **Value**: `<YOUR_RENDER_BACKEND_URL>/api` (e.g., `https://fraudnet-backend-xxxx.onrender.com/api`)
5. Click **Deploy**.
6. Once deployed, copy your Vercel URL (e.g., `https://fraudnet-xxxx.vercel.app`).

### Step 4: [Optional] Lock Down CORS
For security, once Vercel is deployed, you should update the backend CORS settings on Render so that only your Vercel site can query it:
1. Go to your Render Dashboard.
2. Select your `fraudnet-backend` web service.
3. Click **Environment**.
4. Change `CORS_ORIGINS` from `*` to your Vercel URL (e.g. `https://fraudnet-xxxx.vercel.app,http://localhost:5173`).
5. Click **Save Changes** (Render will redeploy the service automatically).

---

## Environment Variables Reference

### Backend variables (Render)
| Variable | Description | Source |
| :--- | :--- | :--- |
| `PORT` | Local service port (Default: `5001`) | Set automatically |
| `DATABASE_URL` | PostgreSQL connection string | Generated automatically by Render Database |
| `SECRET_KEY` | Flask application secret session signature | Generated automatically by Render Blueprint |
| `JWT_SECRET_KEY` | Flask-JWT-Extended token signature | Generated automatically by Render Blueprint |
| `CORS_ORIGINS` | Permitted browser domains | User-defined (e.g. Vercel URL) |

### Frontend variables (Vercel)
| Variable | Description | Source |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL of the Render Backend API ending in `/api` | User-defined (e.g., `https://backend.onrender.com/api`) |

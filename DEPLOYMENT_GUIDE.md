# DarshanAI — Production Publishing & Deployment Manual

This guide provides step-by-step instructions to publish **DarshanAI** (React Frontend, FastAPI Backend, PostgreSQL, and ML Engine) to production.

---

## 🚀 Option 1: One-Click Cloud Deployment (Render / Railway / Vercel)

### Step 1: Push Code to GitHub
```bash
git init
git add .
git commit -m "feat: DarshanAI production-ready release"
git branch -M main
git remote add origin https://github.com/<your-username>/darshanai.git
git push -u origin main
```

### Step 2: Deploy Backend & Database on Render
1. Go to [render.com](https://render.com) and create a **PostgreSQL Database**:
   - Name: `darshanai-db`
   - Copy the **Internal Database URL** (`postgresql://...`).
2. Create a new **Web Service** on Render:
   - Connect your GitHub repository.
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn backend.main:app -w 1 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT --threads 4 --max-requests 500 --max-requests-jitter 50`
   - Add Environment Variables:
     - `DATABASE_URL`: *(Your PostgreSQL URL from step 1)*
     - `SECRET_KEY`: *(Generate a secure random string)*
     - `PYTHONMALLOC`: `malloc`
     - `MALLOC_TRIM_THRESHOLD_`: `100000`
     - `CORS_ORIGINS`: `*` (or `https://<your-frontend-domain>.vercel.app`)
3. Click **Deploy**. Note your backend URL (e.g. `https://darshanai-api.onrender.com`).

### Step 3: Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Select your repository and set Root Directory to `frontend`.
3. Framework Preset: `Vite`.
4. Environment Variables:
   - `VITE_API_BASE_URL`: `https://darshanai-api.onrender.com/api`
5. Click **Deploy**.

---

## 🐳 Option 2: 1-Command Docker Deployment (Local / VPS / AWS EC2)

To deploy the full platform (PostgreSQL 16 + FastAPI + React Nginx) with a single command:

```bash
docker-compose up -d --build
```

- **React Web App**: `http://<your-server-ip>/`
- **FastAPI API & Docs**: `http://<your-server-ip>:8000/docs`
- **PostgreSQL Database**: `localhost:5432`

---

## 💻 Option 3: Local Self-Hosted Production Run

### 1. Build React Production Static Bundle
```bash
cd frontend
npm install
npm run build
```

### 2. Run FastAPI Production Server
```bash
# From project root
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

---

## 🔑 Initial Demo Admin Credentials

| Role | Temple | Email | Password |
|---|---|---|---|
| **Super Admin** | Platform Global | `superadmin@darshanai.com` | `SuperAdmin123!` |
| **Temple Admin** | Sri Somnath Temple (`TEMPLE-001`) | `admin@temple001.com` | `TempleAdmin123!` |
| **Temple Admin** | Sri Venkateswara Temple (`TEMPLE-002`) | `admin@temple002.com` | `TempleAdmin123!` |

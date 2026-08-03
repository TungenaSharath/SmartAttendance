# 🌐 SmartAttendance Startup Pilot Deployment Guide

This guide details how to deploy **SmartAttendance** for live college/school pilots in under 15 minutes with **zero/minimal infrastructure costs**.

---

## 🏗️ Architecture Overview

- **Frontend:** React 19 SPA hosted on **Vercel** or **Cloudflare Pages** (Free Tier).
- **Backend API:** FastAPI + InsightFace Docker Container hosted on **Render**, **Railway**, or a $15/mo **Hetzner VPS**.
- **Storage:** Local volume mount / S3 compatible Cloudflare R2 bucket.

---

## ⚡ Option A: Quick 1-Click Deployment (Render + Vercel)

### 1. Backend API Deployment on Render.com
1. Push your repository to GitHub.
2. Log into [Render.com](https://render.com) and click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Select Environment: **Docker**.
5. Set Environment Variables:
   - `JWT_SECRET` = `(generate a random 64-character hex string)`
   - `SIM_THRESHOLD` = `0.45`
   - `DET_CONFIDENCE` = `0.45`
   - `CORS_ORIGINS` = `https://your-app-name.vercel.app`
6. Click **Create Web Service**. Render will build your Docker image and provide your live API URL (e.g., `https://smart-attendance-api.onrender.com`).

### 2. Frontend Deployment on Vercel
1. Log into [Vercel.com](https://vercel.com) and click **Add New** $\rightarrow$ **Project**.
2. Import your GitHub repository and set Root Directory to `frontend`.
3. Framework Preset: **Vite**.
4. Set Environment Variables:
   - `VITE_API_URL` = `https://smart-attendance-api.onrender.com` (Your Render API URL from Step 1).
5. Click **Deploy**. Vercel will host your application with global SSL (HTTPS) enabled automatically.

---

## 🐳 Option B: Self-Hosted Production VPS (Hetzner / DigitalOcean / AWS)

For colleges that require data to stay on a dedicated server:

1. Provision a Linux VPS (Ubuntu 22.04 LTS, 4 vCPU, 8GB RAM).
2. SSH into your VPS and install Docker & Docker Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose
   ```
3. Clone your project repository:
   ```bash
   git clone https://github.com/your-username/SmartAttendance.git
   cd SmartAttendance
   ```
4. Launch the production stack:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```
5. Check backend health status:
   ```bash
   curl http://localhost:8000/api/health
   ```

---

## 🔑 Pilot Onboarding & Demo Setup

To quickly seed credentials before a college demo or pilot launch:

```bash
python seed_pilot.py --institution "CBIT College" --teacher "Prof. Sharma" --subject "Computer Networks"
```

**Default Demo Login Credentials:**
- **Teacher ID:** `FAC2026`
- **Password:** `password123`

---

## 🛡️ SSL / HTTPS & Camera Permissions Note

Browsers strictly require **HTTPS** (or `localhost`) to access device webcams (`navigator.mediaDevices.getUserMedia`). 
- When deploying on Vercel/Netlify, **HTTPS is provided automatically**.
- When accessing on local networks (Wi-Fi), run [generate_ssl.py](file:///c:/Users/tshar/Desktop/SmartAttendance/generate_ssl.py) to generate self-signed certificates.

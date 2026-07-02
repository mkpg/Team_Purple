# CraftShield: Render Deployment Guide

This guide walks you through deploying both the **FastAPI Backend** and the **React Frontend** to **Render** using the provided `render.yaml` Blueprint spec.

---

## 🛠️ Step 1: Set Up MongoDB Atlas (Required)
Since Render doesn't host databases on its free tier, you should use **MongoDB Atlas** (which has a perpetual free tier):

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up or sign in.
2. Create a new database cluster (select the **M0 Shared Free Tier**).
3. Under **Network Access**, add IP `0.0.0.0/0` to allow connections from all origins (necessary since Render servers have dynamic IPs).
4. Under **Database Access**, create a user with a secure password (e.g. user: `craftshield_admin`, password: `your_password`).
5. Click **Connect** -> **Drivers** (Python/Node) to retrieve your connection URI. It will look like this:
   ```
   mongodb+srv://craftshield_admin:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   *Replace `<password>` with your database user password, and append the database name `/craftshield` before the query parameters if needed.*

---

## 🚀 Step 2: Deploy to Render using Blueprints (Fastest)

Render Blueprints allow you to deploy the entire stack automatically using the `render.yaml` file in the root of the repository:

1. **Commit and push** your codebase (including `render.yaml` and the modified files) to a private or public repository on GitHub, GitLab, or Bitbucket.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click on the **Blueprints** tab in the top menu bar, then click **New Blueprint Instance** (or click **New +** -> **Blueprint Route**).
4. Select and connect your Git repository.
5. Render will automatically read the `render.yaml` file and show the services it will create:
   * `craftshield-backend` (Web Service)
   * `craftshield-frontend` (Static Site)
6. You will be prompted to enter the value for the environment variable:
   * **`MONGODB_URL`**: Paste the MongoDB Atlas connection URI from Step 1.
7. Click **Deploy**. Render will start building the services in parallel:
   * The backend will install python packages and launch.
   * The frontend will install node packages, build the production code, set the API Base URL to point to the backend service, and deploy the static folder.

---

## 🧭 Step 3: Manual Deployment Alternative

If you prefer to deploy them manually step-by-step:

### A. Deploy Backend (Web Service)
1. In the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the following:
   * **Name**: `craftshield-backend`
   * **Runtime**: `Python`
   * **Root Directory**: `backend`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add the following **Environment Variables** in the service settings:
   * `DATABASE_NAME` = `craftshield`
   * `JWT_ALGORITHM` = `HS256`
   * `ACCESS_TOKEN_EXPIRE_MINUTES` = `1440`
   * `DEBUG` = `False`
   * `JWT_SECRET` = *(Generate a random 64-character hex string)*
   * `MONGODB_URL` = *(Your MongoDB Atlas URI)*
5. Click **Create Web Service**. Note down the backend URL once deployed (e.g. `https://craftshield-backend.onrender.com`).

### B. Deploy Frontend (Static Site)
1. Click **New +** -> **Static Site**.
2. Connect your Git repository.
3. Configure the following:
   * **Name**: `craftshield-frontend`
   * **Root Directory**: `FrontEnd`
   * **Build Command**: `npm install && npm run build`
   * **Publish Directory**: `dist`
4. Add the following **Environment Variable** in the settings:
   * **`VITE_API_BASE_URL`**: Paste your deployed backend service URL (e.g. `https://craftshield-backend.onrender.com`).
5. Set up **Redirects/Rewrites** (Required for routing to work properly):
   * Go to the **Redirects/Rewrites** tab in your static site dashboard.
   * Add a rule:
     * **Source**: `/*`
     * **Destination**: `/index.html`
     * **Action**: `Rewrite` (This ensures React Router routes don't return 404).
6. Click **Create Static Site**.

---

## 🔍 Step 4: Verification
* Once deployed, visit your backend URL at `https://your-backend-name.onrender.com/docs` to see the interactive Swagger API documentation.
* Visit your frontend URL at `https://your-frontend-name.onrender.com` to access the application login and dashboards.

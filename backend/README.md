# CraftShield Backend API

CraftShield is a secure jewellery marketplace and custom-order management Progressive Web App (PWA). This repository contains the Python + FastAPI + MongoDB backend, implementing role-based authorization, JWT authentication, and the core marketplace / order workflow.

## Tech Stack
- **FastAPI**: Modern, fast web framework for building APIs with Python.
- **MongoDB & Motor**: NoSQL database and its asynchronous driver for Python.
- **Pydantic v2**: Data validation and settings management.
- **PyJWT / Python-Jose**: JSON Web Token creation and verification.
- **Passlib (Bcrypt)**: Secure password hashing.

## Features implemented
1. **User Authentication & Seeding**:
   - Register endpoint for Clients (active immediately).
   - Register endpoint for Artisans (created with `verification_status: "pending"`).
   - Unified Login endpoint that checks credentials and matches roles.
   - Admin account seeded automatically on startup: `admin` / `1234`.
   - Sample verified artisans and products seeded automatically.
2. **Role-Based Access Control**:
   - Client Portal: manage requests, view quotes, accept/reject quotes, pay mock payments, and track orders.
   - Artisan Portal: update profile, upload products, accept/reject requests, send quotes, and update order statuses.
   - Admin Portal: verify/reject pending artisans, view all users, products, orders, payments, and disputes.
3. **Core Business Rules Engine**:
   - Enforces that an artisan must be verified to upload products, accept requests, or change order production states.
   - Requires securing advance payments before the artisan can start designs or production.
   - Restricts final deliveries until the final payments are marked paid.
4. **Interactive Swagger Docs**:
   - Auto-generated interactive documentation at `/docs` or `/redoc`.

---

## Installation & Running Locally

### 1. Prerequisites
- **Python 3.9+** installed on your system.
- **MongoDB** running locally or via a cloud instance (e.g., MongoDB Atlas).
  - *Default local URL*: `mongodb://localhost:27017`

### 2. Configure Environment
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Copy the `.env.example` file to `.env`:
   ```bash
   copy .env.example .env
   ```
3. Update `.env` values (MongoDB URL, Secret keys) if necessary.

### 3. Set Up Virtual Environment & Dependencies
Create a virtual environment and install packages:
```bash
python -m venv venv
venv\Scripts\activate   # Windows
# or: source venv/bin/activate (macOS/Linux)

pip install -r requirements.txt
```

### 4. Start the Application
Run the FastAPI development server using `uvicorn`:
```bash
uvicorn app.main:app --reload
```
By default, the server runs at: **`http://localhost:8000`**

### 5. Accessing API Documentation
- Interactive Swagger UI: **`http://localhost:8000/docs`**
- Alternative ReDoc documentation: **`http://localhost:8000/redoc`**

---

## Default Seed Credentials (Local Prototype)
On startup, the system seeds the following credentials if the database is empty:

### 1. Administrator Account
- **Username**: `admin`
- **Password**: `1234`
- **Role**: `admin`

### 2. Verified Artisan 1
- **Username**: `aurelia_gold`
- **Password**: `password123`
- **Role**: `artisan`

### 3. Verified Artisan 2
- **Username**: `tanaka_metals`
- **Password**: `password123`
- **Role**: `artisan`

---

## Workflow Flowchart
1. **Request**: Client submits Custom Request to an Artisan (`POST /api/client/custom-requests`).
2. **Acceptance**: Artisan accepts the request (`PUT /api/artisan/custom-requests/{id}/accept`).
3. **Quotation**: Artisan sends a Quotation (`POST /api/artisan/quotations`).
4. **Accept Quote**: Client accepts Quotation (`PUT /api/client/quotations/{id}/accept`), which creates an Order in state `Advance Payment Pending`.
5. **Deposit**: Client submits mock advance payment (`POST /api/client/orders/{id}/payments/advance`). Order changes to `Advance Payment Secured`.
6. **Production**: Artisan updates status through: `Design in Progress` -> `Production Started` -> `Work in Progress` -> `Quality Check` -> `Ready for Delivery`.
7. **Settlement**: Client submits mock final payment (`POST /api/client/orders/{id}/payments/final`). Order changes to `Final Payment Pending`.
8. **Delivery**: Artisan marks order as `Delivered` (`PUT /api/artisan/orders/{id}/status` to `Delivered`).
9. **Completion**: Client marks order as `Completed` (`PUT /api/artisan/orders/{id}/status` or `PUT /api/client/orders/{id}/status` if available).

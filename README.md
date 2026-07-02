# CraftShield Backend

CraftShield is a Progressive Web App for custom jewellery orders. It connects Clients with verified Artisans and provides a structured order workflow that reduces cancellation risk, protects advance payments, and supports transparent order management.

This repository contains the FastAPI backend for CraftShield.

## Current Scope

The current implementation focuses on the core backend required for the first working version of the application:

* Client, Artisan, and Admin accounts
* JWT authentication and password hashing
* Role-based API authorization
* Artisan verification by Admin
* Jewellery product management
* Custom jewellery request workflow
* Quotation management
* Order creation and order-status tracking
* Mock advance and final payment records
* Admin monitoring APIs

Real payment gateways, blockchain deployment, AI voice assistance, and churn prediction are planned for later phases.

## Technology Stack

| Layer             | Technology               |
| ----------------- | ------------------------ |
| Backend Framework | Python + FastAPI         |
| Database          | MongoDB                  |
| Database Driver   | Motor                    |
| Authentication    | JWT                      |
| Password Security | Passlib + Bcrypt         |
| API Documentation | FastAPI Swagger UI       |
| API Testing       | Postman / Thunder Client |

## User Roles

### Client

Clients can register, browse jewellery products, create custom requests, view quotations, track orders, and view mock payment records.

### Artisan

Artisans can manage jewellery products, receive custom requests, send quotations, update production status, and view order records.

New Artisan accounts remain in `Pending Verification` status until approved by an Admin.

### Admin

Admins can verify Artisans and monitor users, products, orders, payments, and platform activity.

Public Admin registration is not allowed.

## Core Order Workflow

```text id="20zd5q"
Client Registration
        ↓
Artisan Registration
        ↓
Admin Verifies Artisan
        ↓
Client Creates Custom Request
        ↓
Verified Artisan Accepts Request
        ↓
Artisan Sends Quotation
        ↓
Client Accepts Quotation
        ↓
Order Created
        ↓
Mock Advance Payment Secured
        ↓
Artisan Updates Production Status
        ↓
Mock Final Payment Paid
        ↓
Delivery and Completion
```

## Order Statuses

```text id="m7c7z2"
Request Submitted
Quotation Sent
Quotation Accepted
Advance Payment Pending
Advance Payment Secured
Design in Progress
Production Started
Work in Progress
Quality Check
Ready for Delivery
Final Payment Pending
Delivered
Completed
Cancelled
Disputed
```

## Payment Scope

Payments are mock records in the current version.

The backend stores the advance amount, final amount, payment status, transaction reference, and payment timestamps.

The application does not include bank login screens, bank account details, card PIN fields, banking OTP screens, or direct bank-account linking.

A future version can integrate a payment gateway for payment collection, verification, refunds, and controlled fund release.

## API Modules

### Authentication

```text id="4tf9tq"
POST /api/auth/register/client
POST /api/auth/register/artisan
POST /api/auth/login
GET  /api/auth/me
```

### Client

```text id="bjvv4o"
GET  /api/client/dashboard
GET  /api/client/artisans
GET  /api/client/products
POST /api/client/custom-requests
GET  /api/client/custom-requests
GET  /api/client/quotations
PUT  /api/client/quotations/{quotation_id}/accept
PUT  /api/client/quotations/{quotation_id}/reject
GET  /api/client/orders
GET  /api/client/orders/{order_id}
POST /api/client/orders/{order_id}/payments/advance
POST /api/client/orders/{order_id}/payments/final
GET  /api/client/payments
```

### Artisan

```text id="kz75b4"
GET    /api/artisan/dashboard
GET    /api/artisan/profile
PUT    /api/artisan/profile
POST   /api/artisan/products
GET    /api/artisan/products
PUT    /api/artisan/products/{product_id}
DELETE /api/artisan/products/{product_id}
GET    /api/artisan/custom-requests
PUT    /api/artisan/custom-requests/{request_id}/accept
PUT    /api/artisan/custom-requests/{request_id}/reject
POST   /api/artisan/quotations
GET    /api/artisan/orders
PUT    /api/artisan/orders/{order_id}/status
GET    /api/artisan/payments
```

### Admin

```text id="pjo6cs"
GET /api/admin/dashboard
GET /api/admin/users
GET /api/admin/artisans/pending
PUT /api/admin/artisans/{artisan_id}/verify
GET /api/admin/products
GET /api/admin/orders
GET /api/admin/payments
GET /api/admin/disputes
```

## Database Collections

```text id="2wmdk3"
users
artisan_profiles
products
custom_requests
quotations
orders
payments
reviews
disputes
design_records
notifications
```

## Project Structure

```text id="z3uy44"
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── dependencies.py
│   ├── utils/
│   │   ├── security.py
│   │   └── serializers.py
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── artisan.py
│   │   ├── product.py
│   │   ├── custom_request.py
│   │   ├── quotation.py
│   │   ├── order.py
│   │   └── payment.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── client.py
│   │   ├── artisan.py
│   │   └── admin.py
│   └── services/
│       ├── auth_service.py
│       ├── order_service.py
│       └── payment_service.py
├── requirements.txt
└── README.md
```

## Local Development

1. Clone the repository.
2. Install the required Python dependencies.
3. Configure local development settings privately.
4. Ensure MongoDB is running.
5. Start the FastAPI server.
6. Test endpoints through FastAPI Swagger documentation.

Swagger documentation is available locally at:

```text id="gmfow9"
http://127.0.0.1:8000/docs
```

## Required Packages

```text id="evwsgu"
fastapi
uvicorn
motor
pydantic
pydantic-settings
python-jose
passlib[bcrypt]
python-multipart
email-validator
```

## Future Enhancements

* React and Tailwind CSS PWA frontend integration
* Payment gateway integration
* Advance-payment release and refund workflow
* Digital contract generation
* Blockchain-based design ownership records
* Jewellery design upload and verification
* Multilingual AI voice assistant
* Client churn-risk prediction
* Reliability scoring
* Chat and notifications
* Reviews and dispute-resolution workflow


## Team
* Lajwanthi S R - Product Manager
* Jayasri J - Business Analyst
* Vasantha N - Tester
* Varunprasad V - Front-End Developer
* Manikanda Prabu V K - Backend Developer


## Security Notes

* Passwords are stored as hashes.
* JWT tokens protect authenticated endpoints.
* Role-based access control prevents unauthorized API access.
* Clients, Artisans, and Admins can access only their permitted resources.
* Payment data is currently mock data; no banking credentials or card information are stored.

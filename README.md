# CraftShield Project Modules

This repository contains the full CraftShield hackathon project: a secure jewellery marketplace with role-based dashboards, custom order workflows, blockchain design provenance, and mobile/PWA support.

## Top-Level Modules

| Module | Purpose |
| --- | --- |
| [backend](backend) | FastAPI + MongoDB API server for authentication, dashboards, orders, payments, uploads, and admin operations. |
| [FrontEnd](FrontEnd) | React + Vite frontend with role-based screens, localization, and PWA/mobile UI. |
| [contracts](contracts) | Solidity smart contract and deployment scripts for design provenance on VeChain testnet. |
| [run_app.bat](run_app.bat) | Windows launcher for starting the backend and frontend together. |
| [render.yaml](render.yaml) | Render deployment configuration for hosted environments. |
| [render_deployment_guide.md](render_deployment_guide.md) | Deployment notes for running the project on Render. |
| [craftshield_integration_summary.md](craftshield_integration_summary.md) | High-level architecture and feature summary. |
| [current_progress.md](current_progress.md) | Latest implementation status and completed features. |
| [print_db_products.py](print_db_products.py) | Utility script for inspecting product data in the database. |
| [test_live_hash.py](test_live_hash.py) | Utility script for checking live blockchain hash/provenance behavior. |

## Backend Modules

The backend lives in [backend/app](backend/app) and is organized into focused layers.

### Core application files

| File | Role |
| --- | --- |
| [backend/app/main.py](backend/app/main.py) | FastAPI application entry point, middleware, startup logic, and route registration. |
| [backend/app/config.py](backend/app/config.py) | Environment configuration and settings. |
| [backend/app/database.py](backend/app/database.py) | MongoDB connection, indexes, and startup seeding. |
| [backend/app/dependencies.py](backend/app/dependencies.py) | Auth and role-based dependency guards. |

### API route modules

| File | Role |
| --- | --- |
| [backend/app/routes/auth.py](backend/app/routes/auth.py) | Registration, login, and current-user endpoints. |
| [backend/app/routes/client.py](backend/app/routes/client.py) | Client dashboard, requests, quotations, orders, and payments. |
| [backend/app/routes/artisan.py](backend/app/routes/artisan.py) | Artisan profile, products, custom requests, quotations, orders, and proofs. |
| [backend/app/routes/admin.py](backend/app/routes/admin.py) | Admin dashboard, verification, global catalog, and audits. |

### Schema modules

| File | Role |
| --- | --- |
| [backend/app/schemas/auth.py](backend/app/schemas/auth.py) | Authentication request and response models. |
| [backend/app/schemas/user.py](backend/app/schemas/user.py) | User account data models. |
| [backend/app/schemas/product.py](backend/app/schemas/product.py) | Product create/update/read models. |
| [backend/app/schemas/order.py](backend/app/schemas/order.py) | Order state and workflow models. |
| [backend/app/schemas/payment.py](backend/app/schemas/payment.py) | Payment and transaction models. |
| [backend/app/schemas/quotation.py](backend/app/schemas/quotation.py) | Quotation request and response models. |
| [backend/app/schemas/custom_request.py](backend/app/schemas/custom_request.py) | Custom design request models. |
| [backend/app/schemas/artisan.py](backend/app/schemas/artisan.py) | Artisan profile and verification models. |

### Service modules

| File | Role |
| --- | --- |
| [backend/app/services/auth_service.py](backend/app/services/auth_service.py) | Authentication helpers and token-related logic. |
| [backend/app/services/order_service.py](backend/app/services/order_service.py) | Order lifecycle logic and workflow helpers. |
| [backend/app/services/payment_service.py](backend/app/services/payment_service.py) | Payment handling and payment-state updates. |
| [backend/app/services/blockchain.py](backend/app/services/blockchain.py) | Design hashing, blockchain anchoring, and provenance checks. |
| [backend/app/services/image_similarity.py](backend/app/services/image_similarity.py) | Perceptual image similarity checks for duplicate-design detection. |
| [backend/app/services/reliability_score.py](backend/app/services/reliability_score.py) | Reliability and trust scoring helpers. |

### Utility modules

| File | Role |
| --- | --- |
| [backend/app/utils/security.py](backend/app/utils/security.py) | Password hashing and JWT/security helpers. |
| [backend/app/utils/serializers.py](backend/app/utils/serializers.py) | Data serialization helpers. |

## Frontend Modules

The frontend lives in [FrontEnd/src](FrontEnd/src) and is organized around a shared context, reusable UI components, and role-based pages.

### Application entry files

| File | Role |
| --- | --- |
| [FrontEnd/src/main.jsx](FrontEnd/src/main.jsx) | React entry point. |
| [FrontEnd/src/App.jsx](FrontEnd/src/App.jsx) | App routing and top-level UI composition. |
| [FrontEnd/src/index.css](FrontEnd/src/index.css) | Global styles and design tokens. |
| [FrontEnd/src/App.css](FrontEnd/src/App.css) | App-level styling. |

### Shared frontend modules

| Folder/File | Role |
| --- | --- |
| [FrontEnd/src/context/CraftShieldContext.jsx](FrontEnd/src/context/CraftShieldContext.jsx) | Central state, API access, auth session, and data refresh logic. |
| [FrontEnd/src/components](FrontEnd/src/components) | Shared UI building blocks such as layout and modals. |
| [FrontEnd/src/pages](FrontEnd/src/pages) | Role-based screens for login, client, artisan, admin, and profile flows. |
| [FrontEnd/src/utils/translations.js](FrontEnd/src/utils/translations.js) | Localization dictionary for supported languages. |

### Frontend UI pages

| File | Role |
| --- | --- |
| [FrontEnd/src/pages/Login.jsx](FrontEnd/src/pages/Login.jsx) | Login and registration screen. |
| [FrontEnd/src/pages/ClientDashboard.jsx](FrontEnd/src/pages/ClientDashboard.jsx) | Client marketplace and order dashboard. |
| [FrontEnd/src/pages/ArtisanDashboard.jsx](FrontEnd/src/pages/ArtisanDashboard.jsx) | Artisan product, request, and order dashboard. |
| [FrontEnd/src/pages/AdminPanel.jsx](FrontEnd/src/pages/AdminPanel.jsx) | Admin verification and catalog management panel. |
| [FrontEnd/src/pages/Profile.jsx](FrontEnd/src/pages/Profile.jsx) | Shared profile page. |

### PWA / mobile assets

| File | Role |
| --- | --- |
| [FrontEnd/public/manifest.json](FrontEnd/public/manifest.json) | PWA manifest. |
| [FrontEnd/public/sw.js](FrontEnd/public/sw.js) | Service worker for offline/PWA support. |
| [FrontEnd/capacitor.config.json](FrontEnd/capacitor.config.json) | Capacitor mobile configuration. |
| [FrontEnd/android](FrontEnd/android) | Android wrapper project for mobile builds. |

## Smart Contract Modules

| File | Role |
| --- | --- |
| [contracts/DesignRegistry.sol](contracts/DesignRegistry.sol) | Solidity contract for anchoring design hashes and metadata. |
| [contracts/hardhat.config.js](contracts/hardhat.config.js) | Hardhat configuration. |
| [contracts/deploy.js](contracts/deploy.js) | Contract deployment script. |
| [contracts/deploy_onchain.py](contracts/deploy_onchain.py) | Python-based on-chain deployment helper. |
| [contracts/compile.js](contracts/compile.js) | Contract compilation helper. |
| [contracts/setup_blockchain.py](contracts/setup_blockchain.py) | Blockchain setup and helper script. |

## Supporting Documents

- [backend/README.md](backend/README.md)
- [FrontEnd/README.md](FrontEnd/README.md)
- [craftshield_integration_summary.md](craftshield_integration_summary.md)
- [current_progress.md](current_progress.md)
- [render_deployment_guide.md](render_deployment_guide.md)

## Quick Start

For local development on Windows, the fastest path is:

1. Ensure MongoDB is running.
2. Start both apps with [run_app.bat](run_app.bat).
3. Open the frontend at `http://localhost:5173`.

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import get_database, seed_database
from app.routes.auth import router as auth_router
from app.routes.client import router as client_router
from app.routes.artisan import router as artisan_router
from app.routes.admin import router as admin_router

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("Initializing database connection...")
    get_database()
    logger.info("Seeding database default assets...")
    await seed_database()
    yield
    # Shutdown logic
    logger.info("Shutting down database connection...")
    from app.database import client as db_client
    if db_client:
        db_client.close()
        logger.info("Database connection closed.")

app = FastAPI(
    title="CraftShield Core API",
    description="Backend services for the CraftShield PWA Jewellery Marketplace & Custom-Order flow.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
# Allow local React frontend servers (Vite uses 5173, CRA uses 3000)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to ["*"] for public availability during prototype phase
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(client_router)
app.include_router(artisan_router)
app.include_router(admin_router)

# Health Check / Root Endpoint
@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "app": "CraftShield Core Backend",
        "version": "1.0.0",
        "documentation": "/docs"
    }

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception caught: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"An unexpected server error occurred: {str(exc)}"}
    )

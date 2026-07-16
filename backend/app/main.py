import os
import uuid
import shutil
import logging
from typing import List
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import get_database, seed_database
from app.routes.auth import router as auth_router
from app.routes.client import router as client_router
from app.routes.artisan import router as artisan_router
from app.routes.admin import router as admin_router
from app.routes.verification import router as verification_router
from app.routes.chat import router as chat_router
from app.routes.voice_assistant import router as voice_assistant_router

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

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

# Mount Static Files for Uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "https://craftshield-p.netlify.app", 
        "https://craftshield.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    with open("request_log.txt", "a") as f:
        f.write(f"{request.method} {request.url.path} -> {response.status_code}\n")
    return response

# Include Routers
app.include_router(auth_router)
app.include_router(client_router)
app.include_router(artisan_router)
app.include_router(admin_router)
app.include_router(verification_router)
app.include_router(chat_router)
app.include_router(voice_assistant_router)

import base64
from io import BytesIO
from PIL import Image

# Multi-Image File Uploading Route
@app.post("/api/upload", tags=["Upload"])
async def upload_files(files: List[UploadFile] = File(...)):
    urls = []
    for file in files:
        content = await file.read()
        try:
            # Compress and resize to stay well under MongoDB 16MB limit
            img = Image.open(BytesIO(content))
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
            buffered = BytesIO()
            img.save(buffered, format="JPEG", quality=85)
            img_bytes = buffered.getvalue()
            
            b64_encoded = base64.b64encode(img_bytes).decode("utf-8")
            urls.append(f"data:image/jpeg;base64,{b64_encoded}")
        except Exception as e:
            logger.error(f"Image compression failed: {e}")
            # Fallback for non-image or unsupported formats
            import mimetypes
            mime = mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
            b64_encoded = base64.b64encode(content).decode("utf-8")
            urls.append(f"data:{mime};base64,{b64_encoded}")
        
    return {"urls": urls}

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

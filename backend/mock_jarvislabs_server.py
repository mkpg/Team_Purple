import os
import sys
import asyncio
import logging
from fastapi import FastAPI, UploadFile, File
import uvicorn
from motor.motor_asyncio import AsyncIOMotorClient

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MockJarvislabs")

app = FastAPI(
    title="Mock Jarvislabs AI Similarity Service",
    description="Simulates a GPU-backed deep learning (CLIP/ResNet) visual similarity extraction and matching service.",
    version="1.0.0"
)

# Simple MongoDB helper
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client["craftshield"]

@app.post("/similarity")
async def check_similarity(file: UploadFile = File(...)):
    logger.info(f"Received similarity check request for file: {file.filename}")
    
    # Read file content to simulate processing
    content = await file.read()
    logger.info(f"Processing image bytes (size: {len(content)} bytes)...")
    
    # In a real Jarvislabs GPU environment:
    # 1. Image bytes would be loaded: image = Image.open(io.BytesIO(content))
    # 2. Extract features using CLIP/ResNet model: embedding = model.encode(image)
    # 3. Perform a vector similarity search (e.g. Cosine Similarity) against the catalog:
    #    results = vector_db.search(embedding, limit=5)
    
    # For this mock service, we query MongoDB for an existing product to simulate a match.
    products_coll = db["products"]
    matches = []
    
    try:
        # Find a product in the database to simulate a match
        cursor = products_coll.find({}).limit(2)
        async for product in cursor:
            prod_id = str(product["_id"])
            # Return a visual similarity score (distance of 0.08, which translates to a ~92% match)
            matches.append({
                "product_id": prod_id,
                "distance": 0.08  # 0.08 cosine distance = high visual similarity
            })
            logger.info(f"Mocking AI match with product ID: {prod_id}")
    except Exception as e:
        logger.error(f"Error querying database for mock matches: {e}")
        
    return {
        "status": "success",
        "matches": matches
    }

if __name__ == "__main__":
    logger.info("Starting Mock Jarvislabs service on http://127.0.0.1:8080...")
    uvicorn.run(app, host="127.0.0.1", port=8080)

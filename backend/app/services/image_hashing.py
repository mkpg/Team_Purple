import hashlib
import io
import os
from datetime import datetime
from typing import Dict, List, Optional

import imagehash
from PIL import Image


def compute_sha256(image_bytes: bytes) -> str:
    """Return the SHA-256 fingerprint for exact image-byte identity."""
    return hashlib.sha256(image_bytes).hexdigest()


def compute_phash(image_bytes: bytes) -> str:
    """Return a perceptual image hash for visual similarity matching."""
    image = Image.open(io.BytesIO(image_bytes))
    return str(imagehash.phash(image))


def hamming_distance(hash_a: str, hash_b: str) -> int:
    """Compare two pHash hex strings by bit distance."""
    try:
        return bin(int(hash_a, 16) ^ int(hash_b, 16)).count("1")
    except Exception:
        return 999


async def find_similar_designs(
    db,
    new_phash: str,
    exclude_product_id: Optional[str] = None,
    threshold: int = 10,
) -> List[Dict]:
    """
    Scan existing product pHashes and return near matches sorted by closeness.

    This direct catalog scan is fine for the current scale. If the catalog grows
    large, move this to a similarity index or pre-bucketed hash comparison.
    """
    products_coll = db["products"]
    cursor = products_coll.find({"phash": {"$exists": True, "$ne": None}})
    matches = []

    async for product in cursor:
        product_id = str(product["_id"])
        if exclude_product_id and product_id == str(exclude_product_id):
            continue

        dist = hamming_distance(new_phash, product.get("phash"))
        if dist <= threshold:
            matches.append(
                {
                    "product_id": product_id,
                    "name": product.get("name"),
                    "artisan_id": str(product.get("artisan_id")),
                    "artisan_business_name": product.get("artisan_business_name", "Unknown Artisan"),
                    "distance": dist,
                    "image_url": product.get("image_url"),
                }
            )

    matches.sort(key=lambda item: item["distance"])
    return matches


async def check_exact_duplicate(
    db,
    new_sha256: str,
    exclude_product_id: Optional[str] = None,
) -> Optional[Dict]:
    """Return the first byte-for-byte duplicate product, if one exists."""
    query = {"sha256_hash": new_sha256}
    if exclude_product_id:
        query["_id"] = {"$ne": _safe_object_id(exclude_product_id)}

    product = await db["products"].find_one(query)
    return product


def build_fingerprint(image_bytes: bytes) -> Dict:
    now = datetime.utcnow()
    return {
        "sha256_hash": compute_sha256(image_bytes),
        "phash": compute_phash(image_bytes),
        "hash_computed_at": now,
    }


def read_local_upload_bytes(image_url: Optional[str]) -> Optional[bytes]:
    """Read an uploaded image URL (or Base64 data URI)."""
    if not image_url:
        return None
        
    if image_url.startswith("data:"):
        import base64
        try:
            # Format is typically data:image/jpeg;base64,.....
            header, encoded = image_url.split(",", 1)
            return base64.b64decode(encoded)
        except Exception:
            return None

    if not image_url.startswith("/uploads/"):
        return None

    filename = os.path.basename(image_url)
    upload_path = os.path.abspath(os.path.join("uploads", filename))
    uploads_root = os.path.abspath("uploads")
    if not upload_path.startswith(uploads_root):
        return None

    if not os.path.exists(upload_path):
        return None

    with open(upload_path, "rb") as image_file:
        return image_file.read()


def _safe_object_id(value):
    from bson import ObjectId

    try:
        return ObjectId(value)
    except Exception:
        return value

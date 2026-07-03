import io
from PIL import Image
import imagehash
from typing import List, Dict

def compute_phash(image_bytes: bytes) -> str:
    """Computes the pHash of an image and returns it as a hex string."""
    image = Image.open(io.BytesIO(image_bytes))
    ph = imagehash.phash(image)
    return str(ph)

def hamming_distance(hash_a: str, hash_b: str) -> int:
    """Computes the Hamming distance between two hex strings."""
    try:
        int_a = int(hash_a, 16)
        int_b = int(hash_b, 16)
        xor_val = int_a ^ int_b
        return bin(xor_val).count('1')
    except Exception:
        return 999

async def find_similar_designs(db, new_phash: str, threshold: int = 10) -> List[Dict]:
    """
    Queries all existing product documents with a stored phash,
    computes Hamming distance, and returns matches within the threshold, sorted by closeness.
    """
    products_coll = db["products"]
    # Find all products that have a phash field
    cursor = products_coll.find({"phash": {"$exists": True, "$ne": None}})
    matches = []
    
    async for product in cursor:
        prod_phash = product.get("phash")
        if not prod_phash:
            continue
        dist = hamming_distance(new_phash, prod_phash)
        if dist <= threshold:
            matches.append({
                "product_id": str(product["_id"]),
                "name": product.get("name"),
                "artisan_id": str(product.get("artisan_id")),
                "artisan_business_name": product.get("artisan_business_name", "Unknown Artisan"),
                "distance": dist,
                "image_url": product.get("image_url")
            })
            
    # Sort matches by distance (ascending - closer matches first)
    matches.sort(key=lambda x: x["distance"])
    return matches

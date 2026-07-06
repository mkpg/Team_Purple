from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, status

from app.database import get_collection
from app.services.transaction_proof import get_verified_proof

router = APIRouter(tags=["Public Verification"])

_VERIFY_HITS: dict[str, list[datetime]] = {}
_VERIFY_LIMIT = 60
_VERIFY_WINDOW = timedelta(minutes=1)


def _check_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    now = datetime.utcnow()
    recent_hits = [hit for hit in _VERIFY_HITS.get(client_ip, []) if now - hit < _VERIFY_WINDOW]
    if len(recent_hits) >= _VERIFY_LIMIT:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many verification requests. Please try again soon.")
    recent_hits.append(now)
    _VERIFY_HITS[client_ip] = recent_hits


@router.get("/verify/{proof_id}")
async def verify_transaction_proof(proof_id: str, request: Request):
    """Public verification endpoint for QR transaction receipts."""
    _check_rate_limit(request)
    db = get_collection("transaction_proofs").database
    verified = await get_verified_proof(db, proof_id)
    if not verified["valid"]:
        return {
            "valid": False,
            "message": "Could not verify this proof.",
            "payload": None,
        }

    payload = verified["payload"]
    return {
        "valid": True,
        "message": "Verified transaction receipt.",
        "payload": {
            "proof_id": payload["proof_id"],
            "order_id": payload["order_id"],
            "jewel_type": payload["jewel_type"],
            "amount": payload["amount"],
            "currency": payload["currency"],
            "completed_at": payload["completed_at"],
        },
        "notice": "This verifies that a CraftShield transaction record exists and has not been altered. It does not prove the physical jewellery's material authenticity.",
    }

@router.get("/products/{product_id}/design-proof")
async def get_product_design_proof(product_id: str):
    """Publicly retrieve the blockchain verification and design proof details for a product."""
    from bson import ObjectId
    from app.database import get_collection
    
    products_coll = get_collection("products")
    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product ID format")

    product = await products_coll.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if not product.get("blockchain_registered"):
        return {"registered": False}

    from app.services.blockchain import verify_design_onchain
    verified = await verify_design_onchain(product["design_hash"])

    users_coll = products_coll.database["users"]
    artisan = await users_coll.find_one({"_id": product["artisan_id"]})

    explorer_link = None
    if not product.get("blockchain_simulated", False):
        explorer_link = f"https://explore.vechain.org/#/testnet/tx/{product.get('blockchain_tx_id')}"

    return {
        "registered": True,
        "tx_id": product.get("blockchain_tx_id"),
        "block_number": product.get("blockchain_block_number"),
        "artisan_address": product.get("blockchain_artisan_address"),
        "registered_at": product.get("blockchain_registered_at"),
        "design_hash": product.get("design_hash"),
        "simulated": product.get("blockchain_simulated", False),
        "explorer_link": explorer_link,
        "artisan_name": artisan["full_name"] if artisan else "Unknown Artisan",
        "product_name": product["name"],
        "verified_onchain": verified is not None,
        "onchain_details": verified
    }

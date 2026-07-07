import base64
import hashlib
import hmac
import io
import json
import uuid
from datetime import datetime
from typing import Optional

import qrcode
from bson import ObjectId
from fastapi import HTTPException, status

from app.config import settings
from app.utils.serializers import serialize_doc


def _json_default(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, ObjectId):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _payload_bytes(payload: dict) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=_json_default).encode("utf-8")


def build_proof_payload(order: dict) -> dict:
    completed_at = order.get("completed_at") or order.get("updated_at") or datetime.utcnow()
    if isinstance(completed_at, datetime):
        completed_at = completed_at.isoformat()

    return {
        "order_id": str(order["_id"]),
        "client_id": str(order["client_id"]),
        "artisan_id": str(order["artisan_id"]),
        "jewel_type": order.get("jewel_type") or order.get("product_name") or "Custom Jewellery Order",
        "amount": float(order.get("total_amount", 0.0)),
        "currency": order.get("currency", "INR"),
        "completed_at": completed_at,
        "proof_id": str(uuid.uuid4()),
    }


def sign_payload(payload: dict, secret_key: str) -> str:
    return hmac.new(secret_key.encode("utf-8"), _payload_bytes(payload), hashlib.sha256).hexdigest()


def verify_signature(payload: dict, signature: str, secret_key: str) -> bool:
    expected_signature = sign_payload(payload, secret_key)
    return hmac.compare_digest(expected_signature, signature or "")


def generate_qr_image(verify_url: str) -> bytes:
    qr = qrcode.QRCode(version=None, box_size=10, border=4)
    qr.add_data(verify_url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def generate_qr_data_url(verify_url: str) -> str:
    encoded = base64.b64encode(generate_qr_image(verify_url)).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_verify_url(proof_id: str) -> str:
    return f"{settings.PUBLIC_APP_URL.rstrip('/')}/verify/{proof_id}"


async def create_transaction_proof(db, order_id: str) -> dict:
    orders_coll = db["orders"]
    proofs_coll = db["transaction_proofs"]

    try:
        order_oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")

    existing = await proofs_coll.find_one({"order_id": str(order_oid)})
    if existing:
        return serialize_doc(existing)

    order = await orders_coll.find_one({"_id": order_oid})
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.get("status") != "Completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transaction proof is only available for completed orders")

    order = await _enrich_order_for_payload(db, order)
    payload = build_proof_payload(order)
    signature = sign_payload(payload, settings.TRANSACTION_PROOF_SECRET)
    now = datetime.utcnow()
    proof_doc = {
        "proof_id": payload["proof_id"],
        "order_id": payload["order_id"],
        "client_id": payload["client_id"],
        "artisan_id": payload["artisan_id"],
        "jewel_type": payload["jewel_type"],
        "amount": payload["amount"],
        "currency": payload["currency"],
        "completed_at": payload["completed_at"],
        "payload": payload,
        "signature": signature,
        "created_at": now,
    }
    await proofs_coll.insert_one(proof_doc)
    return serialize_doc(proof_doc)


async def get_verified_proof(db, proof_id: str) -> dict:
    proof = await db["transaction_proofs"].find_one({"proof_id": proof_id})
    if not proof:
        return {"valid": False, "payload": None}

    payload = proof.get("payload")
    signature = proof.get("signature")
    valid = bool(payload) and verify_signature(payload, signature, settings.TRANSACTION_PROOF_SECRET)
    return {
        "valid": valid,
        "payload": payload if valid else None,
        "proof_id": proof_id,
        "signature": signature if valid else None,
        "created_at": proof.get("created_at"),
    }


async def get_order_proof_response(db, order_id: str, owner_filter: Optional[dict] = None) -> dict:
    orders_coll = db["orders"]
    try:
        order_oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")

    query = {"_id": order_oid}
    if owner_filter:
        query.update(owner_filter)
    order = await orders_coll.find_one(query)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    proof = await create_transaction_proof(db, order_id)
    verified = await get_verified_proof(db, proof["proof_id"])
    verify_url = build_verify_url(proof["proof_id"])
    return {
        "proof": proof,
        "verification": {"valid": verified["valid"], "payload": verified["payload"]},
        "verify_url": verify_url,
        "qr_image": generate_qr_data_url(verify_url),
    }


async def lookup_proof(db, lookup_value: str) -> dict:
    proofs_coll = db["transaction_proofs"]
    proof = await proofs_coll.find_one({"proof_id": lookup_value})
    if not proof:
        proof = await proofs_coll.find_one({"order_id": lookup_value})
    if not proof:
        return {"found": False, "valid": False, "proof": None}

    verified = await get_verified_proof(db, proof["proof_id"])
    verify_url = build_verify_url(proof["proof_id"])
    return {
        "found": True,
        "valid": verified["valid"],
        "proof": serialize_doc(proof),
        "verify_url": verify_url,
        "qr_image": generate_qr_data_url(verify_url),
    }


async def _enrich_order_for_payload(db, order: dict) -> dict:
    enriched = dict(order)
    if order.get("custom_request_id"):
        request = await db["custom_requests"].find_one({"_id": order["custom_request_id"]})
        if request:
            enriched["jewel_type"] = request.get("jewellery_type") or request.get("description")
    if not enriched.get("jewel_type") and order.get("product_id"):
        product = await db["products"].find_one({"_id": order["product_id"]})
        if product:
            enriched["product_name"] = product.get("name")
    return enriched

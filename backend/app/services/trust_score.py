from __future__ import annotations

from datetime import datetime
from bson import ObjectId


SCORE_EVENTS = {
    "PAYMENT_SUCCESS": 5.0,
    "LATE_PAYMENT": -10.0,
    "ORDER_CANCELLED_24H": 0.0,
    "ORDER_CANCELLED_AFTER_ADVANCE": -10.0,
    "DISPUTE_LOST": -20.0,
    "ORDER_COMPLETED": 2.0,
    "REDEMPTION_STREAK": 15.0,
}

REDEMPTION_STREAK_THRESHOLD = 3


def get_trust_badge(score: float) -> str:
    if score >= 90.0:
        return "Reliable"
    if score >= 70.0:
        return "Good Standing"
    if score >= 50.0:
        return "New / Building History"
    return "Caution"


def get_trust_profile_defaults() -> dict:
    return {
        "trust_score": 100.0,
        "score_history": [],
        "consecutive_good_orders": 0,
    }


def _normalize_profile(profile: dict | None) -> dict:
    normalized = get_trust_profile_defaults()
    if profile:
        normalized.update(profile)
    normalized["trust_score"] = float(normalized.get("trust_score", 100.0))
    normalized["score_history"] = normalized.get("score_history") or []
    normalized["consecutive_good_orders"] = int(normalized.get("consecutive_good_orders", 0))
    return normalized


def get_trust_path_hint(profile: dict | None) -> str:
    normalized = _normalize_profile(profile)
    remaining = max(0, REDEMPTION_STREAK_THRESHOLD - int(normalized.get("consecutive_good_orders", 0)))
    if remaining == 0:
        return "You are on a good streak. Keep going to stay in strong standing."
    if remaining == 1:
        return "Complete 1 more on-time order to boost your standing."
    return f"Complete {remaining} more on-time orders to boost your standing."


async def apply_trust_event(db, client_id: ObjectId, event_type: str, order_id=None, note=None):
    users_coll = db.get_collection("users")
    user = await users_coll.find_one({"_id": client_id})
    if not user:
        return None

    profile = _normalize_profile(user.get("trust_profile"))
    current_score = float(profile.get("trust_score", 100.0))
    consecutive_good_orders = int(profile.get("consecutive_good_orders", 0))
    history = profile.get("score_history") or []

    delta = SCORE_EVENTS.get(event_type, 0.0)
    if delta < 0:
        consecutive_good_orders = 0
    elif event_type in {"PAYMENT_SUCCESS", "ORDER_COMPLETED"}:
        consecutive_good_orders += 1

    new_score = max(0.0, min(100.0, current_score + delta))

    history.append({
        "event_type": event_type,
        "delta": delta,
        "order_id": str(order_id) if order_id else None,
        "note": note or "",
        "created_at": datetime.utcnow(),
        "weight_multiplier": 1.0,
    })

    bonus_applied = False
    if consecutive_good_orders >= REDEMPTION_STREAK_THRESHOLD:
        bonus_delta = SCORE_EVENTS["REDEMPTION_STREAK"]
        new_score = max(0.0, min(100.0, new_score + bonus_delta))
        history.append({
            "event_type": "REDEMPTION_STREAK",
            "delta": bonus_delta,
            "order_id": str(order_id) if order_id else None,
            "note": "Redemption streak bonus after consecutive good orders.",
            "created_at": datetime.utcnow(),
            "weight_multiplier": 1.0,
        })
        consecutive_good_orders = 0
        bonus_applied = True

    updated_profile = {
        "trust_score": new_score,
        "score_history": history,
        "consecutive_good_orders": consecutive_good_orders,
    }

    await users_coll.update_one(
        {"_id": client_id},
        {"$set": {"trust_profile": updated_profile, "updated_at": datetime.utcnow()}}
    )

    return {
        "trust_score": new_score,
        "trust_badge": get_trust_badge(new_score),
        "consecutive_good_orders": consecutive_good_orders,
        "bonus_applied": bonus_applied,
        "path_to_improvement": get_trust_path_hint(updated_profile),
        "score_history": history,
    }

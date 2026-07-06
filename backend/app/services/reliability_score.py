from datetime import datetime, date
from bson import ObjectId

# Named constants for scoring event deltas
SCORE_EVENTS = {
    "ON_TIME_COMPLETION": 2.0,
    "GRACE_WINDOW_DELAY": -3.0,
    "SIGNIFICANT_DELAY": -10.0,
    "SEVERE_DELAY": -20.0,
    "EXTENSION_REQUESTED": 0.0,
    "STREAK_BONUS": 15.0,
}

DELAY_DISCOUNT_RULES = {
    "moderate": 7.5,
    "severe": 17.5,
    "extension_broken_bonus": 5.0,
}

REDEMPTION_STREAK_THRESHOLD = 3


def get_reliability_profile_defaults() -> dict:
    return {
        "reliability_score": 100.0,
        "score_history": [],
        "consecutive_ontime_orders": 0,
    }

def get_reliability_badge(score: float) -> str:
    """Return the badge label based on the numerical reliability score."""
    if score >= 90.0:
        return "Reliable"
    elif score >= 70.0:
        return "Usually On Time"
    elif score >= 50.0:
        return "New / Building History"
    else:
        return "Frequently Delayed"


def get_reliability_path_hint(profile: dict | None) -> str:
    profile = profile or {}
    remaining = max(0, REDEMPTION_STREAK_THRESHOLD - int(profile.get("consecutive_ontime_orders", 0) or 0))
    if remaining == 0:
        return "You are on a strong streak. Keep delivering on time."
    if remaining == 1:
        return "Complete 1 more on-time order to improve this score."
    return f"Complete {remaining} more on-time orders to improve this score."


def calculate_delay_discount(days_late: int, extension_broken: bool) -> float:
    if days_late < 4:
        return 0.0
    if days_late < 10:
        discount = DELAY_DISCOUNT_RULES["moderate"]
    else:
        discount = DELAY_DISCOUNT_RULES["severe"]
    if extension_broken:
        discount += DELAY_DISCOUNT_RULES["extension_broken_bonus"]
    return min(25.0, discount)


def get_reliability_path_hint(profile: dict | None) -> str:
    profile = profile or {}
    remaining = max(0, REDEMPTION_STREAK_THRESHOLD - int(profile.get("consecutive_ontime_orders", 0) or 0))
    if remaining == 0:
        return "You are on a strong streak. Keep delivering on time."
    if remaining == 1:
        return "Complete 1 more on-time order to improve this score."
    return f"Complete {remaining} more on-time orders to improve this score."

async def apply_reliability_event(db, artisan_id: ObjectId, event_type: str, order_id=None, note=None):
    """
    Applies a reliability scoring event to an artisan.
    Clamps the score between 0.0 and 100.0, logs the event in history,
    and updates the consecutive on-time streak tracker.
    """
    users_coll = db.get_collection("users")
    artisan = await users_coll.find_one({"_id": artisan_id})
    if not artisan:
        return None

    # Load or initialize reliability profile
    rel_profile = artisan.get("reliability_profile") or {
        "reliability_score": 100.0,
        "score_history": [],
        "consecutive_ontime_orders": 0
    }

    current_score = float(rel_profile.get("reliability_score", 100.0))
    consecutive_ontime = int(rel_profile.get("consecutive_ontime_orders", 0))
    history = rel_profile.get("score_history") or []

    # Get delta
    delta = SCORE_EVENTS.get(event_type, 0.0)

    # Manage consecutive on-time streak
    if event_type in ["ON_TIME_COMPLETION"]:
        consecutive_ontime += 1
    elif event_type in ["GRACE_WINDOW_DELAY", "SIGNIFICANT_DELAY", "SEVERE_DELAY"]:
        consecutive_ontime = 0

    new_score = current_score + delta
    # Clamp between 0.0 and 100.0
    new_score = max(0.0, min(100.0, new_score))

    # Construct history entry
    history_entry = {
        "event_type": event_type,
        "delta": delta,
        "order_id": str(order_id) if order_id else None,
        "note": note or "",
        "created_at": datetime.utcnow(),
        "weight_multiplier": 1.0
    }
    history.append(history_entry)

    # Check for streak bonus trigger (3 consecutive on-time completions)
    bonus_applied = False
    if consecutive_ontime >= 3:
        consecutive_ontime = 0
        streak_delta = SCORE_EVENTS["STREAK_BONUS"]
        new_score = max(0.0, min(100.0, new_score + streak_delta))
        
        bonus_entry = {
            "event_type": "STREAK_BONUS",
            "delta": streak_delta,
            "order_id": str(order_id) if order_id else None,
            "note": "Streak Bonus: 3 consecutive on-time completions!",
            "created_at": datetime.utcnow(),
            "weight_multiplier": 1.0
        }
        history.append(bonus_entry)
        bonus_applied = True

    # Update database
    await users_coll.update_one(
        {"_id": artisan_id},
        {
            "$set": {
                "reliability_profile": {
                    "reliability_score": new_score,
                    "score_history": history,
                    "consecutive_ontime_orders": consecutive_ontime
                }
            }
        }
    )

    return {
        "reliability_score": new_score,
        "consecutive_ontime_orders": consecutive_ontime,
        "bonus_applied": bonus_applied
    }

async def check_delayed_orders(db):
    """
    Scans in-progress orders, compares current UTC time against their completion deadlines,
    and applies reliability penalties for late orders (exactly once per order).
    """
    orders_coll = db.get_collection("orders")
    
    # Active orders (not Delivered, Completed, Cancelled)
    active_statuses = [
        "Advance Payment Pending",
        "Advance Payment Secured",
        "Design in Progress",
        "Production Started",
        "Work in Progress",
        "Quality Check",
        "Ready for Delivery",
        "Final Payment Pending"
    ]
    
    # Fetch active orders that haven't been penalized yet and have an expected completion date
    cursor = orders_coll.find({
        "status": {"$in": active_statuses},
        "expected_completion_date": {"$ne": None},
        "delay_penalty_applied": {"$ne": True}
    })
    
    now = datetime.utcnow()
    penalized_count = 0
    
    async for order in cursor:
        # Determine the target completion date (extended date overrides expected date)
        target_date = order.get("extended_completion_date") or order.get("expected_completion_date")
        if not target_date:
            continue
            
        # Ensure target_date is a datetime object
        if isinstance(target_date, date) and not isinstance(target_date, datetime):
            target_date = datetime.combine(target_date, datetime.min.time())
            
        if now <= target_date:
            continue  # Order is not delayed yet
            
        # Calculate delay in days
        delay_days = (now - target_date).days
        
        # Decide penalty based on duration
        if delay_days >= 10:
            event_type = "SEVERE_DELAY"
            note = f"Order severely delayed by {delay_days} days past the deadline without approved extension."
        elif delay_days >= 4:
            event_type = "SIGNIFICANT_DELAY"
            note = f"Order significantly delayed by {delay_days} days past the deadline without approved extension."
        else:
            # We don't apply automated grace window checks mid-progress to avoid pre-empting completions
            # within 1-3 days, unless the client/artisan triggers a check or it gets delivered.
            # But if it reaches 4+ days, we definitely penalize.
            continue
            
        # Apply the reliability penalty
        artisan_id = ObjectId(order["artisan_id"])
        await apply_reliability_event(
            db=db,
            artisan_id=artisan_id,
            event_type=event_type,
            order_id=order["_id"],
            note=note
        )
        
        # Mark order as penalized to prevent double penalty
        await orders_coll.update_one(
            {"_id": order["_id"]},
            {"$set": {"delay_penalty_applied": True}}
        )
        penalized_count += 1
        
    return penalized_count


def get_client_trust_badge(score: float) -> str:
    """Return the badge label based on the numerical client trust score."""
    if score >= 90.0:
        return "Highly Trustworthy"
    elif score >= 70.0:
        return "Good Standing"
    else:
        return "Under Review"


async def apply_client_trust_event(db, client_id: ObjectId, event_type: str, order_id=None, note=None):
    """
    Applies a trust scoring event to a client.
    Clamps the score between 0.0 and 100.0, logs the event in history,
    and updates counters.
    """
    users_coll = db.get_collection("users")
    client = await users_coll.find_one({"_id": client_id})
    if not client:
        return None

    # Load or initialize trust profile
    trust_profile = client.get("trust_profile") or {
        "trust_score": 100.0,
        "late_payments": 0,
        "cancelled_orders": 0,
        "completed_payments": 0,
        "score_history": []
    }

    current_score = float(trust_profile.get("trust_score", 100.0))
    history = trust_profile.get("score_history") or []

    # Get delta
    events = {
        "PAYMENT_SUCCESS": 5.0,
        "LATE_PAYMENT": -10.0,
        "ORDER_CANCELLED_24H": -5.0,
        "DISPUTE_LOST": -20.0,
        "ORDER_COMPLETED": 2.0
    }

    delta = events.get(event_type, 0.0)
    new_score = max(0.0, min(100.0, current_score + delta))

    # Update counters
    late_payments = trust_profile.get("late_payments", 0)
    cancelled_orders = trust_profile.get("cancelled_orders", 0)
    completed_payments = trust_profile.get("completed_payments", 0)

    if event_type == "LATE_PAYMENT":
        late_payments += 1
    elif event_type == "ORDER_CANCELLED_24H":
        cancelled_orders += 1
    elif event_type == "PAYMENT_SUCCESS":
        completed_payments += 1

    # Record history
    history_entry = {
        "event_type": event_type,
        "delta": delta,
        "order_id": str(order_id) if order_id else None,
        "note": note or "",
        "created_at": datetime.utcnow()
    }
    history.append(history_entry)

    # Save
    await users_coll.update_one(
        {"_id": client_id},
        {
            "$set": {
                "trust_profile": {
                    "trust_score": new_score,
                    "late_payments": late_payments,
                    "cancelled_orders": cancelled_orders,
                    "completed_payments": completed_payments,
                    "score_history": history
                }
            }
        }
    )


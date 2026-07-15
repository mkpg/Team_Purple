import os
import re
import logging
import requests
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId
from app.dependencies import get_current_user
from app.database import get_collection
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice-assistant", tags=["voice-assistant"])

class VoiceAskRequest(BaseModel):
    message: str
    lang: Optional[str] = "en"

class VoiceAskResponse(BaseModel):
    reply: str
    source: str = "sarvam"

def clean_msg(msg: str) -> str:
    return msg.strip().lower()

async def get_db_context(user: dict) -> str:
    """Gather real database context for the logged-in user to feed into the prompt."""
    user_id = user["_id"]
    role = user["role"]
    username = user["username"]
    fullname = user.get("full_name", "User")
    
    orders_coll = get_collection("orders")
    requests_coll = get_collection("custom_requests")
    profiles_coll = get_collection("artisan_profiles")
    
    context_lines = [
        f"User Profile: Name: {fullname}, Username: {username}, Role: {role}."
    ]
    
    # Fetch active orders
    if role == "client":
        orders = await orders_coll.find({"client_id": user_id}).sort("updated_at", -1).to_list(length=3)
        requests = await requests_coll.find({"client_id": user_id}).sort("created_at", -1).to_list(length=3)
    else:
        orders = await orders_coll.find({"artisan_id": user_id}).sort("updated_at", -1).to_list(length=3)
        requests = await requests_coll.find({"artisan_id": user_id}).sort("created_at", -1).to_list(length=3)
        
    if orders:
        context_lines.append("Active/Recent Orders:")
        for o in orders:
            artisan_profile = await profiles_coll.find_one({"user_id": o["artisan_id"]})
            art_name = artisan_profile.get("business_name") if artisan_profile else "Unknown Artisan"
            context_lines.append(
                f"- Order ID: {str(o['_id'])}, Status: {o['status']}, Total Amount: {o['total_amount']}, Advance: {o['advance_amount']}, Final: {o['final_amount']}, Artisan Studio: {art_name}."
            )
    else:
        context_lines.append("No active orders found in the ledger database.")
        
    if requests:
        context_lines.append("Recent Custom Requests:")
        for r in requests:
            context_lines.append(
                f"- Custom Request ID: {str(r['_id'])}, Category: {r['jewellery_type']}, Status: {r['status']}, Budget: {r['budget']}."
            )
            
    return "\n".join(context_lines)

@router.post("/ask", response_model=VoiceAskResponse)
async def ask_assistant(req: VoiceAskRequest, current_user: dict = Depends(get_current_user)):
    """Exclusively calls Sarvam AI chat completions to respond in regional languages."""
    query = req.message
    lang = req.lang or "en"
    if not query.strip():
        return VoiceAskResponse(reply="Please type something, I am listening.", source="sarvam")
        
    # Gather database context
    db_context = await get_db_context(current_user)
    
    system_prompt = (
        "You are Antigravity, the AI chat assistant for CraftShield, a secure jewellery marketplace.\n"
        "CraftShield features a Safe Payment Vault (escrow payments where the artisan decides the advance safe deposit amount, with a recommended minimum of 30% of the total price), "
        "artisan design registry on the VeChain blockchain, and zero-trust DigiLocker KYC.\n\n"
        "You MUST automatically detect the language of the user's query and formulate your entire response in that same language "
        "(e.g., respond in Tamil if the query is in Tamil, in Telugu if Telugu, in Kannada if Kannada, "
        "in Malayalam if Malayalam, and in English if English). Translate any database context details to match that language. "
        "Keep your response concise and under 3 sentences.\n\n"
        "CRITICAL RULES:\n"
        "1. Never output long 24-character hexadecimal database IDs or ObjectIDs (e.g., '6a5755dee581277b0e36b940') in your text. "
        "Instead, reference them by their last 4 characters (e.g., 'ஆர்டர் #b940' or 'Order #b940') or just say 'your recent order'.\n\n"
        f"Context:\n{db_context}\n\n"
        f"Query: {query}"
    )

    sarvam_key = settings.SARVAM_API_KEY
    if not sarvam_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sarvam AI API key is missing. Please add SARVAM_API_KEY to your .env file."
        )

    try:
        url = "https://api.sarvam.ai/v1/chat/completions"
        model_name = settings.SARVAM_MODEL or "sarvam-30b"
        headers = {
            "api-subscription-key": sarvam_key,
            "Content-Type": "application/json"
        }
        payload = {
            "model": model_name,
            "reasoning_effort": None,
            "messages": [
                {"role": "user", "content": system_prompt}
            ]
        }
        r = requests.post(url, json=payload, headers=headers, timeout=25.0)
        logger.info(f"Sarvam AI response code: {r.status_code}, body: {r.text}")
        
        if r.status_code == 200:
            res_data = r.json()
            reply_text = res_data["choices"][0]["message"]["content"]
            if reply_text:
                return VoiceAskResponse(reply=reply_text.strip(), source="sarvam")
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Sarvam AI response did not contain text content (choices.message.content is null)."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Sarvam AI API failed with status {r.status_code}: {r.text}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Sarvam AI API execution failed:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Server Error while calling Sarvam AI: {str(e)}"
        )

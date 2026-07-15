from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from bson import ObjectId
from app.dependencies import get_current_user
from app.database import get_collection

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

class SendMessageRequest(BaseModel):
    recipient_id: str
    message: str
    order_id: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    recipient_id: str
    message: str
    order_id: Optional[str]
    timestamp: datetime
    read: bool

def serialize_message(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "sender_id": str(doc["sender_id"]),
        "recipient_id": str(doc["recipient_id"]),
        "message": doc["message"],
        "order_id": str(doc["order_id"]) if doc.get("order_id") else None,
        "timestamp": doc["timestamp"],
        "read": doc.get("read", False)
    }

@router.post("/send", response_model=MessageResponse)
async def send_message(req: SendMessageRequest, current_user: dict = Depends(get_current_user)):
    chats_coll = get_collection("chats")
    users_coll = get_collection("users")
    
    sender_id = str(current_user["_id"])
    recipient_id = req.recipient_id
    
    if sender_id == recipient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send message to yourself."
        )
        
    # Verify recipient exists
    try:
        recipient = await users_coll.find_one({"_id": ObjectId(recipient_id)})
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipient not found."
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recipient ID format."
        )

    msg_doc = {
        "sender_id": ObjectId(sender_id),
        "recipient_id": ObjectId(recipient_id),
        "message": req.message,
        "order_id": ObjectId(req.order_id) if req.order_id else None,
        "timestamp": datetime.utcnow(),
        "read": False
    }
    
    res = await chats_coll.insert_one(msg_doc)
    msg_doc["_id"] = res.inserted_id
    
    serialized = serialize_message(msg_doc)
    
    # Push live updates to sender and recipient if connected
    await manager.send_personal_message({"type": "NEW_MESSAGE", "message": serialized}, sender_id)
    await manager.send_personal_message({"type": "NEW_MESSAGE", "message": serialized}, recipient_id)
    
    return serialized

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)

@router.get("/messages/{other_user_id}", response_model=List[MessageResponse])
async def get_messages(other_user_id: str, current_user: dict = Depends(get_current_user)):
    chats_coll = get_collection("chats")
    user_id = str(current_user["_id"])
    
    try:
        uid = ObjectId(user_id)
        other_uid = ObjectId(other_user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format."
        )
        
    # Mark incoming messages as read
    await chats_coll.update_many(
        {"sender_id": other_uid, "recipient_id": uid, "read": False},
        {"$set": {"read": True}}
    )
        
    cursor = chats_coll.find({
        "$or": [
            {"sender_id": uid, "recipient_id": other_uid},
            {"sender_id": other_uid, "recipient_id": uid}
        ]
    }).sort("timestamp", 1)
    
    docs = await cursor.to_list(length=500)
    return [serialize_message(doc) for doc in docs]

@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    chats_coll = get_collection("chats")
    users_coll = get_collection("users")
    user_id = str(current_user["_id"])
    uid = ObjectId(user_id)
    
    # Run aggregation to find unique chat users
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"sender_id": uid},
                    {"recipient_id": uid}
                ]
            }
        },
        {
            "$sort": {"timestamp": -1}
        },
        {
            "$group": {
                "_id": {
                    "$cond": [
                        {"$eq": ["$sender_id", uid]},
                        "$recipient_id",
                        "$sender_id"
                    ]
                },
                "last_message": {"$first": "$message"},
                "timestamp": {"$first": "$timestamp"},
                "unread_count": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$recipient_id", uid]},
                                {"$eq": ["$read", False]}
                            ]},
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]
    
    results = await chats_coll.aggregate(pipeline).to_list(length=100)
    conversations = []
    
    for res in results:
        other_id = res["_id"]
        other_user = await users_coll.find_one({"_id": other_id})
        if other_user:
            # Check if artisan has profile
            business_name = other_user.get("full_name")
            if other_user.get("role") == "artisan":
                art_profile = await get_collection("artisan_profiles").find_one({"user_id": other_id})
                if art_profile:
                    business_name = art_profile.get("business_name") or other_user.get("full_name")
                    
            conversations.append({
                "other_user_id": str(other_id),
                "other_user_name": other_user.get("full_name"),
                "other_user_username": other_user.get("username"),
                "other_user_role": other_user.get("role"),
                "business_name": business_name,
                "last_message": res["last_message"],
                "timestamp": res["timestamp"],
                "unread_count": res["unread_count"]
            })
            
    # Sort conversations by latest message timestamp descending
    conversations.sort(key=lambda x: x["timestamp"], reverse=True)
    return conversations

@router.get("/contacts")
async def get_contacts(current_user: dict = Depends(get_current_user)):
    users_coll = get_collection("users")
    artisan_profiles = get_collection("artisan_profiles")
    user_id = str(current_user["_id"])
    role = current_user.get("role")
    
    contacts = []
    
    # Clients see all verified artisans. Artisans see all clients who placed custom requests or orders. Admin sees everyone.
    if role == "client":
        # Get all verified artisans
        cursor = artisan_profiles.find({"verification_status": "verified"})
        profiles = await cursor.to_list(length=100)
        for p in profiles:
            u = await users_coll.find_one({"_id": p["user_id"]})
            if u:
                contacts.append({
                    "id": str(u["_id"]),
                    "name": u.get("full_name"),
                    "business_name": p.get("business_name") or u.get("full_name"),
                    "role": "artisan"
                })
    else:
        # Artisans and Admins see all clients
        cursor = users_coll.find({"role": "client"})
        clients = await cursor.to_list(length=100)
        for c in clients:
            contacts.append({
                "id": str(c["_id"]),
                "name": c.get("full_name"),
                "business_name": c.get("full_name"),
                "role": "client"
            })
            
    return contacts

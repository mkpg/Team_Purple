from datetime import datetime
from fastapi import HTTPException, status
from bson import ObjectId
from app.database import get_collection
from app.utils.serializers import serialize_doc

class OrderService:
    @staticmethod
    async def create_order_from_quotation(quotation_id_str: str, client_id_str: str) -> dict:
        """Create a new Order when a client accepts a quotation."""
        quotations_coll = get_collection("quotations")
        orders_coll = get_collection("orders")
        requests_coll = get_collection("custom_requests")
        
        # 1. Fetch and validate quotation
        try:
            quot_oid = ObjectId(quotation_id_str)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid quotation ID format")
            
        quotation = await quotations_coll.find_one({"_id": quot_oid})
        if not quotation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
            
        if str(quotation["client_id"]) != client_id_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You can only accept quotations addressed to you"
            )
            
        if quotation["status"] != "sent":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Quotation cannot be accepted because its status is '{quotation['status']}'"
            )
            
        # 2. Update quotation status to accepted
        await quotations_coll.update_one({"_id": quot_oid}, {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}})
        
        # 3. Reject other quotations for the same request
        req_oid = quotation["custom_request_id"]
        await quotations_coll.update_many(
            {"custom_request_id": req_oid, "_id": {"$ne": quot_oid}, "status": "sent"},
            {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
        )
        
        # 4. Update the Custom Request status to accepted
        await requests_coll.update_one({"_id": req_oid}, {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}})
        
        # 5. Create Order
        total_amount = quotation["quoted_amount"]
        advance_amount = quotation["advance_amount"]
        final_amount = total_amount - advance_amount
        
        new_order = {
            "client_id": ObjectId(client_id_str),
            "artisan_id": quotation["artisan_id"],
            "custom_request_id": req_oid,
            "quotation_id": quot_oid,
            "product_id": None,
            "total_amount": total_amount,
            "advance_amount": advance_amount,
            "final_amount": final_amount,
            "status": "Advance Payment Pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        res = await orders_coll.insert_one(new_order)
        new_order["_id"] = res.inserted_id
        
        return serialize_doc(new_order)

    @staticmethod
    async def update_order_status(order_id_str: str, new_status: str, user: dict) -> dict:
        """Update the status of an order based on role and business rules."""
        orders_coll = get_collection("orders")
        payments_coll = get_collection("payments")
        
        try:
            order_oid = ObjectId(order_id_str)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")
            
        order = await orders_coll.find_one({"_id": order_oid})
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
            
        user_id_str = str(user["_id"])
        role = user["role"]
        current_status = order["status"]
        
        # Permissions validation
        if role == "client" and str(order["client_id"]) != user_id_str:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this order")
        elif role == "artisan" and str(order["artisan_id"]) != user_id_str:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to this order")
            
        # Business Logic Transition Rules
        
        # Rule 1: Advance payment must be secured before starting work
        production_statuses = {
            "Design in Progress", 
            "Production Started", 
            "Work in Progress", 
            "Quality Check", 
            "Ready for Delivery"
        }
        
        if new_status in production_statuses:
            if role != "artisan" and role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the artisan can update production status"
                )
            # Check if advance payment is secured
            # If advance amount is 0, we can skip payment requirement
            if order["advance_amount"] > 0:
                advance_payment = await payments_coll.find_one({
                    "order_id": order_oid,
                    "payment_type": "advance",
                    "status": "secured"
                })
                if not advance_payment and current_status != "Advance Payment Secured":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Production cannot start until the advance payment is marked as secured"
                    )

        # Rule 2: Deliver order
        if new_status == "Delivered":
            if role != "artisan" and role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the artisan can deliver the order"
                )
            # Verify final payment is paid
            if order["final_amount"] > 0:
                final_payment = await payments_coll.find_one({
                    "order_id": order_oid,
                    "payment_type": "final",
                    "status": "paid"
                })
                if not final_payment:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Order cannot be delivered until the final payment is marked as paid"
                    )

        # Rule 3: Client confirms order completion
        if new_status == "Completed":
            if role != "client" and role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the client can confirm order completion"
                )
            if current_status != "Delivered":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Order can only be marked as completed after it is delivered"
                )

        # Rule 4: Client or artisan cancels
        if new_status == "Cancelled":
            if current_status in {"Delivered", "Completed", "Cancelled", "Disputed"}:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Order cannot be cancelled from state: {current_status}"
                )

        # Perform update
        await orders_coll.update_one(
            {"_id": order_oid},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
        )
        order["status"] = new_status
        order["updated_at"] = datetime.utcnow()
        
        return serialize_doc(order)

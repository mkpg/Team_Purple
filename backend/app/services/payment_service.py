from datetime import datetime
from fastapi import HTTPException, status
from bson import ObjectId
from app.database import get_collection, get_database
from app.utils.serializers import serialize_doc
from app.services.trust_score import apply_trust_event

class PaymentService:
    @staticmethod
    async def create_advance_payment(order_id_str: str, client_id_str: str, transaction_ref: str) -> dict:
        """Create a mock advance payment and update order status to 'Advance Payment Secured'."""
        orders_coll = get_collection("orders")
        payments_coll = get_collection("payments")
        
        try:
            order_oid = ObjectId(order_id_str)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")
            
        order = await orders_coll.find_one({"_id": order_oid})
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
            
        if str(order["client_id"]) != client_id_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You cannot make payments for this order"
            )
            
        if order["status"] != "Advance Payment Pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Cannot submit advance payment when order status is '{order['status']}'"
            )
            
        # Create mock payment
        payment_doc = {
            "order_id": order_oid,
            "client_id": ObjectId(client_id_str),
            "artisan_id": order["artisan_id"],
            "payment_type": "advance",
            "amount": order["advance_amount"],
            "status": "secured",  # Secure it immediately for mock flow
            "transaction_reference": transaction_ref,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        res = await payments_coll.insert_one(payment_doc)
        payment_doc["_id"] = res.inserted_id
        
        # Update order status to Advance Payment Secured
        await orders_coll.update_one(
            {"_id": order_oid},
            {"$set": {"status": "Advance Payment Secured", "updated_at": datetime.utcnow()}}
        )

        await apply_trust_event(
            db=get_database(),
            client_id=ObjectId(client_id_str),
            event_type="PAYMENT_SUCCESS",
            order_id=order_oid,
            note="Advance payment secured successfully."
        )
        
        return serialize_doc(payment_doc)

    @staticmethod
    async def create_final_payment(order_id_str: str, client_id_str: str, transaction_ref: str) -> dict:
        """Create a mock final payment and update order status to 'Final Payment Pending'."""
        orders_coll = get_collection("orders")
        payments_coll = get_collection("payments")
        
        try:
            order_oid = ObjectId(order_id_str)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")
            
        order = await orders_coll.find_one({"_id": order_oid})
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
            
        if str(order["client_id"]) != client_id_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You cannot make payments for this order"
            )
            
        # The final payment should be made when order reaches "Ready for Delivery" or "Final Payment Pending"
        if order["status"] not in ["Ready for Delivery", "Final Payment Pending"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Cannot submit final payment when order status is '{order['status']}'. It must be 'Ready for Delivery'."
            )
            
        # Create mock payment
        payment_doc = {
            "order_id": order_oid,
            "client_id": ObjectId(client_id_str),
            "artisan_id": order["artisan_id"],
            "payment_type": "final",
            "amount": order["final_amount"],
            "status": "paid",  # Paid immediately for mock flow
            "transaction_reference": transaction_ref,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        res = await payments_coll.insert_one(payment_doc)
        payment_doc["_id"] = res.inserted_id
        
        # Update order status to Final Payment Pending
        await orders_coll.update_one(
            {"_id": order_oid},
            {"$set": {"status": "Final Payment Pending", "updated_at": datetime.utcnow()}}
        )

        await apply_trust_event(
            db=get_database(),
            client_id=ObjectId(client_id_str),
            event_type="PAYMENT_SUCCESS",
            order_id=order_oid,
            note="Final payment secured successfully."
        )
        
        return serialize_doc(payment_doc)

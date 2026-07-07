from datetime import datetime
from fastapi import HTTPException, status
from bson import ObjectId
from app.database import get_collection, get_database
from datetime import datetime
from fastapi import HTTPException, status
from bson import ObjectId
from app.database import get_collection, get_database
from app.utils.serializers import serialize_doc
from app.services.trust_score import apply_trust_event
from app.services.reliability_score import apply_reliability_event
from app.services.transaction_proof import create_transaction_proof

class OrderService:
    @staticmethod
    async def create_order_from_quotation(quotation_id_str: str, client_id_str: str, signed_by: str = None) -> dict:
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
            
        # Check if an order has already been created for this quotation to prevent race conditions
        existing_order = await orders_coll.find_one({"quotation_id": quot_oid})
        if existing_order:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An order has already been created for this quotation"
            )
            
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
            "expected_completion_date": quotation.get("expected_completion_date") or quotation.get("estimated_delivery_date"),
            "extended_completion_date": None,
            "delay_penalty_applied": False,
            "delay_status": None,
            "delay_discount_percent": None,
            "delay_resolution": None,
            "status": "Advance Payment Pending",
            "contract_signed": True,
            "contract_signed_by": signed_by or "Client",
            "contract_signed_at": datetime.utcnow(),
            "contract_terms": "This custom jewellery commission agreement binds the Client and the Artisan. The artisan agrees to handcraft the jewellery piece according to specified design. The client agrees to secure the advance deposit. Once the artisan commences production, the deposit is strictly non-refundable.",
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
        update_fields = {"status": new_status, "updated_at": datetime.utcnow()}
        if new_status == "Completed":
            update_fields["completed_at"] = update_fields["updated_at"]

        await orders_coll.update_one(
            {"_id": order_oid},
            {"$set": update_fields}
        )
        order["status"] = new_status
        order.update(update_fields)

        if new_status == "Completed" and role == "client":
            completion_deadline = order.get("extended_completion_date") or order.get("expected_completion_date")
            if completion_deadline and datetime.utcnow() <= completion_deadline:
                await apply_reliability_event(
                    db=get_database(),
                    artisan_id=order["artisan_id"],
                    event_type="ON_TIME_COMPLETION",
                    order_id=order_oid,
                    note="Order completed on or before the deadline."
                )
            await apply_trust_event(
                db=get_database(),
                client_id=order["client_id"],
                event_type="ORDER_COMPLETED",
                order_id=order_oid,
                note="Client confirmed successful delivery."
            )
            await create_transaction_proof(get_database(), order_id_str)
        
        return serialize_doc(order)

    @staticmethod
    async def cancel_order_by_client(order_id_str: str, client_id_str: str) -> dict:
        """Allow client to cancel the order within 24 hours of creation, refunding 50% of the advance if paid, and only if production hasn't started."""
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
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this order")
            
        if order["status"] == "Cancelled":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order is already cancelled")
            
        # Protect artisan from cancellation after production has commenced
        production_commenced_statuses = {
            "Design in Progress", 
            "Production Started", 
            "Work in Progress", 
            "Quality Check", 
            "Ready for Delivery", 
            "Final Payment Pending",
            "Delivered", 
            "Completed", 
            "Disputed"
        }
        if order["status"] in production_commenced_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Cancellation is not allowed after the artisan has commenced production (Current status: '{order['status']}') to protect material and labor costs."
            )
            
        # Enforce 24 hours cancellation limit
        time_diff = datetime.utcnow() - order["created_at"]
        if time_diff.total_seconds() > 24 * 3600:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Orders can only be cancelled within 24 hours of booking"
            )
            
        # Check if advance payment has been secured
        advance_payment = await payments_coll.find_one({
            "order_id": order_oid,
            "payment_type": "advance",
            "status": "secured"
        })
        
        repaid_amount = 0.0
        if advance_payment and order["advance_amount"] > 0:
            repaid_amount = order["advance_amount"] * 0.5
            refund_doc = {
                "order_id": order_oid,
                "client_id": ObjectId(client_id_str),
                "artisan_id": order["artisan_id"],
                "payment_type": "refund",
                "amount": repaid_amount,
                "status": "repaid",
                "transaction_reference": f"REFUND-{order_id_str[:8].upper()}-{int(datetime.utcnow().timestamp())}",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await payments_coll.insert_one(refund_doc)

            await apply_trust_event(
                db=get_database(),
                client_id=ObjectId(client_id_str),
                event_type="ORDER_CANCELLED_AFTER_ADVANCE",
                order_id=order_oid,
                note="Client cancelled after advance payment was secured."
            )
        else:
            await apply_trust_event(
                db=get_database(),
                client_id=ObjectId(client_id_str),
                event_type="ORDER_CANCELLED_24H",
                order_id=order_oid,
                note="Client cancelled before advance payment was secured."
            )
            
        # Cancel order
        await orders_coll.update_one(
            {"_id": order_oid},
            {"$set": {
                "status": "Cancelled", 
                "refunded_amount": repaid_amount,
                "updated_at": datetime.utcnow()
            }}
        )
        
        order["status"] = "Cancelled"
        order["refunded_amount"] = repaid_amount
        order["updated_at"] = datetime.utcnow()
        
        return serialize_doc(order)

    @staticmethod
    async def auto_release_order_payment(order_id_str: str) -> dict:
        """Simulate the automatic release of final payment after 3 days of delivery (escrow auto-release)."""
        orders_coll = get_collection("orders")
        try:
            order_oid = ObjectId(order_id_str)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")
            
        order = await orders_coll.find_one({"_id": order_oid})
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
            
        if order["status"] != "Delivered":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Order must be in 'Delivered' state to auto-release payment. Current status: '{order['status']}'"
            )
            
        # Perform auto-release: mark as Completed by system
        users_coll = get_collection("users")
        client_user = await users_coll.find_one({"_id": order["client_id"]})
        if not client_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client user not found")
            
        # Update with auto-release metadata
        await orders_coll.update_one(
            {"_id": order_oid},
            {"$set": {"auto_released": True, "auto_released_at": datetime.utcnow()}}
        )
        
        # Update order status to Completed using client context
        return await OrderService.update_order_status(order_id_str, "Completed", client_user)

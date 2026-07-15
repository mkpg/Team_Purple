import asyncio
from app.database import get_collection

async def reset_db():
    coll = get_collection('products')
    
    # Delete the test bowls
    res = await coll.delete_many({"name": {"$in": ["a1", "a2", "1a1aa", "a2a2a2a2a2a2", "asdefg", "kjhgf", "sadfg", "dsfghjm", "bowl"]}})
    print(f"Deleted {res.deleted_count} test bowls from the database.")
    
    # Unset blockchain status so buttons reappear
    res2 = await coll.update_many({}, {"$unset": {"blockchain_registered": "", "blockchain_tx_id": "", "blockchain_block_number": "", "ai_embedding": ""}})
    print(f"Reset blockchain status on {res2.modified_count} products.")

asyncio.run(reset_db())

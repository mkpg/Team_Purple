import asyncio
from app.database import get_collection

async def clean():
    coll = get_collection('products')
    res = await coll.update_many({}, {'$unset': {'ai_embedding': ''}})
    print(f"Successfully wiped old AI embeddings from {res.modified_count} products!")

asyncio.run(clean())

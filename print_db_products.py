import os
import sys
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.craftshield
    
    print("\n==================================================================================")
    print("                      CRAFTSHIELD MONGODB PRODUCTS AUDIT")
    print("==================================================================================\n")
    
    # Query all products
    cursor = db.products.find({})
    products = await cursor.to_list(length=100)
    
    if not products:
        print("❌ No products found in your database. Register a product first!")
        return
        
    print(f"Total products in 'products' collection: {len(products)}\n")
    for i, p in enumerate(products, 1):
        print(f"{i}. Product: {p.get('name')}")
        print(f"   ID:             {p.get('_id') or p.get('id')}")
        print(f"   Category:       {p.get('category')}")
        print(f"   Price:          INR {p.get('price')}")
        print(f"   Design Hash:    {p.get('design_hash') or 'Not Registered'}")
        print(f"   Perceptual Hash: {p.get('phash') or 'Not Registered'}")
        print(f"   Blockchain Tx:  {p.get('tx_id') or 'Not Registered'}")
        print(f"   Block Number:   {p.get('block_number') or 'Not Registered'}")
        print("-" * 82)

if __name__ == "__main__":
    asyncio.run(main())

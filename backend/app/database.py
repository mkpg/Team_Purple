import logging
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.config import settings
from app.utils.security import get_password_hash

logger = logging.getLogger(__name__)

client = None
db = None

def get_database():
    """Returns the database client instance, initializing it if necessary."""
    global client, db
    if client is None:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.DATABASE_NAME]
    return db

def get_collection(name: str):
    """Returns a collection from the database."""
    database = get_database()
    return database[name]

async def seed_database():
    """Seed default database data: admin account, verified artisans, and products."""
    database = get_database()
    
    # 1. Seed Admin
    users_coll = database["users"]
    admin_exists = await users_coll.find_one({"role": "admin"})
    if not admin_exists:
        admin_user = {
            "full_name": "CraftShield Administrator",
            "username": "admin",
            "email": "admin@craftshield.com",
            "phone_number": "+1234567890",
            "password_hash": get_password_hash("1234"),
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await users_coll.insert_one(admin_user)
        logger.info("Admin account seeded successfully (admin / 1234)")
    else:
        logger.info("Admin account already exists")

    # 2. Seed Verified Artisans and Profiles
    artisan_profiles_coll = database["artisan_profiles"]
    artisan_count = await users_coll.count_documents({"role": "artisan"})
    
    if artisan_count == 0:
        # Create user accounts for artisans
        artisan_data = [
            {
                "full_name": "Aurelia Sterling",
                "username": "aurelia_gold",
                "email": "aurelia@sterlingdesigns.com",
                "phone_number": "+1987654321",
                "password": "password123",
                "business_name": "Sterling Gold & Diamond Studio",
                "jewellery_specialization": "Filigree & Diamond Settings",
                "location": "New York, USA",
                "profile_description": "Master artisan specializing in bespoke handcrafted diamond rings and intricate gold filigree work with over 15 years of experience."
            },
            {
                "full_name": "Hiroshi Tanaka",
                "username": "tanaka_metals",
                "email": "hiroshi@tanaka.com",
                "phone_number": "+8130987654",
                "password": "password123",
                "business_name": "Tanaka Fine Metalworks",
                "jewellery_specialization": "Platinum Casting & Mokume-gane",
                "location": "Kyoto, Japan",
                "profile_description": "Crafting fine platinum wedding bands and traditional Japanese mokume-gane layered metal jewelry."
            }
        ]

        seeded_artisan_ids = []
        for art in artisan_data:
            user_doc = {
                "full_name": art["full_name"],
                "username": art["username"],
                "email": art["email"],
                "phone_number": art["phone_number"],
                "password_hash": get_password_hash(art["password"]),
                "role": "artisan",
                "is_active": True,
                "reliability_profile": {
                    "reliability_score": 100.0,
                    "score_history": [],
                    "consecutive_ontime_orders": 0
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            res = await users_coll.insert_one(user_doc)
            user_id = res.inserted_id
            
            # Create artisan profile
            profile_doc = {
                "user_id": user_id,
                "business_name": art["business_name"],
                "jewellery_specialization": art["jewellery_specialization"],
                "location": art["location"],
                "profile_description": art["profile_description"],
                "verification_status": "verified",
                "verified_by": "admin",
                "verified_at": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await artisan_profiles_coll.insert_one(profile_doc)
            seeded_artisan_ids.append(user_id)
            logger.info(f"Seeded verified artisan: {art['full_name']}")

        # 3. Seed Jewellery Products
        products_coll = database["products"]
        prod_count = await products_coll.count_documents({})
        if prod_count == 0 and len(seeded_artisan_ids) >= 2:
            products_data = [
                {
                    "artisan_id": seeded_artisan_ids[0],
                    "name": "Bespoke Rose Gold Filigree Ring",
                    "description": "Exquisite 18k rose gold ring featuring handcrafted filigree details and a conflict-free brilliant-cut diamond center stone.",
                    "category": "Ring",
                    "price": 1850.00,
                    "material": "18k Rose Gold, Diamond",
                    "image_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e",
                    "estimated_delivery_days": 14,
                    "is_active": True
                },
                {
                    "artisan_id": seeded_artisan_ids[0],
                    "name": "Handmade Royal Emerald Pendant",
                    "description": "An elegant 18k yellow gold pendant hosting a pear-shaped natural emerald surrounded by micro-pavé diamonds.",
                    "category": "Pendant",
                    "price": 2400.00,
                    "material": "18k Yellow Gold, Emerald, Diamond",
                    "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f",
                    "estimated_delivery_days": 10,
                    "is_active": True
                },
                {
                    "artisan_id": seeded_artisan_ids[1],
                    "name": "Traditional Mokume-Gane Wedding Band",
                    "description": "Individually patterned band using traditional Japanese layering of white gold, silver, and palladium.",
                    "category": "Band",
                    "price": 1450.00,
                    "material": "White Gold, Sterling Silver, Palladium",
                    "image_url": "https://images.unsplash.com/photo-1603561591411-07134e71a2a9",
                    "estimated_delivery_days": 21,
                    "is_active": True
                }
            ]
            
            for prod in products_data:
                prod_doc = {
                    "artisan_id": prod["artisan_id"],
                    "name": prod["name"],
                    "description": prod["description"],
                    "category": prod["category"],
                    "price": prod["price"],
                    "material": prod["material"],
                    "image_url": prod["image_url"],
                    "estimated_delivery_days": prod["estimated_delivery_days"],
                    "is_active": prod["is_active"],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                await products_coll.insert_one(prod_doc)
            logger.info("Seeded default jewellery products")

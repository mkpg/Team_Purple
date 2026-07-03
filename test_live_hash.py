import os
import sys
import asyncio
import hashlib

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from app.services.blockchain import (
    build_design_bundle,
    compute_design_hash,
    register_design_onchain,
    verify_design_onchain
)
from app.config import settings

async def main():
    print("--- Cryptographic Hashing Phase ---")
    image_bytes = b"fakedesignimagedata_royal_emerald_ring"
    product_title = "Royal Emerald Ring"
    description = "Exquisite 18k yellow gold emerald ring."
    artisan_id = "artisan_tester_123"
    upload_timestamp = "2026-07-03T06:45:00Z"
    
    # 1. Hashing the design bundle
    bundle = build_design_bundle(image_bytes, product_title, description, artisan_id, upload_timestamp)
    design_hash = compute_design_hash(bundle)
    print(f"Generated cryptographic hash: {design_hash}")
    print("-> Cryptographic linkage completed locally successfully!")
    
    print("\n--- On-Chain Registration Phase ---")
    print(f"Submitting transaction payload to VeChain Testnet RPC ({settings.VECHAIN_NODE_URL})...")
    
    # 2. Register on-chain
    try:
        reg_result = await register_design_onchain(
            design_hash=design_hash,
            artisan_id=artisan_id,
            product_id="prod_test_098",
            image_url="https://example.com/emerald.jpg"
        )
        print("✔ Transaction successfully sent!")
        print(f"Transaction ID (TxID): {reg_result['tx_id']}")
        print(f"Artisan Wallet Address: {reg_result['artisan_address']}")
        print(f"Status: {reg_result['status']}")
        
        print("\n--- On-Chain Verification Phase (Read Verification) ---")
        print("Querying contract to verify design existence...")
        verification = await verify_design_onchain(design_hash)
        
        if verification:
            print("✔ VERIFICATION SUCCESSFUL!")
            print(f"Registered Artisan Wallet: {verification['artisan_address']}")
            print(f"Registration Timestamp: {verification['registered_timestamp']}")
            print(f"Explorer link: https://explore.vechain.org/#/testnet/tx/{reg_result['tx_id']}")
        else:
            print("Verification failed or still indexing on block.")
            
    except Exception as e:
        print(f"❌ Error occurred during registration: {e}")

if __name__ == "__main__":
    asyncio.run(main())

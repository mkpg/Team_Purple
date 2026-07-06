import inspect
# Monkey-patch inspect for Python 3.11 compatibility with older web3/eth-abi dependencies
if not hasattr(inspect, "getargspec"):
    inspect.getargspec = inspect.getfullargspec

import hashlib
import json
import logging
from datetime import datetime
from typing import Optional

from thor_requests.connect import Connect
from thor_requests.wallet import Wallet
from thor_requests.contract import Contract
from app.config import settings

logger = logging.getLogger(__name__)

# Smart Contract ABI
REGISTRY_ABI = [
  {
    "anonymous": False,
    "inputs": [
      {
        "indexed": True,
        "internalType": "bytes32",
        "name": "designHash",
        "type": "bytes32"
      },
      {
        "indexed": True,
        "internalType": "address",
        "name": "artisan",
        "type": "address"
      },
      {
        "indexed": False,
        "internalType": "string",
        "name": "productId",
        "type": "string"
      },
      {
        "indexed": False,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "DesignRegistered",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "designHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "productId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "imageUrl",
        "type": "string"
      }
    ],
    "name": "registerDesign",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "designHash",
        "type": "bytes32"
      }
    ],
    "name": "designs",
    "outputs": [
      {
        "internalType": "address",
        "name": "artisan",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "productId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "imageUrl",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "designHash",
        "type": "bytes32"
      }
    ],
    "name": "verifyDesign",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

def build_design_bundle(image_bytes: bytes, product_title: str, description: str, artisan_id: str, upload_timestamp: str) -> bytes:
    """
    Concatenates identifying metadata and image bytes in a length-prefixed, 
    reproducible format to ensure cryptographic linkage.
    """
    title_b = product_title.encode('utf-8')
    desc_b = description.encode('utf-8')
    artisan_b = artisan_id.encode('utf-8')
    timestamp_b = upload_timestamp.encode('utf-8')
    
    # Structure: len:data_len:data...
    bundle = (
        f"{len(title_b)}:".encode('utf-8') + title_b +
        f"{len(desc_b)}:".encode('utf-8') + desc_b +
        f"{len(artisan_b)}:".encode('utf-8') + artisan_b +
        f"{len(timestamp_b)}:".encode('utf-8') + timestamp_b +
        f"{len(image_bytes)}:".encode('utf-8') + image_bytes
    )
    return bundle

def compute_design_hash(bundle_bytes: bytes) -> str:
    """Computes the SHA-256 hash of the design bundle, returned as 0x-prefixed hex string."""
    h = hashlib.sha256(bundle_bytes).hexdigest()
    return f"0x{h}"

def get_artisan_wallet(artisan_id: str) -> Wallet:
    """Derives a secure, deterministic private key & wallet for an artisan using their database ID."""
    seed = f"{artisan_id}-{settings.JWT_SECRET}".encode("utf-8")
    priv_key = hashlib.sha256(seed).digest()
    return Wallet.fromPrivateKey(priv=priv_key)

def get_sponsor_wallet() -> Optional[Wallet]:
    """Retrieves the platform sponsor wallet from the VECHAIN_SPONSOR_KEY environment variable."""
    key = settings.VECHAIN_SPONSOR_KEY
    if not key:
        return None
    if key.startswith("0x"):
        key = key[2:]
    try:
        return Wallet.fromPrivateKey(priv=bytes.fromhex(key))
    except Exception as e:
        logger.error(f"Failed to load platform sponsor wallet: {e}")
        return None

def get_blockchain_connection() -> Connect:
    """Initializes a connection to the configured VeChain node."""
    return Connect(settings.VECHAIN_NODE_URL)

async def verify_design_onchain(design_hash: str) -> Optional[dict]:
    """
    Checks if a design hash is registered on-chain via a read-only view call.
    Falls back to a simulated database ledger if keys are missing or RPC fails.
    """
    # 1. Try real on-chain check first (only if keys are configured)
    if settings.VECHAIN_CONTRACT_ADDRESS and settings.VECHAIN_SPONSOR_KEY:
        try:
            connector = get_blockchain_connection()
            contract = Contract({"abi": REGISTRY_ABI})
            
            # Convert hex string (e.g. 0xabc...) to bytes for bytes32 parameter
            if design_hash.startswith("0x"):
                hash_bytes = bytes.fromhex(design_hash[2:])
            else:
                hash_bytes = bytes.fromhex(design_hash)
                
            # Using a zero caller address for read-only emulation
            zero_caller = "0x0000000000000000000000000000000000000000"
            
            response = connector.call(
                caller=zero_caller,
                contract=contract,
                func_name="verifyDesign",
                func_params=[hash_bytes],
                to=settings.VECHAIN_CONTRACT_ADDRESS
            )
            
            if not response.get("reverted") and "decoded" in response:
                decoded = response["decoded"]
                artisan_addr = decoded[0]
                timestamp = decoded[1]
                product_id = decoded[2]
                image_url = decoded[3]
                
                if timestamp > 0:
                    return {
                        "artisan_address": artisan_addr,
                        "registered_timestamp": timestamp,
                        "product_id": product_id,
                        "image_url": image_url,
                        "simulated": False
                    }
        except Exception as e:
            logger.warning(f"Real VeChain verification failed ({e}). Falling back to simulated ledger.")

    # 2. Fallback to mock blockchain database collection
    try:
        from app.database import get_collection
        registry_coll = get_collection("blockchain_registry")
        doc = await registry_coll.find_one({"design_hash": design_hash})
        if doc:
            return {
                "artisan_address": doc.get("artisan_address"),
                "registered_timestamp": int(doc.get("registered_timestamp")),
                "product_id": doc.get("product_id"),
                "image_url": doc.get("image_url"),
                "tx_id": doc.get("tx_id"),
                "block_number": doc.get("block_number"),
                "simulated": True
            }
    except Exception as e:
        logger.error(f"Simulated database ledger lookup failed: {e}")
        
    return None

async def register_design_onchain(design_hash: str, artisan_id: str, product_id: str, image_url: str) -> dict:
    """
    Signs and broadcasts a fee-delegated transaction registering the design hash on VeChain.
    Falls back to a simulated database ledger if keys are missing or RPC fails.
    """
    artisan_wallet = get_artisan_wallet(artisan_id)
    artisan_address = artisan_wallet.getAddress()

    # 1. Try real on-chain registration first (only if keys are configured)
    if settings.VECHAIN_CONTRACT_ADDRESS and settings.VECHAIN_SPONSOR_KEY:
        try:
            sponsor_wallet = get_sponsor_wallet()
            if sponsor_wallet:
                if design_hash.startswith("0x"):
                    hash_bytes = bytes.fromhex(design_hash[2:])
                else:
                    hash_bytes = bytes.fromhex(design_hash)
                    
                connector = get_blockchain_connection()
                contract = Contract({"abi": REGISTRY_ABI})
                
                tx_receipt = connector.transact(
                    wallet=artisan_wallet,
                    contract=contract,
                    func_name="registerDesign",
                    func_params=[hash_bytes, product_id, image_url],
                    to=settings.VECHAIN_CONTRACT_ADDRESS,
                    gas_payer=sponsor_wallet
                )
                
                tx_id = tx_receipt.get("meta", {}).get("txID") or tx_receipt.get("id")
                block_number = tx_receipt.get("meta", {}).get("blockNumber", 0)
                
                if tx_id:
                    return {
                        "tx_id": tx_id,
                        "block_number": block_number,
                        "artisan_address": artisan_address,
                        "status": "success",
                        "simulated": False
                    }
        except Exception as e:
            logger.warning(f"Real VeChain transaction failed ({e}). Falling back to simulated ledger registration.")

    # 2. Fallback to mock blockchain database collection
    try:
        from app.database import get_collection
        import time
        
        registry_coll = get_collection("blockchain_registry")
        existing = await registry_coll.find_one({"design_hash": design_hash})
        if existing:
            return {
                "tx_id": existing.get("tx_id"),
                "block_number": existing.get("block_number"),
                "artisan_address": existing.get("artisan_address"),
                "status": "success",
                "simulated": True
            }
            
        # Simulate tx_id and block_number
        h = hashlib.sha256(f"{design_hash}-{time.time()}".encode("utf-8")).hexdigest()
        simulated_tx_id = f"0x{h}"
        simulated_block_number = 15302800 + int(time.time()) % 100000
        registered_timestamp = int(time.time())
        
        doc = {
            "design_hash": design_hash,
            "artisan_address": artisan_address,
            "registered_timestamp": registered_timestamp,
            "product_id": product_id,
            "image_url": image_url,
            "tx_id": simulated_tx_id,
            "block_number": simulated_block_number,
            "created_at": datetime.utcnow()
        }
        await registry_coll.insert_one(doc)
        
        return {
            "tx_id": simulated_tx_id,
            "block_number": simulated_block_number,
            "artisan_address": artisan_address,
            "status": "success",
            "simulated": True
        }
    except Exception as e:
        logger.error(f"Simulated database ledger registration failed: {e}")
        raise ValueError(f"Blockchain registration failed: {e}")

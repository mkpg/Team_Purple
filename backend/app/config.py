import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "craftshield"
    JWT_SECRET: str = "4f9ea4457e5e2e85a6a66699a7776b32812920c57c4ad3d9d300ad89c252277c"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # VeChain Settings (Testnet Only)
    VECHAIN_NODE_URL: str = "https://testnet.vechain.org"
    VECHAIN_CONTRACT_ADDRESS: str = "0x8849E48227b0Dbb6951Ff7b49466c1e5FF4bCF9a"
    VECHAIN_SPONSOR_KEY: str = "0x0000000000000000000000000000000000000000000000000000000000000001"

    # Find the env file path relative to this file
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

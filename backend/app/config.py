import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGODB_URL: str
    DATABASE_NAME: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    PUBLIC_APP_URL: str = "http://localhost:5173"
    TRANSACTION_PROOF_SECRET: str
    VECHAIN_NODE_URL: str = "https://testnet.vechain.org"
    VECHAIN_CONTRACT_ADDRESS: str = ""
    VECHAIN_SPONSOR_KEY: str = ""
    GEMINI_API_KEY: str = ""
    SARVAM_API_KEY: str = ""
    SARVAM_MODEL: str = "sarvam-30b"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

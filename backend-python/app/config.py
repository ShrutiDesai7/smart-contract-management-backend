from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:root@localhost:5432/contract_management"
    upload_dir: str = "uploads"
    llm_provider: str = "openai"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    auth_secret_key: str = "change-this-secret-in-production"
    access_token_expire_minutes: int = 60 * 8
    file_encryption_key: str = "change-this-file-encryption-key"
    rag_top_k: int = 3
    rag_similarity_threshold: float = 0.20
    rag_max_evidence_chunks: int = 1
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

"""
Configuración global de la aplicación
"""

import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    """Configuración de la aplicación"""
    
    # App
    APP_NAME: str = "NutriRiesgo-UNAH API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_MAX_TOKENS: int = 1000
    
    # Embeddings
    EMBEDDING_MODEL: str = "paraphrase-multilingual-MiniLM-L12-v2"
    EMBEDDING_DIMENSION: int = 384
    
    # RAG Configuration
    TOP_K_CHUNKS: int = 5  # Número de chunks a recuperar
    MIN_SIMILARITY: float = 0.3  # Umbral mínimo de similitud
    
    # Sistema de Abstención
    CONFIDENCE_THRESHOLD: float = 0.5
    ABSTENTION_KEYWORDS: list = [
        "tratamiento médico", "prescripción", "dosis", "medicamento",
        "cirugía", "diagnóstico", "cáncer", "enfermedad grave"
    ]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 30
    
    class Config:
        case_sensitive = True

settings = Settings()

# Validar configuración crítica
def validate_config():
    """Valida que todas las configuraciones críticas estén presentes"""
    required = {
        "DATABASE_URL": settings.DATABASE_URL,
        "OPENAI_API_KEY": settings.OPENAI_API_KEY,
        "SUPABASE_URL": settings.SUPABASE_URL,
    }
    
    missing = [k for k, v in required.items() if not v]
    
    if missing:
        raise ValueError(f"Configuración faltante: {', '.join(missing)}")
    
    print("✅ Configuración validada correctamente")

if __name__ == "__main__":
    validate_config()
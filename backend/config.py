"""
Configuración global de la aplicación
"""

import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Configuración de la aplicación"""

    # App
    APP_NAME: str = "NutriRiesgo-UNAH API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("ENVIRONMENT", "development") != "production"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")

    # Admin
    ADMIN_EMAILS: str = os.getenv("ADMIN_EMAILS", "")

    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_TEMPERATURE: float = 0.3
    OPENAI_MAX_TOKENS: int = 800

    # Embeddings
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536

    # RAG Configuration
    TOP_K_CHUNKS: int = 5
    MIN_SIMILARITY: float = 0.3

    # Sistema de Abstención
    CONFIDENCE_THRESHOLD: float = 0.5
    ABSTENTION_KEYWORDS: list = [
        "tratamiento médico", "prescripción", "dosis", "medicamento",
        "cirugía", "diagnóstico", "cáncer", "enfermedad grave"
    ]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 30

    # CORS - Permitir frontend en producción
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://nutri-colleague.vercel.app",
        "https://nutri-colleague-*.vercel.app",
    ]

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
        raise ValueError(f"Configuracion faltante: {', '.join(missing)}")

    print("Configuracion validada correctamente")

if __name__ == "__main__":
    validate_config()
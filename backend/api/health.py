"""
Endpoints de health check y status
"""

from fastapi import APIRouter, status
from datetime import datetime
from config import settings

router = APIRouter()

@router.get(
    "",
    summary="Health check",
    description="Verifica el estado de la API y sus dependencias"
)
async def health_check():
    """
    Verifica el estado del sistema
    
    Returns:
        Estado de la API y dependencias
    """
    # Check database
    db_healthy = False
    db_message = ""
    
    try:
        from utils.database import health_check as db_health
        db_healthy = db_health()
        db_message = "Connected" if db_healthy else "Connection failed"
    except Exception as e:
        db_message = f"Error: {str(e)}"
    
    # Check embeddings service
    embeddings_healthy = False
    embeddings_message = ""
    
    try:
        from services.embeddings_service import get_embeddings_service
        service = get_embeddings_service()
        embeddings_healthy = True
        embeddings_message = f"Loaded ({service.dimension} dims)"
    except Exception as e:
        embeddings_message = f"Error: {str(e)}"
    
    # Overall health
    overall_healthy = db_healthy and embeddings_healthy
    
    return {
        "status": "healthy" if overall_healthy else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION,
        "dependencies": {
            "database": {
                "healthy": db_healthy,
                "message": db_message
            },
            "embeddings": {
                "healthy": embeddings_healthy,
                "message": embeddings_message
            },
            "openai": {
                "configured": bool(settings.OPENAI_API_KEY),
                "model": settings.OPENAI_MODEL
            }
        }
    }

@router.get(
    "/ping",
    summary="Ping",
    description="Simple ping endpoint"
)
async def ping():
    """Simple ping"""
    return {"ping": "pong", "timestamp": datetime.utcnow().isoformat()}
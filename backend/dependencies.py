"""
Dependencias compartidas para FastAPI
"""

from fastapi import Header, HTTPException, status
from typing import Optional

# ============================================================================
# AUTH DEPENDENCIES (placeholder - implementar con Supabase Auth después)
# ============================================================================

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Optional[str]:
    """
    Obtiene el usuario actual desde el token de autorización
    
    Por ahora retorna None (autenticación opcional)
    TODO: Implementar con Supabase Auth
    
    Args:
        authorization: Header de autorización (Bearer token)
    
    Returns:
        user_id si está autenticado, None si no
    """
    if not authorization:
        return None
    
    # TODO: Validar token con Supabase
    # Por ahora, permitir acceso sin auth
    return None

async def require_auth(
    authorization: Optional[str] = Header(None)
) -> str:
    """
    Require autenticación obligatoria
    
    Args:
        authorization: Header de autorización
    
    Returns:
        user_id
    
    Raises:
        HTTPException: Si no está autenticado
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # TODO: Validar token con Supabase
    user_id = await get_current_user(authorization)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_id

# ============================================================================
# RATE LIMITING (placeholder)
# ============================================================================

# TODO: Implementar rate limiting con Redis o memoria
# Por ahora, sin límite

async def check_rate_limit(user_id: Optional[str] = None):
    """
    Verifica rate limiting
    
    TODO: Implementar con Redis/memoria
    """
    pass
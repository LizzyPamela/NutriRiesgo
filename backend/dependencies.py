"""
Dependencias compartidas para FastAPI
"""

import os
import time
import requests as http_requests
from fastapi import Header, HTTPException, Depends, status
from typing import Optional

# ============================================================================
# RATE LIMITING — estado en memoria
# ============================================================================

_rate_limit_store: dict[str, list[float]] = {}


def _supabase_url() -> str:
    return os.getenv("SUPABASE_URL", "").rstrip("/")


def _get_admin_emails() -> list[str]:
    raw = os.getenv("ADMIN_EMAILS", "")
    return [e.strip().lower() for e in raw.split(",") if e.strip()]


def _validate_token(token: str) -> dict:
    """
    Valida el access_token contra Supabase Auth y retorna el payload del usuario.
    Funciona independientemente del algoritmo de firma (HS256 o RS256/ES256).
    """
    url = f"{_supabase_url()}/auth/v1/user"
    # Usar service key como apikey — válida para llamadas servidor-a-servidor
    service_key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    resp = http_requests.get(
        url,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {token}",
        },
        timeout=5,
    )
    if resp.status_code != 200:
        return {}
    return resp.json()


# ============================================================================
# AUTH DEPENDENCIES
# ============================================================================

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Optional[str]:
    """
    Valida el token con Supabase y retorna el user_id.
    Retorna None si no hay token (auth opcional).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    payload = _validate_token(token)
    return payload.get("id") or None


async def require_auth(
    authorization: Optional[str] = Header(None)
) -> str:
    """
    Requiere autenticación obligatoria. Lanza 401 si no hay token válido.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1]
    payload = _validate_token(token)
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


async def require_admin(
    authorization: Optional[str] = Header(None)
) -> str:
    """
    Requiere que el usuario autenticado sea administrador.
    Lanza 401 si no está autenticado, 403 si no es admin.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1]
    payload = _validate_token(token)
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = (payload.get("email") or "").lower()
    admin_emails = _get_admin_emails()
    if not admin_emails or email not in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores",
        )
    return user_id


# ============================================================================
# RATE LIMITING
# ============================================================================

async def check_rate_limit(
    current_user: Optional[str] = Depends(get_current_user),
) -> None:
    """
    Limita a 30 requests por minuto por user_id.
    Lanza HTTP 429 si se supera el límite.
    """
    from config import settings

    identifier = current_user or "anonymous"
    now = time.time()
    window = 60.0

    if identifier not in _rate_limit_store:
        _rate_limit_store[identifier] = []

    # Limpiar timestamps fuera de la ventana
    _rate_limit_store[identifier] = [
        ts for ts in _rate_limit_store[identifier]
        if now - ts < window
    ]

    if len(_rate_limit_store[identifier]) >= settings.RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Has superado el límite de {settings.RATE_LIMIT_PER_MINUTE} consultas "
                "por minuto. Por favor, espera un momento antes de continuar."
            ),
        )

    _rate_limit_store[identifier].append(now)

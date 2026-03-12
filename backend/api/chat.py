"""
Endpoints para el sistema de chat RAG
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional
import asyncio
import time

from models.chat import (
    ConsultaRequest,
    ConsultaResponse,
    NivelConfianza,
    TipoConsulta,
    ChunkRecuperado
)
from services.rag_service import get_rag_service
from dependencies import get_current_user
from datetime import datetime

router = APIRouter()

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/consulta",
    response_model=ConsultaResponse,
    summary="Realizar una consulta al sistema RAG",
    description="""
    Endpoint principal para consultas nutricionales.
    
    **Funcionalidades:**
    * Búsqueda semántica en base de conocimiento
    * Generación de respuesta con GPT-4
    * Sistema de abstención automático
    * Detección de necesidad de derivación
    * Tracking de conversaciones
    
    **Ejemplos de consultas:**
    * "¿Cuántas porciones de frutas debo comer al día?"
    * "¿Qué alimentos tienen más hierro?"
    * "¿Cómo prevenir enfermedades del corazón?"
    """
)
async def consultar(
    request: ConsultaRequest,
    current_user: Optional[str] = Depends(get_current_user)
):
    """
    Procesa una consulta usando el sistema RAG
    
    Args:
        request: Datos de la consulta
        current_user: Usuario actual (opcional)
    
    Returns:
        Respuesta completa del sistema RAG
    """
    try:
        # Obtener servicio RAG
        rag_service = get_rag_service()
        
        # Usar user_id del request o del current_user
        user_id = request.user_id or current_user
        
        # Procesar consulta
        resultado = await rag_service.procesar_consulta(
            consulta=request.consulta,
            user_id=user_id,
            incluir_contexto_perfil=request.incluir_contexto_perfil
        )
        
        # Construir response
        response = ConsultaResponse(
            respuesta=resultado["respuesta"],
            abstension=resultado["abstension"],
            derivacion=resultado["derivacion"],
            nivel_confianza=NivelConfianza(resultado["nivel_confianza"]),
            chunks_utilizados=[
                ChunkRecuperado(**chunk) 
                for chunk in resultado["chunks_utilizados"]
            ],
            tipo_consulta=TipoConsulta(resultado["tipo_consulta"]),
            tiempo_respuesta_ms=resultado["tiempo_respuesta_ms"],
            costo_estimado_usd=resultado["costo_estimado_usd"],
            mensaje_abstension=resultado.get("mensaje_abstension"),
            razon_derivacion=resultado.get("razon_derivacion"),
            conversation_id=resultado.get("conversation_id"),
            timestamp=datetime.utcnow()
        )
        
        return response
        
    except Exception as e:
        print(f"❌ Error en endpoint /consulta: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando consulta: {str(e)}"
        )

@router.get(
    "/conversaciones/{user_id}",
    summary="Obtener historial de conversaciones",
    description="Obtiene el historial de conversaciones de un usuario"
)
async def obtener_conversaciones(
    user_id: str,
    limite: int = 10,
    offset: int = 0,
    current_user: Optional[str] = Depends(get_current_user)
):
    """
    Obtiene el historial de conversaciones de un usuario
    
    Args:
        user_id: ID del usuario
        limite: Número máximo de conversaciones a retornar
        offset: Offset para paginación
        current_user: Usuario actual
    
    Returns:
        Lista de conversaciones
    """
    try:
        from utils.database import get_db_cursor

        def _fetch():
            with get_db_cursor() as cur:
                cur.execute("""
                    SELECT
                        id,
                        consulta,
                        respuesta,
                        abstension,
                        derivacion,
                        nivel_confianza,
                        tipo_consulta,
                        tiempo_respuesta_ms,
                        costo_usd,
                        created_at
                    FROM conversaciones
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, (user_id, limite, offset))
                rows = cur.fetchall()

                cur.execute("""
                    SELECT COUNT(*) FROM conversaciones WHERE user_id = %s
                """, (user_id,))
                total = cur.fetchone()['count']
            return list(rows), total

        loop = asyncio.get_running_loop()
        conversaciones, total = await loop.run_in_executor(None, _fetch)

        return {
            "conversaciones": conversaciones,
            "total": total,
            "limite": limite,
            "offset": offset
        }
        
    except Exception as e:
        print(f"❌ Error obteniendo conversaciones: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo conversaciones: {str(e)}"
        )

@router.get(
    "/estadisticas",
    summary="Obtener estadísticas del sistema de chat",
    description="Obtiene métricas agregadas del sistema"
)
async def obtener_estadisticas(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None
):
    """
    Obtiene estadísticas del sistema
    
    Args:
        fecha_inicio: Fecha de inicio (YYYY-MM-DD)
        fecha_fin: Fecha de fin (YYYY-MM-DD)
    
    Returns:
        Estadísticas del sistema
    """
    try:
        from utils.database import obtener_estadisticas_sistema

        loop = asyncio.get_running_loop()
        stats = await loop.run_in_executor(
            None, lambda: obtener_estadisticas_sistema(fecha_inicio, fecha_fin)
        )

        return stats
        
    except Exception as e:
        print(f"❌ Error obteniendo estadísticas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )
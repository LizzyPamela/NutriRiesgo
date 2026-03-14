"""
Endpoints para búsqueda y consulta de alimentos
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, List
from pydantic import BaseModel

from models.chat import (
    BusquedaAlimentosRequest,
    BusquedaAlimentosResponse,
    AlimentoResponse
)
from utils.database import buscar_alimentos, obtener_alimento_completo


class RecomendarAlimentosRequest(BaseModel):
    consulta: str
    user_id: Optional[str] = None

router = APIRouter()

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/buscar",
    response_model=BusquedaAlimentosResponse,
    summary="Buscar alimentos",
    description="""
    Búsqueda de alimentos usando texto completo.
    
    **Características:**
    * Búsqueda en 92K+ alimentos (USDA + INCAP)
    * Filtrado por categoría
    * Filtrado por alimentos hondureños/INCAP
    * Resultados ordenados por relevancia
    """
)
async def buscar(request: BusquedaAlimentosRequest):
    """
    Busca alimentos por término
    
    Args:
        request: Parámetros de búsqueda
    
    Returns:
        Lista de alimentos encontrados
    """
    try:
        # Buscar en BD
        resultados = buscar_alimentos(
            termino=request.termino,
            filtro_categoria=request.categoria,
            solo_hondurenos=request.solo_hondurenos,
            limite=request.limite
        )
        
        # Convertir a modelos Pydantic
        alimentos = [
            AlimentoResponse(
                id=r['id'],
                nombre=r['nombre'],
                categoria=r['categoria'],
                fuente=r['fuente'],
                es_alimento_hondureno=r.get('es_alimento_hondureno', False),
                energia_kcal=r.get('energia_kcal'),
                proteina_g=r.get('proteina_g'),
                grasa_g=r.get('grasa_g') or r.get('grasas_g'),
                carbohidratos_g=r.get('carbohidratos_g'),
                fibra_g=r.get('fibra_g'),
                calcio_mg=r.get('calcio_mg'),
                hierro_mg=r.get('hierro_mg'),
                sodio_mg=r.get('sodio_mg'),
                vitamina_c_mg=r.get('vitamina_c_mg'),
                completitud_datos=r.get('completitud_datos')
            )
            for r in resultados
        ]
        
        return BusquedaAlimentosResponse(
            alimentos=alimentos,
            total_encontrados=len(alimentos),
            termino_busqueda=request.termino,
            filtros_aplicados={
                "categoria": request.categoria,
                "solo_hondurenos": request.solo_hondurenos
            }
        )
        
    except Exception as e:
        print(f"❌ Error en búsqueda de alimentos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en búsqueda: {str(e)}"
        )

@router.get(
    "/buscar",
    response_model=BusquedaAlimentosResponse,
    summary="Buscar alimentos (GET)",
    description="Versión GET del endpoint de búsqueda"
)
async def buscar_get(
    termino: str = Query(..., min_length=2, max_length=100, description="Término de búsqueda"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    solo_hondurenos: bool = Query(False, description="Solo alimentos hondureños"),
    limite: int = Query(10, ge=1, le=50, description="Límite de resultados")
):
    """Versión GET de la búsqueda de alimentos"""
    request = BusquedaAlimentosRequest(
        termino=termino,
        categoria=categoria,
        solo_hondurenos=solo_hondurenos,
        limite=limite
    )
    return await buscar(request)

@router.post(
    "/recomendar",
    summary="Búsqueda semántica de contexto nutricional",
    description="""
    Busca chunks de conocimiento nutricional usando similitud semántica.
    Solo retrieval puro — no llama a GPT.

    **Retorna:** lista de { texto, autoridad, similitud }
    """
)
async def recomendar(request: RecomendarAlimentosRequest):
    """
    Genera embedding de la consulta y busca los chunks más relevantes
    en la base de conocimiento (knowledge_base) con similitud >= 0.3.
    """
    import asyncio
    from services.embeddings_service import get_embeddings_service
    from utils.database import buscar_conocimiento_semantico

    if not request.consulta or not request.consulta.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La consulta no puede estar vacía."
        )

    try:
        embeddings_service = get_embeddings_service()
        loop = asyncio.get_running_loop()

        # Generar embedding en executor para no bloquear el event loop
        embedding = await loop.run_in_executor(
            None,
            embeddings_service.generar_embedding,
            request.consulta.strip()
        )

        # Pedir más chunks con evidencia media para tener de donde filtrar
        chunks_raw = await loop.run_in_executor(
            None,
            lambda: buscar_conocimiento_semantico(
                query_embedding=embedding,
                limite=8,
                nivel_evidencia_min='medio'
            )
        )

        # Cabeceras que identifican tablas de composición INCAP crudas
        _CABECERAS_TABLA = (
            "Código NOMBRE", "Fracción Comestible",
            "Riboﬂ avina", "Ác. Grasos", "Ác. grasos",
        )

        def _es_tabla_cruda(texto: str) -> bool:
            if any(h in texto for h in _CABECERAS_TABLA):
                return True
            tokens = texto.split()
            if len(tokens) < 8:
                return False
            codigos = sum(1 for t in tokens if t.isdigit() and len(t) == 5)
            return codigos / len(tokens) > 0.08

        # Filtrar: similitud mínima + excluir tablas crudas + límite 4
        resultados = [
            {
                "texto": c["texto"],
                "autoridad": c.get("autoridad") or "",
                "similitud": float(c.get("similitud", 0)),
            }
            for c in chunks_raw
            if float(c.get("similitud", 0)) >= 0.3
            and not _es_tabla_cruda(c.get("texto", ""))
        ][:4]

        return {
            "resultados": resultados,
            "consulta": request.consulta,
            "total": len(resultados),
        }

    except Exception as e:
        print(f"Error en /alimentos/recomendar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en búsqueda semántica: {str(e)}"
        )


@router.get(
    "/{alimento_id}",
    response_model=AlimentoResponse,
    summary="Obtener alimento por ID",
    description="Obtiene información completa de un alimento específico"
)
async def obtener_alimento(alimento_id: str):
    """
    Obtiene información completa de un alimento
    
    Args:
        alimento_id: ID del alimento (ej: ALI00001)
    
    Returns:
        Información completa del alimento
    """
    try:
        resultado = obtener_alimento_completo(alimento_id)
        
        if not resultado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alimento {alimento_id} no encontrado"
            )
        
        return AlimentoResponse(**resultado)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error obteniendo alimento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo alimento: {str(e)}"
        )

@router.get(
    "/categorias/listar",
    summary="Listar categorías disponibles",
    description="Obtiene la lista de todas las categorías de alimentos"
)
async def listar_categorias():
    """
    Lista todas las categorías de alimentos disponibles
    
    Returns:
        Lista de categorías con conteos
    """
    try:
        from utils.database import get_db_cursor
        
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT 
                    categoria,
                    COUNT(*) as total_alimentos
                FROM alimentos
                GROUP BY categoria
                ORDER BY total_alimentos DESC
            """)
            
            categorias = cur.fetchall()
        
        return {
            "categorias": categorias,
            "total_categorias": len(categorias)
        }
        
    except Exception as e:
        print(f"❌ Error listando categorías: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listando categorías: {str(e)}"
        )

@router.get(
    "/hondurenos/top",
    summary="Top alimentos hondureños",
    description="Obtiene los alimentos hondureños/INCAP más consultados"
)
async def top_hondurenos(limite: int = Query(20, ge=1, le=100)):
    """
    Obtiene los top alimentos hondureños/INCAP
    
    Args:
        limite: Número de alimentos a retornar
    
    Returns:
        Lista de alimentos hondureños
    """
    try:
        from utils.database import get_db_cursor
        
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT 
                    id, nombre, categoria, fuente,
                    energia_kcal, proteina_g, grasa_g, carbohidratos_g,
                    completitud_datos
                FROM alimentos
                WHERE es_alimento_hondureno = true
                ORDER BY completitud_datos DESC, nombre ASC
                LIMIT %s
            """, (limite,))
            
            alimentos = cur.fetchall()
        
        return {
            "alimentos": alimentos,
            "total": len(alimentos)
        }
        
    except Exception as e:
        print(f"❌ Error obteniendo alimentos hondureños: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo alimentos: {str(e)}"
        )
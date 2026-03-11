"""
Utilidades para conexión y operaciones con la base de datos
"""

import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor
from pgvector.psycopg2 import register_vector
from contextlib import contextmanager
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

# Pool de conexiones
_connection_pool: Optional[SimpleConnectionPool] = None

def get_connection_pool() -> SimpleConnectionPool:
    """Obtiene o crea el pool de conexiones"""
    global _connection_pool
    
    if _connection_pool is None:
        DATABASE_URL = os.getenv("DATABASE_URL")
        
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL no configurada")
        
        _connection_pool = SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL
        )
        
        print("OK: Connection pool creado")
    
    return _connection_pool

@contextmanager
def get_db_connection():
    """Context manager para obtener una conexión del pool"""
    pool = get_connection_pool()
    conn = pool.getconn()
    
    try:
        register_vector(conn)
        yield conn
    finally:
        pool.putconn(conn)

@contextmanager
def get_db_cursor(dict_cursor: bool = True):
    """Context manager para obtener un cursor"""
    with get_db_connection() as conn:
        cursor_factory = RealDictCursor if dict_cursor else None
        cursor = conn.cursor(cursor_factory=cursor_factory)
        
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()

# ============================================================================
# FUNCIONES DE BÚSQUEDA
# ============================================================================

def buscar_conocimiento_semantico(
    query_embedding: List[float],
    limite: int = 5,
    filtro_tipo: Optional[str] = None,
    filtro_autoridad: Optional[str] = None,
    nivel_evidencia_min: str = 'medio'
) -> List[Dict[str, Any]]:
    """
    Busca chunks de conocimiento usando búsqueda vectorial
    
    Args:
        query_embedding: Embedding de la consulta (384 dimensiones)
        limite: Número máximo de resultados
        filtro_tipo: Filtrar por tipo de documento
        filtro_autoridad: Filtrar por autoridad
        nivel_evidencia_min: Nivel mínimo de evidencia
    
    Returns:
        Lista de chunks con similitud
    """
    import numpy as np
    vec = np.array(query_embedding, dtype=np.float32)
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT * FROM buscar_conocimiento_semantico(
                %s, %s, %s, %s, %s
            )
        """, (vec, limite, filtro_tipo, filtro_autoridad, nivel_evidencia_min))
        
        return cur.fetchall()

def buscar_alimentos(
    termino: str,
    filtro_categoria: Optional[str] = None,
    solo_hondurenos: bool = False,
    limite: int = 10
) -> List[Dict[str, Any]]:
    """
    Busca alimentos usando búsqueda ILIKE directa sobre la tabla alimentos.
    """
    with get_db_cursor() as cur:
        condiciones = ["nombre ILIKE %s"]
        params: List[Any] = [f"%{termino}%"]

        if filtro_categoria:
            condiciones.append("categoria = %s")
            params.append(filtro_categoria)

        if solo_hondurenos:
            condiciones.append("es_alimento_hondureno = true")

        where = " AND ".join(condiciones)
        params.append(limite)

        cur.execute(f"""
            SELECT
                id, nombre, categoria, fuente,
                COALESCE(es_alimento_hondureno, false) AS es_alimento_hondureno,
                energia_kcal, proteina_g, grasa_g, carbohidratos_g,
                fibra_g, calcio_mg, hierro_mg, sodio_mg,
                vitamina_c_mg, completitud_datos
            FROM alimentos
            WHERE {where}
            ORDER BY
                COALESCE(es_alimento_hondureno, false) DESC,
                COALESCE(completitud_datos, 0) DESC,
                nombre ASC
            LIMIT %s
        """, params)

        return cur.fetchall()

def obtener_alimento_completo(alimento_id: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene información completa de un alimento
    
    Args:
        alimento_id: ID del alimento
    
    Returns:
        Diccionario con información completa del alimento
    """
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT * FROM obtener_alimento_completo(%s)
        """, (alimento_id,))
        
        result = cur.fetchone()
        return result

def guardar_conversacion(
    user_id: Optional[str],
    consulta: str,
    respuesta: str,
    chunks_recuperados: List[Dict[str, Any]],
    abstension: bool,
    derivacion: bool,
    nivel_confianza: str,
    tipo_consulta: str,
    tiempo_respuesta_ms: int,
    costo_usd: float
) -> str:
    """
    Guarda una conversación en la base de datos
    
    Returns:
        ID de la conversación guardada
    """
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO conversaciones 
            (user_id, consulta, respuesta, chunks_recuperados, abstension, 
             derivacion, nivel_confianza, tipo_consulta, tiempo_respuesta_ms, costo_usd)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id, consulta, respuesta, 
            psycopg2.extras.Json(chunks_recuperados),
            abstension, derivacion, nivel_confianza, tipo_consulta,
            tiempo_respuesta_ms, costo_usd
        ))
        
        result = cur.fetchone()
        return str(result['id'])

def obtener_perfil_usuario(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene el perfil de un usuario
    
    Args:
        user_id: ID del usuario
    
    Returns:
        Diccionario con el perfil del usuario
    """
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT * FROM perfiles_usuarios
            WHERE user_id = %s
        """, (user_id,))
        
        return cur.fetchone()

def registrar_log_sistema(
    nivel: str,
    mensaje: str,
    detalles: Optional[Dict[str, Any]] = None
):
    """
    Registra un log del sistema
    
    Args:
        nivel: Nivel del log (info, warning, error)
        mensaje: Mensaje del log
        detalles: Detalles adicionales
    """
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO logs_sistema (nivel, mensaje, detalles)
            VALUES (%s, %s, %s)
        """, (nivel, mensaje, psycopg2.extras.Json(detalles) if detalles else None))

# ============================================================================
# FUNCIONES DE ESTADÍSTICAS
# ============================================================================

def obtener_estadisticas_sistema(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None
) -> Dict[str, Any]:
    """
    Obtiene estadísticas del sistema
    
    Args:
        fecha_inicio: Fecha de inicio (formato: YYYY-MM-DD)
        fecha_fin: Fecha de fin (formato: YYYY-MM-DD)
    
    Returns:
        Diccionario con estadísticas
    """
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT * FROM estadisticas_sistema(%s, %s)
        """, (fecha_inicio, fecha_fin))
        
        return cur.fetchone()

def health_check() -> bool:
    """
    Verifica que la conexión a la base de datos funcione
    
    Returns:
        True si la conexión funciona
    """
    try:
        with get_db_cursor() as cur:
            cur.execute("SELECT 1")
            return True
    except Exception as e:
        print(f"❌ Health check falló: {str(e)}")
        return False

# ============================================================================
# CLEANUP
# ============================================================================

def close_connection_pool():
    """Cierra el pool de conexiones"""
    global _connection_pool
    
    if _connection_pool is not None:
        _connection_pool.closeall()
        _connection_pool = None
        print("OK: Connection pool cerrado")
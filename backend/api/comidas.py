"""
Endpoints para diario alimentario
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import Optional
from datetime import date
import psycopg2.extras

from utils.database import get_db_cursor

router = APIRouter()


@router.post("/registrar", summary="Registrar comida")
async def registrar_comida(registro: dict):
    """
    Registra una comida en el diario alimentario.
    Espera: user_id, fecha, tiempo_comida, alimentos (lista), notas (opcional)
    """
    try:
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO registros_comidas
                    (user_id, fecha, tiempo_comida, alimentos,
                     total_calorias, total_proteina_g, total_carbohidratos_g,
                     total_grasas_g, notas)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                registro.get("user_id"),
                registro.get("fecha"),
                registro.get("tiempo_comida"),
                psycopg2.extras.Json(registro.get("alimentos", [])),
                registro.get("total_calorias"),
                registro.get("total_proteina_g"),
                registro.get("total_carbohidratos_g"),
                registro.get("total_grasas_g"),
                registro.get("notas"),
            ))
            result = cur.fetchone()
        return {"id": str(result["id"]), "message": "Comida registrada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}", summary="Obtener diario alimentario")
async def obtener_diario(
    user_id: str,
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    limite: int = Query(30, ge=1, le=100),
):
    try:
        with get_db_cursor() as cur:
            query = """
                SELECT id, fecha, tiempo_comida, alimentos,
                       total_calorias, total_proteina_g,
                       total_carbohidratos_g, total_grasas_g, notas, created_at
                FROM registros_comidas
                WHERE user_id = %s
            """
            params = [user_id]

            if fecha_inicio:
                query += " AND fecha >= %s"
                params.append(fecha_inicio)
            if fecha_fin:
                query += " AND fecha <= %s"
                params.append(fecha_fin)

            query += " ORDER BY fecha DESC, created_at DESC LIMIT %s"
            params.append(limite)

            cur.execute(query, params)
            registros = [dict(r) for r in cur.fetchall()]

        return {"registros": registros, "total": len(registros)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{registro_id}", summary="Eliminar registro de comida")
async def eliminar_registro(registro_id: str):
    try:
        with get_db_cursor() as cur:
            cur.execute("DELETE FROM registros_comidas WHERE id = %s", (registro_id,))
        return {"message": "Registro eliminado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

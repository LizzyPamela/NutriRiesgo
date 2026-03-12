"""
Endpoints para diario alimentario
"""

from fastapi import APIRouter, HTTPException, status, Query, Depends
from typing import Optional
from datetime import date
import asyncio
import psycopg2.extras

from utils.database import get_db_cursor
from dependencies import require_auth

router = APIRouter()


@router.post("/registrar", summary="Registrar comida")
async def registrar_comida(registro: dict, current_user: str = Depends(require_auth)):
    """
    Registra una comida en el diario alimentario.
    Espera: user_id, fecha, tiempo_comida, alimentos (lista), notas (opcional)
    """
    # El user_id del registro debe coincidir con el token
    if registro.get("user_id") and registro["user_id"] != current_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    # Forzar user_id desde el token
    registro["user_id"] = current_user

    def _insert():
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
            return cur.fetchone()

    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, _insert)
        return {"id": str(result["id"]), "message": "Comida registrada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/frecuentes/{user_id}", summary="Alimentos más frecuentes por tiempo de comida")
async def obtener_alimentos_frecuentes(
    user_id: str,
    tiempo_comida: Optional[str] = Query(None),
    limite: int = Query(5, ge=1, le=20),
    current_user: str = Depends(require_auth),
):
    """
    Devuelve los alimentos que el usuario registra con más frecuencia,
    opcionalmente filtrados por tiempo de comida (desayuno, almuerzo, cena, merienda).
    Usado para autocomplete en el diario.
    """
    if current_user != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    def _fetch():
        with get_db_cursor() as cur:
            params: list = [user_id]
            filtro_tiempo = ""
            if tiempo_comida:
                filtro_tiempo = "AND tiempo_comida = %s"
                params.append(tiempo_comida)
            params.append(limite)
            cur.execute(f"""
                SELECT
                    elem->>'alimento_id' AS alimento_id,
                    elem->>'nombre'      AS nombre,
                    COUNT(*)             AS frecuencia,
                    AVG((elem->>'cantidad_g')::numeric)    AS avg_cantidad_g,
                    AVG((elem->>'energia_kcal')::numeric /
                        NULLIF((elem->>'cantidad_g')::numeric, 0) * 100
                    ) AS energia_kcal_100g
                FROM registros_comidas,
                     jsonb_array_elements(alimentos) AS elem
                WHERE user_id = %s
                  {filtro_tiempo}
                GROUP BY alimento_id, nombre
                ORDER BY frecuencia DESC
                LIMIT %s
            """, params)
            return [dict(r) for r in cur.fetchall()]

    try:
        loop = asyncio.get_running_loop()
        sugerencias = await loop.run_in_executor(None, _fetch)
        return {"sugerencias": sugerencias}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}", summary="Obtener diario alimentario")
async def obtener_diario(
    user_id: str,
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    limite: int = Query(30, ge=1, le=100),
    current_user: str = Depends(require_auth),
):
    if current_user != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    def _fetch():
        with get_db_cursor() as cur:
            query = """
                SELECT id, fecha, tiempo_comida, alimentos,
                       total_calorias, total_proteina_g,
                       total_carbohidratos_g, total_grasas_g, notas, created_at
                FROM registros_comidas
                WHERE user_id = %s
            """
            params: list = [user_id]

            if fecha_inicio:
                query += " AND fecha >= %s"
                params.append(fecha_inicio)
            if fecha_fin:
                query += " AND fecha <= %s"
                params.append(fecha_fin)

            query += " ORDER BY fecha DESC, created_at DESC LIMIT %s"
            params.append(limite)

            cur.execute(query, params)
            return [dict(r) for r in cur.fetchall()]

    try:
        loop = asyncio.get_running_loop()
        registros = await loop.run_in_executor(None, _fetch)
        return {"registros": registros, "total": len(registros)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{registro_id}", summary="Eliminar registro de comida")
async def eliminar_registro(registro_id: str, current_user: str = Depends(require_auth)):
    def _delete():
        with get_db_cursor() as cur:
            # Solo eliminar si pertenece al usuario autenticado
            cur.execute(
                "DELETE FROM registros_comidas WHERE id = %s AND user_id = %s",
                (registro_id, current_user),
            )
            return cur.rowcount

    try:
        loop = asyncio.get_running_loop()
        deleted = await loop.run_in_executor(None, _delete)
        if deleted == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Registro no encontrado o no autorizado")
        return {"message": "Registro eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

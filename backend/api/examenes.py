"""
Endpoints para gestión de resultados de exámenes médicos
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional
from pydantic import BaseModel
import asyncio

from dependencies import require_auth
from utils.database import get_db_cursor

router = APIRouter()


# ── Modelos ──────────────────────────────────────────────────────────────────

class ResultadoExamenRequest(BaseModel):
    examen_id: str
    valor: float
    fecha: str          # ISO date string "YYYY-MM-DD"
    interpretacion: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "/{user_id}",
    status_code=status.HTTP_201_CREATED,
    summary="Guardar resultado de examen",
)
async def guardar_resultado(
    user_id: str,
    body: ResultadoExamenRequest,
    current_user: str = Depends(require_auth),
):
    if current_user != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    def _insert():
        with get_db_cursor() as cur:
            # Upsert: si ya existe el mismo examen+fecha para este usuario, reemplaza
            cur.execute("""
                INSERT INTO examenes_resultados
                    (user_id, examen_id, valor, fecha, interpretacion)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (user_id, body.examen_id, body.valor, body.fecha, body.interpretacion))
            row = cur.fetchone()
            return str(row["id"]) if row else None

    loop = asyncio.get_running_loop()
    try:
        resultado_id = await loop.run_in_executor(None, _insert)
        return {"id": resultado_id, "mensaje": "Resultado guardado correctamente"}
    except Exception as e:
        print(f"Error guardando examen: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al guardar el resultado",
        )


@router.get(
    "/{user_id}",
    summary="Obtener historial de exámenes",
)
async def obtener_historial(
    user_id: str,
    current_user: str = Depends(require_auth),
):
    if current_user != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    def _fetch():
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT examen_id, valor, fecha::text, interpretacion
                FROM examenes_resultados
                WHERE user_id = %s
                ORDER BY fecha ASC, created_at ASC
            """, (user_id,))
            return cur.fetchall()

    loop = asyncio.get_running_loop()
    try:
        rows = await loop.run_in_executor(None, _fetch)
        resultados = [
            {
                "examenId": r["examen_id"],
                "valor": r["valor"],
                "fecha": r["fecha"],
                "interpretacion": r["interpretacion"],
            }
            for r in rows
        ]
        return {"resultados": resultados, "total": len(resultados)}
    except Exception as e:
        print(f"Error obteniendo historial: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el historial",
        )


@router.delete(
    "/{user_id}/{examen_id}/{fecha}",
    summary="Eliminar resultado de examen",
)
async def eliminar_resultado(
    user_id: str,
    examen_id: str,
    fecha: str,
    current_user: str = Depends(require_auth),
):
    if current_user != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    def _delete():
        with get_db_cursor() as cur:
            cur.execute("""
                DELETE FROM examenes_resultados
                WHERE user_id = %s AND examen_id = %s AND fecha = %s
            """, (user_id, examen_id, fecha))
            return cur.rowcount

    loop = asyncio.get_running_loop()
    try:
        deleted = await loop.run_in_executor(None, _delete)
        if deleted == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resultado no encontrado")
        return {"mensaje": "Resultado eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error eliminando examen: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar el resultado",
        )

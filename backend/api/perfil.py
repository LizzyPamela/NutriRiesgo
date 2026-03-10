"""
Endpoints para gestión de perfil de usuario
"""

from fastapi import APIRouter, HTTPException, status
from typing import Optional
import psycopg2.extras

from utils.database import get_db_cursor, obtener_perfil_usuario

router = APIRouter()


@router.get("/{user_id}", summary="Obtener perfil de usuario")
async def obtener_perfil(user_id: str):
    try:
        perfil = obtener_perfil_usuario(user_id)
        if not perfil:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Perfil no encontrado para {user_id}")
        return dict(perfil)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}", summary="Crear o actualizar perfil de usuario")
async def upsert_perfil(user_id: str, datos: dict):
    try:
        # Calcular IMC si hay peso y altura
        peso = datos.get("peso_kg")
        altura = datos.get("altura_cm")
        if peso and altura and altura > 0:
            datos["imc"] = round(peso / ((altura / 100) ** 2), 2)

        campos = [k for k in datos if k not in ("user_id",)]
        set_clause = ", ".join(f"{c} = %s" for c in campos)
        valores = [datos[c] for c in campos]

        with get_db_cursor() as cur:
            cur.execute(f"""
                INSERT INTO perfiles_usuarios (user_id, {', '.join(campos)})
                VALUES (%s, {', '.join(['%s'] * len(campos))})
                ON CONFLICT (user_id) DO UPDATE SET {set_clause},
                    updated_at = NOW()
                RETURNING *
            """, [user_id] + valores + valores)
            return dict(cur.fetchone())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}", summary="Eliminar perfil de usuario")
async def eliminar_perfil(user_id: str):
    try:
        with get_db_cursor() as cur:
            cur.execute("DELETE FROM perfiles_usuarios WHERE user_id = %s", (user_id,))
        return {"message": "Perfil eliminado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

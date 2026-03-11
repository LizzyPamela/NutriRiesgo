"""
Endpoints para gestión de perfil de usuario
"""

from fastapi import APIRouter, HTTPException, status
from typing import Optional
import psycopg2.extras
from psycopg2.extras import Json as PgJson

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
        # Normalizar sexo: la BD acepta 'M'/'F'
        if 'sexo' in datos:
            sexo_map = {'masculino': 'M', 'femenino': 'F', 'male': 'M', 'female': 'F',
                        'm': 'M', 'f': 'F'}
            raw = str(datos['sexo']).lower()
            datos['sexo'] = sexo_map.get(raw, datos['sexo'])

        # Excluir campos que no se deben insertar directamente:
        # - user_id: ya es el parámetro de ruta
        # - imc: columna generada automáticamente por la BD (peso_kg, altura_cm)
        EXCLUIR = {"user_id", "imc"}
        campos = [k for k in datos if k not in EXCLUIR]

        if not campos:
            raise HTTPException(status_code=400, detail="No hay campos válidos para actualizar")

        set_clause = ", ".join(f"{c} = %s" for c in campos)
        # Serializar dicts/lists como JSON para columnas JSONB (ej. antecedentes_familiares)
        valores = [PgJson(datos[c]) if isinstance(datos[c], (dict, list)) else datos[c] for c in campos]

        with get_db_cursor() as cur:
            cur.execute(f"""
                INSERT INTO perfiles_usuarios (user_id, {', '.join(campos)})
                VALUES (%s, {', '.join(['%s'] * len(campos))})
                ON CONFLICT (user_id) DO UPDATE SET {set_clause},
                    updated_at = NOW()
                RETURNING *
            """, [user_id] + valores + valores)
            return dict(cur.fetchone())
    except HTTPException:
        raise
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

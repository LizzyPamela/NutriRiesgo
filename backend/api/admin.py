"""
Endpoints del dashboard de auditoría/administración
Usa las vistas analíticas del schema de BD.
"""

from fastapi import APIRouter, HTTPException
import asyncio

router = APIRouter()


@router.get(
    "/resumen",
    summary="Resumen general del sistema para el investigador",
    description="Métricas de uso vía vistas analíticas: usuarios, consultas, abstenciones, derivaciones, KB y costos"
)
async def obtener_resumen():
    try:
        from utils.database import get_db_cursor

        def _fetch():
            with get_db_cursor() as cur:

                # ── vista_metricas_chat: últimos 7 días ────────────────────
                cur.execute("""
                    SELECT
                        fecha,
                        total_consultas,
                        usuarios_unicos,
                        consultas_con_abstension,
                        consultas_con_derivacion,
                        evaluaciones_positivas,
                        evaluaciones_negativas,
                        tiempo_promedio_ms,
                        costo_total_dia
                    FROM vista_metricas_chat
                    ORDER BY fecha DESC
                    LIMIT 7
                """)
                metricas_dias = [
                    {**dict(r), "fecha": str(r["fecha"])}
                    for r in cur.fetchall()
                ]

                # Totales agregados de esa vista
                cur.execute("""
                    SELECT
                        COALESCE(SUM(total_consultas), 0)          AS consultas_total,
                        COALESCE(SUM(usuarios_unicos), 0)          AS usuarios_activos_total,
                        COALESCE(SUM(consultas_con_abstension), 0) AS abstenciones_total,
                        COALESCE(SUM(consultas_con_derivacion), 0) AS derivaciones_total,
                        COALESCE(SUM(evaluaciones_positivas), 0)   AS positivas_total,
                        COALESCE(SUM(evaluaciones_negativas), 0)   AS negativas_total,
                        COALESCE(ROUND(AVG(tiempo_promedio_ms)::numeric, 0), 0) AS tiempo_promedio_ms,
                        COALESCE(SUM(costo_total_dia), 0)          AS costo_total_usd
                    FROM vista_metricas_chat
                """)
                totales = dict(cur.fetchone())

                consultas_total   = int(totales["consultas_total"])
                abstenciones_total = int(totales["abstenciones_total"])

                # Hoy
                cur.execute("""
                    SELECT COALESCE(total_consultas, 0) AS hoy
                    FROM vista_metricas_chat
                    WHERE fecha = CURRENT_DATE
                """)
                row_hoy = cur.fetchone()
                consultas_hoy = int(row_hoy["hoy"]) if row_hoy else 0

                # ── Usuarios totales y nuevos esta semana ──────────────────
                cur.execute("SELECT COUNT(*) AS total FROM perfiles_usuarios")
                usuarios_total = int(cur.fetchone()["total"])

                cur.execute("""
                    SELECT COUNT(*) AS total FROM perfiles_usuarios
                    WHERE created_at >= NOW() - INTERVAL '7 days'
                """)
                usuarios_semana = int(cur.fetchone()["total"])

                # ── vista_distribucion_riesgo ──────────────────────────────
                cur.execute("""
                    SELECT
                        categoria_riesgo,
                        num_usuarios,
                        edad_promedio,
                        imc_promedio,
                        usuarios_derivacion,
                        hombres,
                        mujeres
                    FROM vista_distribucion_riesgo
                """)
                distribucion_riesgo = [dict(r) for r in cur.fetchall()]

                # ── vista_resumen_conocimiento (KB / RAG) ──────────────────
                cur.execute("""
                    SELECT
                        autoridad,
                        tipo_doc,
                        nivel_evidencia,
                        total_chunks,
                        chunks_con_embedding
                    FROM vista_resumen_conocimiento
                    ORDER BY autoridad, tipo_doc
                """)
                resumen_kb = [dict(r) for r in cur.fetchall()]

                # ── vista_resumen_alimentos ────────────────────────────────
                cur.execute("""
                    SELECT
                        categoria,
                        total_alimentos,
                        alimentos_hondurenos,
                        promedio_calorias,
                        promedio_completitud
                    FROM vista_resumen_alimentos
                    ORDER BY total_alimentos DESC
                    LIMIT 10
                """)
                resumen_alimentos = [dict(r) for r in cur.fetchall()]

                # ── Actividad reciente (últimas 10 consultas) ─────────────
                cur.execute("""
                    SELECT
                        id,
                        LEFT(consulta, 80)  AS consulta_preview,
                        abstension,
                        derivacion,
                        nivel_confianza,
                        tipo_consulta,
                        tiempo_respuesta_ms,
                        costo_usd,
                        created_at
                    FROM conversaciones
                    ORDER BY created_at DESC
                    LIMIT 10
                """)
                actividad_reciente = [
                    {**dict(r), "created_at": str(r["created_at"]), "id": str(r["id"])}
                    for r in cur.fetchall()
                ]

                # ── Logs del sistema (últimos 20) ─────────────────────────
                cur.execute("""
                    SELECT
                        id,
                        nivel,
                        mensaje,
                        detalles,
                        created_at
                    FROM logs_sistema
                    ORDER BY created_at DESC
                    LIMIT 20
                """)
                logs_sistema = [
                    {**dict(r), "created_at": str(r["created_at"]), "id": str(r["id"])}
                    for r in cur.fetchall()
                ]

                # Conteo por nivel
                cur.execute("""
                    SELECT nivel, COUNT(*) AS cantidad
                    FROM logs_sistema
                    GROUP BY nivel
                    ORDER BY cantidad DESC
                """)
                logs_por_nivel = [dict(r) for r in cur.fetchall()]

                return {
                    "usuarios": {
                        "total": usuarios_total,
                        "esta_semana": usuarios_semana,
                    },
                    "consultas": {
                        "total": consultas_total,
                        "hoy": consultas_hoy,
                        "por_dia": list(reversed(metricas_dias)),   # cronológico
                    },
                    "abstenciones": {
                        "total": abstenciones_total,
                        "pct": round(abstenciones_total / consultas_total * 100, 1) if consultas_total else 0,
                    },
                    "derivaciones": {
                        "total": int(totales["derivaciones_total"]),
                        "pct": round(int(totales["derivaciones_total"]) / usuarios_total * 100, 1) if usuarios_total else 0,
                    },
                    "satisfaccion": {
                        "positivas": int(totales["positivas_total"]),
                        "negativas": int(totales["negativas_total"]),
                        "pct_positivo": round(
                            int(totales["positivas_total"]) /
                            (int(totales["positivas_total"]) + int(totales["negativas_total"])) * 100, 1
                        ) if (int(totales["positivas_total"]) + int(totales["negativas_total"])) > 0 else None,
                    },
                    "rendimiento": {
                        "tiempo_promedio_ms": int(totales["tiempo_promedio_ms"]),
                    },
                    "costo_usd": {
                        "total": round(float(totales["costo_total_usd"]), 4),
                        "promedio_por_consulta": round(
                            float(totales["costo_total_usd"]) / consultas_total, 5
                        ) if consultas_total else 0,
                    },
                    "distribucion_riesgo": distribucion_riesgo,
                    "knowledge_base": resumen_kb,
                    "alimentos_db": resumen_alimentos,
                    "actividad_reciente": actividad_reciente,
                    "logs_sistema": {
                        "recientes": logs_sistema,
                        "por_nivel": logs_por_nivel,
                    },
                }

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _fetch)

    except Exception as e:
        print(f"Error en /admin/resumen: {e}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo resumen: {str(e)}")

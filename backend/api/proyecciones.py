"""
Endpoint de proyección de enfermedades crónicas no transmisibles (ECNT).

MOTOR DE RIESGO — dos fuentes independientes que se suman:
  1. Score de perfil  — IMC, cintura, edad, sexo, actividad física, antecedentes
  2. Score dietético  — análisis de patrones alimentarios de los últimos 30 días

El score dietético puede generar riesgo ALTO incluso con perfil limpio:
un usuario joven sin antecedentes que consume diariamente exceso de sodio,
carbohidratos refinados y calorías puede tener riesgo moderado/alto de
HTA, pre-diabetes u obesidad basado únicamente en su comportamiento.

APRENDIZAJE DEL USUARIO:
  - Se analizan los últimos 30 días, comparando semana reciente (días 1-7)
    vs semana anterior (días 8-14) para detectar tendencias (mejorando/
    empeorando/estable).
  - El patrón dietético se clasifica cualitativamente
    (hipercalórica, hiperglucémica, hipernatrémica, etc.)
  - Cuantos más días de datos, más precisa la proyección.

Sin alucinaciones: el cálculo de puntaje es determinístico.
El campo `evidencia` usa búsqueda RAG sobre guías ECNT indexadas.
"""

from __future__ import annotations

import asyncio
import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from utils.database import get_db_cursor
from services.embeddings_service import get_embeddings_service

router = APIRouter()


# ─────────────────────────── Modelos de respuesta ────────────────────────────

class FactorRiesgo(BaseModel):
    factor: str
    presente: bool
    descripcion: str
    fuente: str  # "perfil" | "dieta" | "tendencia"


class PatronDieta(BaseModel):
    etiqueta: str           # "hipercalórica", "hiperglucémica", etc.
    descripcion: str
    dias_analizados: int
    dias_recientes: int     # últimos 7
    tendencia: str          # "mejorando" | "empeorando" | "estable" | "sin_datos"
    tendencia_detalle: str


class EvidenciaChunk(BaseModel):
    texto: str
    autoridad: str
    similitud: float


class ProyeccionEnfermedad(BaseModel):
    enfermedad: str
    nombre: str
    riesgo: str             # "bajo" | "moderado" | "alto"
    puntaje: int            # 0–100
    puntaje_perfil: int     # aporte del perfil clínico
    puntaje_dieta: int      # aporte de los hábitos alimenticios
    factores_presentes: List[FactorRiesgo]
    patron_dieta: PatronDieta
    evidencia: List[EvidenciaChunk]


class ProyeccionesResponse(BaseModel):
    user_id: str
    proyecciones: List[ProyeccionEnfermedad]
    resumen_dieta: Dict[str, Any]
    nota: str


# ──────────────────────────── Análisis de ingesta ────────────────────────────

def _analizar_ingesta(user_id: str) -> Dict[str, Any]:
    """
    Extrae y procesa los registros de los últimos 30 días.
    Devuelve promedios, patrones y tendencias.
    Solo usa columnas que existen en registros_comidas.
    Sodio y fibra se extraen del JSONB alimentos si están disponibles.
    """
    try:
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT
                    fecha,
                    tiempo_comida,
                    alimentos,
                    COALESCE(total_calorias, 0)         AS kcal,
                    COALESCE(total_carbohidratos_g, 0)  AS carbs,
                    COALESCE(total_proteina_g, 0)       AS prot,
                    COALESCE(total_grasas_g, 0)         AS grasas
                FROM registros_comidas
                WHERE user_id = %s
                  AND fecha >= CURRENT_DATE - INTERVAL '30 days'
                ORDER BY fecha DESC
            """, (user_id,))
            rows = [dict(r) for r in cur.fetchall()]
    except Exception:
        return {"sin_datos": True}

    if not rows:
        return {"sin_datos": True}

    # ── Extraer sodio y fibra del JSONB alimentos (si el alimento los trae) ──
    def _extraer_nutrientes(alimentos_json) -> Tuple[float, float]:
        """Retorna (sodio_mg, fibra_g) sumados del listado de alimentos."""
        sodio = fibra = 0.0
        items = alimentos_json if isinstance(alimentos_json, list) else []
        for item in items:
            if isinstance(item, dict):
                sodio += float(item.get("sodio_mg", 0) or 0)
                fibra += float(item.get("fibra_g", 0) or 0)
        return sodio, fibra

    for r in rows:
        s, f = _extraer_nutrientes(r.get("alimentos") or [])
        r["sodio_mg"] = s
        r["fibra_g"] = f

    total = len(rows)
    dias_set = {r["fecha"] for r in rows}
    dias_totales = len(dias_set)

    # ── Dividir en semana reciente vs semana anterior ─────────────────────────
    hoy = datetime.date.today()
    corte_reciente = hoy - datetime.timedelta(days=7)
    corte_anterior = hoy - datetime.timedelta(days=14)

    recientes  = [r for r in rows if r["fecha"] >= corte_reciente]
    anteriores = [r for r in rows if corte_anterior <= r["fecha"] < corte_reciente]

    def _promediar(registros: list) -> Dict[str, float]:
        if not registros:
            return {}
        n = len(registros)
        return {
            "kcal":    sum(r["kcal"]   for r in registros) / n,
            "carbs":   sum(r["carbs"]  for r in registros) / n,
            "prot":    sum(r["prot"]   for r in registros) / n,
            "grasas":  sum(r["grasas"] for r in registros) / n,
            "sodio":   sum(r["sodio_mg"] for r in registros) / n,
            "fibra":   sum(r["fibra_g"]  for r in registros) / n,
            "n":       n,
        }

    prom_total    = _promediar(rows)
    prom_reciente = _promediar(recientes)
    prom_anterior = _promediar(anteriores)

    # ── Calcular %VCT ─────────────────────────────────────────────────────────
    kcal = prom_total["kcal"] or 1
    pct_carbs  = (prom_total["carbs"] * 4 / kcal) * 100
    pct_prot   = (prom_total["prot"]  * 4 / kcal) * 100
    pct_grasas = (prom_total["grasas"] * 9 / kcal) * 100

    # ── Tendencia ─────────────────────────────────────────────────────────────
    tendencia = "sin_datos"
    tendencia_detalle = "Insuficientes datos para detectar tendencia (se necesitan >7 dias en los ultimos 14)."

    if prom_reciente and prom_anterior:
        delta_kcal  = prom_reciente["kcal"]  - prom_anterior["kcal"]
        delta_sodio = prom_reciente["sodio"] - prom_anterior["sodio"]
        delta_carbs = prom_reciente["carbs"] - prom_anterior["carbs"]
        delta_fibra = prom_reciente["fibra"] - prom_anterior["fibra"]

        # Score combinado de mejora (negativo = empeorando)
        mejora = 0
        if delta_kcal  < -100: mejora += 1
        elif delta_kcal > 100: mejora -= 1
        if delta_sodio < -200: mejora += 1
        elif delta_sodio > 200: mejora -= 1
        if delta_carbs < -10:  mejora += 1
        elif delta_carbs > 10: mejora -= 1
        if delta_fibra > 2:    mejora += 1
        elif delta_fibra < -2: mejora -= 1

        if mejora >= 2:
            tendencia = "mejorando"
            tendencia_detalle = (
                f"Esta semana consumes menos calorias ({delta_kcal:+.0f} kcal), "
                f"menos sodio ({delta_sodio:+.0f} mg) y mas fibra ({delta_fibra:+.1f} g) que la semana pasada."
            )
        elif mejora <= -2:
            tendencia = "empeorando"
            tendencia_detalle = (
                f"Esta semana empeoraron tus habitos: {delta_kcal:+.0f} kcal, "
                f"{delta_sodio:+.0f} mg sodio, fibra {delta_fibra:+.1f} g vs semana anterior."
            )
        else:
            tendencia = "estable"
            tendencia_detalle = "Tus habitos alimenticios se mantienen similares respecto a la semana anterior."

    # ── Patrones de comportamiento ────────────────────────────────────────────
    dias_desayuno  = len({r["fecha"] for r in rows if r["tiempo_comida"] == "desayuno"})
    dias_cena      = len({r["fecha"] for r in rows if r["tiempo_comida"] == "cena"})
    # Días con >2500 kcal en TOTAL por fecha
    kcal_por_dia: Dict[Any, float] = {}
    for r in rows:
        d = r["fecha"]
        kcal_por_dia[d] = kcal_por_dia.get(d, 0) + r["kcal"]
    dias_hipercaloricos = sum(1 for v in kcal_por_dia.values() if v > 2500)
    dias_sin_desayuno   = dias_totales - dias_desayuno

    return {
        "sin_datos":           False,
        "total_registros":     total,
        "dias_con_datos":      dias_totales,
        "dias_recientes":      len({r["fecha"] for r in recientes}),
        "avg_kcal":            round(prom_total["kcal"], 1),
        "avg_carbs_g":         round(prom_total["carbs"], 1),
        "avg_prot_g":          round(prom_total["prot"], 1),
        "avg_grasas_g":        round(prom_total["grasas"], 1),
        "avg_sodio_mg":        round(prom_total["sodio"], 1),
        "avg_fibra_g":         round(prom_total["fibra"], 1),
        "pct_carbs":           round(pct_carbs, 1),
        "pct_grasas":          round(pct_grasas, 1),
        "pct_prot":            round(pct_prot, 1),
        "tendencia":           tendencia,
        "tendencia_detalle":   tendencia_detalle,
        "dias_sin_desayuno":   dias_sin_desayuno,
        "dias_hipercaloricos": dias_hipercaloricos,
        # Semana reciente (para comparativas en frontend)
        "reciente_kcal":   round(prom_reciente.get("kcal", 0), 1),
        "reciente_sodio":  round(prom_reciente.get("sodio", 0), 1),
        "reciente_fibra":  round(prom_reciente.get("fibra", 0), 1),
        "reciente_carbs":  round(prom_reciente.get("carbs", 0), 1),
    }


def _clasificar_patron(d: Dict[str, Any]) -> str:
    """Etiqueta cualitativa del patrón dietético dominante."""
    if d.get("sin_datos"):
        return "sin_registro"
    pct_carbs  = d.get("pct_carbs", 0)
    pct_grasas = d.get("pct_grasas", 0)
    avg_sodio  = d.get("avg_sodio_mg", 0)
    avg_fibra  = d.get("avg_fibra_g", 0)
    avg_kcal   = d.get("avg_kcal", 0)
    patrones = []
    if avg_kcal > 2500:     patrones.append("hipercalórica")
    if pct_carbs > 65:      patrones.append("hiperglucémica")
    if avg_sodio > 2000:    patrones.append("hipernatrémica")
    if pct_grasas > 35:     patrones.append("hiperlipídica")
    if avg_fibra < 15:      patrones.append("baja en fibra")
    return ", ".join(patrones) if patrones else "equilibrada"


# ──────────────────── Puntuación dietética por enfermedad ────────────────────

def _score_dieta_diabetes(d: Dict) -> Tuple[int, List[FactorRiesgo]]:
    factores: List[FactorRiesgo] = []
    score = 0
    if d.get("sin_datos"):
        return 0, []

    pct_carbs = d.get("pct_carbs", 0)
    avg_fibra = d.get("avg_fibra_g", 99)
    avg_kcal  = d.get("avg_kcal", 0)
    dias_sin_des = d.get("dias_sin_desayuno", 0)
    dias_datos   = d.get("dias_con_datos", 1) or 1
    tendencia    = d.get("tendencia", "sin_datos")
    dias_hiper   = d.get("dias_hipercaloricos", 0)

    # Carbohidratos >65% VCT — carga glucémica elevada
    if pct_carbs > 70:
        score += 25
        factores.append(FactorRiesgo(
            factor="Carga glucémica muy alta (>70% VCT en carbohidratos)",
            presente=True, fuente="dieta",
            descripcion=f"Promedio: {pct_carbs:.0f}% VCT. Dieta muy alta en carbohidratos eleva glucemia en ayunas y posprandial, indicador temprano de pre-diabetes.",
        ))
    elif pct_carbs > 65:
        score += 15
        factores.append(FactorRiesgo(
            factor="Exceso de carbohidratos en dieta (65-70% VCT)",
            presente=True, fuente="dieta",
            descripcion=f"Promedio: {pct_carbs:.0f}% VCT. Supera el límite recomendado (45-65%). Asociado a resistencia a la insulina progresiva.",
        ))
    else:
        factores.append(FactorRiesgo(
            factor="Carbohidratos dentro del rango recomendado",
            presente=False, fuente="dieta",
            descripcion=f"Promedio: {pct_carbs:.0f}% VCT. Factor protector.",
        ))

    # Fibra baja — acelera absorción de glucosa
    if avg_fibra < 10:
        score += 20
        factores.append(FactorRiesgo(
            factor="Consumo de fibra muy bajo (<10 g/registro)",
            presente=True, fuente="dieta",
            descripcion=f"Promedio: {avg_fibra:.1f} g/registro. La fibra dietética regula la absorción de glucosa. Ingesta <10 g es un predictor independiente de diabetes tipo 2.",
        ))
    elif avg_fibra < 20:
        score += 10
        factores.append(FactorRiesgo(
            factor="Consumo de fibra insuficiente (10-20 g/registro)",
            presente=True, fuente="dieta",
            descripcion=f"Promedio: {avg_fibra:.1f} g/registro. Meta: ≥25-30 g/día. La fibra soluble reduce la respuesta glucémica posprandial.",
        ))
    else:
        factores.append(FactorRiesgo(
            factor="Consumo de fibra adecuado",
            presente=False, fuente="dieta",
            descripcion=f"Promedio: {avg_fibra:.1f} g/registro. Factor protector contra diabetes.",
        ))

    # Días hipercalóricos frecuentes
    pct_hiper = (dias_hiper / dias_datos) * 100
    if pct_hiper > 50:
        score += 15
        factores.append(FactorRiesgo(
            factor=f"Patrón hipercalórico frecuente ({dias_hiper}/{dias_datos} días >2500 kcal)",
            presente=True, fuente="dieta",
            descripcion="Exceso calórico sostenido genera acumulación de grasa visceral y resistencia a la insulina, incluso antes de que el IMC se vea afectado.",
        ))
    elif pct_hiper > 25:
        score += 8
        factores.append(FactorRiesgo(
            factor=f"Días hipercalóricos ocasionales ({dias_hiper}/{dias_datos} días >2500 kcal)",
            presente=True, fuente="dieta",
            descripcion="Episodios frecuentes de exceso calórico pueden contribuir al deterioro de la sensibilidad a la insulina.",
        ))

    # Omisión frecuente del desayuno
    pct_sin_des = (dias_sin_des / dias_datos) * 100 if dias_datos > 0 else 0
    if pct_sin_des > 50:
        score += 10
        factores.append(FactorRiesgo(
            factor=f"Omisión frecuente del desayuno ({dias_sin_des}/{dias_datos} días)",
            presente=True, fuente="dieta",
            descripcion="Saltarse el desayuno frecuentemente aumenta la glucemia posprandial del almuerzo y está asociado a mayor riesgo de diabetes tipo 2.",
        ))

    # Tendencia empeorando
    if tendencia == "empeorando":
        score += 10
        factores.append(FactorRiesgo(
            factor="Tendencia dietética empeorando esta semana",
            presente=True, fuente="tendencia",
            descripcion=d.get("tendencia_detalle", "Hábitos recientes peores que la semana anterior."),
        ))
    elif tendencia == "mejorando":
        score = max(0, score - 8)
        factores.append(FactorRiesgo(
            factor="Tendencia dietética mejorando",
            presente=False, fuente="tendencia",
            descripcion=d.get("tendencia_detalle", "Hábitos recientes mejores que la semana anterior."),
        ))

    return min(score, 60), factores  # Máx 60 puntos desde dieta


def _score_dieta_hta(d: Dict) -> Tuple[int, List[FactorRiesgo]]:
    factores: List[FactorRiesgo] = []
    score = 0
    if d.get("sin_datos"):
        return 0, []

    avg_sodio  = d.get("avg_sodio_mg", 0)
    avg_fibra  = d.get("avg_fibra_g", 99)
    pct_grasas = d.get("pct_grasas", 0)
    avg_kcal   = d.get("avg_kcal", 0)
    tendencia  = d.get("tendencia", "sin_datos")
    dias_datos = d.get("dias_con_datos", 1) or 1
    dias_hiper = d.get("dias_hipercaloricos", 0)

    # Sodio — factor principal de HTA
    if avg_sodio > 3000:
        score += 30
        factores.append(FactorRiesgo(
            factor=f"Ingesta de sodio muy alta (promedio {avg_sodio:.0f} mg/registro)",
            presente=True, fuente="dieta",
            descripcion=f"Supera 3000 mg/registro. La OMS recomienda <2000 mg/día. Ingesta crónica alta de sodio es el principal factor dietético de hipertensión arterial.",
        ))
    elif avg_sodio > 2000:
        score += 20
        factores.append(FactorRiesgo(
            factor=f"Ingesta de sodio elevada (promedio {avg_sodio:.0f} mg/registro)",
            presente=True, fuente="dieta",
            descripcion=f"Supera los 2000 mg recomendados. Reducir 1000 mg/día puede bajar 5 mmHg la presión sistólica.",
        ))
    elif avg_sodio > 0:
        factores.append(FactorRiesgo(
            factor="Sodio dentro de límites aceptables",
            presente=False, fuente="dieta",
            descripcion=f"Promedio: {avg_sodio:.0f} mg/registro. Factor protector.",
        ))

    # Fibra baja → bajo potasio inferido (dieta pobre en vegetales/frutas)
    if avg_fibra < 10:
        score += 15
        factores.append(FactorRiesgo(
            factor="Dieta baja en fibra — posible déficit de potasio",
            presente=True, fuente="dieta",
            descripcion=f"Fibra: {avg_fibra:.1f} g/registro. Dieta baja en frutas/verduras implica bajo aporte de potasio, mineral que contrarresta el efecto presor del sodio.",
        ))
    elif avg_fibra < 20:
        score += 7
        factores.append(FactorRiesgo(
            factor="Consumo de fibra/potasio por debajo de lo óptimo",
            presente=True, fuente="dieta",
            descripcion=f"Fibra: {avg_fibra:.1f} g/registro. Aumentar frutas, verduras y legumbres ayuda a controlar la presión arterial.",
        ))

    # Exceso calórico → ganancia de peso → HTA
    pct_hiper = (dias_hiper / dias_datos) * 100 if dias_datos > 0 else 0
    if pct_hiper > 40:
        score += 10
        factores.append(FactorRiesgo(
            factor=f"Exceso calórico frecuente ({dias_hiper}/{dias_datos} días >2500 kcal)",
            presente=True, fuente="dieta",
            descripcion="El exceso calórico crónico favorece ganancia de peso, que es el segundo factor dietético más importante en el desarrollo de HTA.",
        ))

    # Grasas altas
    if pct_grasas > 40:
        score += 10
        factores.append(FactorRiesgo(
            factor=f"Dieta alta en grasas ({pct_grasas:.0f}% VCT)",
            presente=True, fuente="dieta",
            descripcion="Dietas con exceso de grasas saturadas elevan el LDL y contribuyen al daño vascular que precede a la hipertensión.",
        ))

    # Tendencia
    if tendencia == "empeorando":
        score += 8
        factores.append(FactorRiesgo(
            factor="Tendencia dietética empeorando",
            presente=True, fuente="tendencia",
            descripcion=d.get("tendencia_detalle", ""),
        ))
    elif tendencia == "mejorando":
        score = max(0, score - 8)
        factores.append(FactorRiesgo(
            factor="Tendencia dietética mejorando",
            presente=False, fuente="tendencia",
            descripcion=d.get("tendencia_detalle", ""),
        ))

    return min(score, 60), factores


def _score_dieta_cardio(d: Dict) -> Tuple[int, List[FactorRiesgo]]:
    factores: List[FactorRiesgo] = []
    score = 0
    if d.get("sin_datos"):
        return 0, []

    pct_grasas = d.get("pct_grasas", 0)
    avg_fibra  = d.get("avg_fibra_g", 99)
    avg_sodio  = d.get("avg_sodio_mg", 0)
    avg_kcal   = d.get("avg_kcal", 0)
    tendencia  = d.get("tendencia", "sin_datos")
    dias_datos = d.get("dias_con_datos", 1) or 1
    dias_hiper = d.get("dias_hipercaloricos", 0)

    # Grasas altas — LDL elevado → aterosclerosis
    if pct_grasas > 40:
        score += 25
        factores.append(FactorRiesgo(
            factor=f"Dieta muy alta en grasas ({pct_grasas:.0f}% VCT)",
            presente=True, fuente="dieta",
            descripcion=f"Supera el 40% VCT. Dietas ricas en grasas saturadas elevan LDL-colesterol, acelerando el proceso aterosclerótico y el riesgo de infarto.",
        ))
    elif pct_grasas > 35:
        score += 15
        factores.append(FactorRiesgo(
            factor=f"Exceso de grasas en dieta ({pct_grasas:.0f}% VCT)",
            presente=True, fuente="dieta",
            descripcion=f"Supera el límite recomendado (20-35% VCT). Reducir grasas saturadas y trans disminuye el riesgo cardiovascular un 25-30%.",
        ))
    else:
        factores.append(FactorRiesgo(
            factor="Grasas dentro de rango recomendado",
            presente=False, fuente="dieta",
            descripcion=f"Promedio: {pct_grasas:.0f}% VCT. Factor protector.",
        ))

    # Fibra baja → sin protección cardioprotectora
    if avg_fibra < 15:
        score += 15
        factores.append(FactorRiesgo(
            factor=f"Fibra insuficiente ({avg_fibra:.1f} g/registro) — sin efecto cardioprotector",
            presente=True, fuente="dieta",
            descripcion="La fibra soluble reduce el LDL-colesterol entre 5-10%. Consumo bajo elimina este efecto protector cardiovascular.",
        ))

    # Sodio alto → HTA → daño cardiovascular
    if avg_sodio > 2500:
        score += 15
        factores.append(FactorRiesgo(
            factor=f"Sodio alto ({avg_sodio:.0f} mg/registro) — daño vascular progresivo",
            presente=True, fuente="dieta",
            descripcion="El exceso crónico de sodio genera hipertensión que daña silenciosamente el miocardio y las arterias coronarias.",
        ))

    # Exceso calórico
    pct_hiper = (dias_hiper / dias_datos) * 100 if dias_datos > 0 else 0
    if pct_hiper > 40:
        score += 10
        factores.append(FactorRiesgo(
            factor=f"Exceso calórico frecuente ({pct_hiper:.0f}% de los días)",
            presente=True, fuente="dieta",
            descripcion="El balance energético positivo crónico eleva triglicéridos y contribuye al síndrome metabólico, precursor de enfermedad cardiovascular.",
        ))

    if tendencia == "empeorando":
        score += 8
        factores.append(FactorRiesgo(
            factor="Tendencia dietética empeorando",
            presente=True, fuente="tendencia",
            descripcion=d.get("tendencia_detalle", ""),
        ))
    elif tendencia == "mejorando":
        score = max(0, score - 8)
        factores.append(FactorRiesgo(
            factor="Tendencia dietética mejorando",
            presente=False, fuente="tendencia",
            descripcion=d.get("tendencia_detalle", ""),
        ))

    return min(score, 60), factores


def _score_dieta_obesidad(d: Dict) -> Tuple[int, List[FactorRiesgo]]:
    factores: List[FactorRiesgo] = []
    score = 0
    if d.get("sin_datos"):
        return 0, []

    avg_kcal     = d.get("avg_kcal", 0)
    pct_grasas   = d.get("pct_grasas", 0)
    pct_carbs    = d.get("pct_carbs", 0)
    avg_fibra    = d.get("avg_fibra_g", 99)
    dias_sin_des = d.get("dias_sin_desayuno", 0)
    dias_datos   = d.get("dias_con_datos", 1) or 1
    dias_hiper   = d.get("dias_hipercaloricos", 0)
    tendencia    = d.get("tendencia", "sin_datos")

    # Balance calórico positivo — motor principal de obesidad
    if avg_kcal > 3000:
        score += 30
        factores.append(FactorRiesgo(
            factor=f"Ingesta calórica muy alta (promedio {avg_kcal:.0f} kcal/registro)",
            presente=True, fuente="dieta",
            descripcion="Exceso calórico severo y sostenido. Cada 3500 kcal extra acumuladas equivalen a ~0.5 kg de grasa corporal.",
        ))
    elif avg_kcal > 2500:
        score += 20
        factores.append(FactorRiesgo(
            factor=f"Ingesta calórica elevada (promedio {avg_kcal:.0f} kcal/registro)",
            presente=True, fuente="dieta",
            descripcion="Supera el promedio de necesidades energéticas. Exceso calórico habitual favorece ganancia de peso progresiva.",
        ))

    # Patrón hipercalórico frecuente
    pct_hiper = (dias_hiper / dias_datos) * 100 if dias_datos > 0 else 0
    if pct_hiper > 50:
        score += 20
        factores.append(FactorRiesgo(
            factor=f"Días hipercalóricos la mayoría del tiempo ({dias_hiper}/{dias_datos} días)",
            presente=True, fuente="dieta",
            descripcion="Más de la mitad de los días registrados superan las 2500 kcal. Patrón asociado a ganancia sostenida de peso.",
        ))
    elif pct_hiper > 25:
        score += 10
        factores.append(FactorRiesgo(
            factor=f"Días hipercalóricos frecuentes ({dias_hiper}/{dias_datos} días >2500 kcal)",
            presente=True, fuente="dieta",
            descripcion="Episodios frecuentes de exceso calórico. Aunque compensados, generan balance positivo acumulado.",
        ))

    # Combinación grasas + carbs altos = densidad energética máxima
    if pct_grasas > 35 and pct_carbs > 55:
        score += 15
        factores.append(FactorRiesgo(
            factor=f"Dieta de alta densidad energética (grasas {pct_grasas:.0f}% + carbs {pct_carbs:.0f}%)",
            presente=True, fuente="dieta",
            descripcion="La combinación de alto contenido en grasas y carbohidratos maximiza la densidad calórica y dificulta la saciedad.",
        ))

    # Fibra baja → saciedad reducida → más ingesta
    if avg_fibra < 10:
        score += 10
        factores.append(FactorRiesgo(
            factor=f"Fibra muy baja ({avg_fibra:.1f} g/registro) — saciedad comprometida",
            presente=True, fuente="dieta",
            descripcion="La fibra genera saciedad. Consumo muy bajo puede llevar a comer más en cada comida y entre comidas.",
        ))

    # Saltar desayuno → compensación calórica posterior
    pct_sin_des = (dias_sin_des / dias_datos) * 100 if dias_datos > 0 else 0
    if pct_sin_des > 50:
        score += 10
        factores.append(FactorRiesgo(
            factor=f"Omisión frecuente del desayuno ({dias_sin_des}/{dias_datos} días)",
            presente=True, fuente="dieta",
            descripcion="Saltarse el desayuno más de la mitad de los días está asociado a mayor ingesta total diaria y acumulación de grasa abdominal.",
        ))

    if tendencia == "empeorando":
        score += 8
        factores.append(FactorRiesgo(
            factor="Tendencia dietética empeorando",
            presente=True, fuente="tendencia",
            descripcion=d.get("tendencia_detalle", ""),
        ))
    elif tendencia == "mejorando":
        score = max(0, score - 8)
        factores.append(FactorRiesgo(
            factor="Tendencia dietética mejorando",
            presente=False, fuente="tendencia",
            descripcion=d.get("tendencia_detalle", ""),
        ))

    return min(score, 60), factores


# ─────────────────── Score de perfil (igual que antes, tope 40 pts) ───────────

def _score_perfil_diabetes(perfil: Dict) -> Tuple[int, List[FactorRiesgo]]:
    factores: List[FactorRiesgo] = []
    score = 0
    imc    = perfil.get("imc") or 0
    edad   = perfil.get("edad") or 0
    ant_dm = (perfil.get("antecedentes_familiares") or {}).get("diabetes", False)
    activ  = perfil.get("actividad_fisica", "moderado")
    cintura = perfil.get("perimetro_cintura_cm") or 0
    sexo   = perfil.get("sexo", "M")
    lim    = 102 if sexo in ("M", "masculino", "male") else 88

    if imc >= 30:
        score += 15; factores.append(FactorRiesgo(factor="Obesidad (IMC ≥30)", presente=True, fuente="perfil",
            descripcion=f"IMC {imc:.1f}. Obesidad es el principal factor de riesgo modificable de diabetes."))
    elif imc >= 25:
        score += 8; factores.append(FactorRiesgo(factor="Sobrepeso (IMC 25-29)", presente=True, fuente="perfil",
            descripcion=f"IMC {imc:.1f}. Sobrepeso duplica el riesgo."))
    if ant_dm:
        score += 12; factores.append(FactorRiesgo(factor="Antecedente familiar diabetes", presente=True, fuente="perfil",
            descripcion="Incrementa el riesgo hasta 3x. Requiere vigilancia desde los 35 años."))
    if activ in ("sedentario", "bajo"):
        score += 8; factores.append(FactorRiesgo(factor="Actividad física insuficiente", presente=True, fuente="perfil",
            descripcion="Menos de 150 min/sem. Aumenta la resistencia a la insulina."))
    if edad >= 45:
        score += 5; factores.append(FactorRiesgo(factor="Edad ≥45 años", presente=True, fuente="perfil",
            descripcion="El riesgo aumenta progresivamente después de los 45 años."))
    if cintura > lim:
        score += 10; factores.append(FactorRiesgo(factor="Obesidad abdominal", presente=True, fuente="perfil",
            descripcion=f"Cintura {cintura} cm (límite: {lim} cm). Grasa visceral = resistencia a insulina."))

    return min(score, 40), factores


def _score_perfil_hta(perfil: Dict) -> Tuple[int, List[FactorRiesgo]]:
    factores: List[FactorRiesgo] = []
    score = 0
    imc    = perfil.get("imc") or 0
    edad   = perfil.get("edad") or 0
    ant    = perfil.get("antecedentes_familiares") or {}
    activ  = perfil.get("actividad_fisica", "moderado")
    cintura = perfil.get("perimetro_cintura_cm") or 0
    sexo   = perfil.get("sexo", "M")
    lim    = 102 if sexo in ("M", "masculino", "male") else 88

    if imc >= 30:
        score += 15; factores.append(FactorRiesgo(factor="Obesidad", presente=True, fuente="perfil",
            descripcion=f"IMC {imc:.1f}. Cada 5 unidades de IMC aumenta el riesgo de HTA 38%."))
    elif imc >= 25:
        score += 8; factores.append(FactorRiesgo(factor="Sobrepeso", presente=True, fuente="perfil",
            descripcion=f"IMC {imc:.1f}. Bajar 5 kg puede reducir 5-10 mmHg."))
    if ant.get("hipertension") or ant.get("cardiopatia"):
        score += 12; factores.append(FactorRiesgo(factor="Antecedente familiar HTA/cardiopatía", presente=True, fuente="perfil",
            descripcion="Historia familiar positiva duplica el riesgo de HTA."))
    if cintura > lim:
        score += 8; factores.append(FactorRiesgo(factor="Obesidad abdominal", presente=True, fuente="perfil",
            descripcion=f"Cintura {cintura} cm. Grasa visceral activa el sistema renina-angiotensina."))
    if activ in ("sedentario", "bajo"):
        score += 5; factores.append(FactorRiesgo(factor="Sedentarismo", presente=True, fuente="perfil",
            descripcion="Ejercicio aeróbico regular reduce la PA sistólica 5-8 mmHg."))
    if edad >= 50:
        score += 5; factores.append(FactorRiesgo(factor="Edad ≥50 años", presente=True, fuente="perfil",
            descripcion="Aumenta la rigidez arterial y el riesgo de HTA."))

    return min(score, 40), factores


def _score_perfil_cardio(perfil: Dict) -> Tuple[int, List[FactorRiesgo]]:
    factores: List[FactorRiesgo] = []
    score = 0
    imc   = perfil.get("imc") or 0
    edad  = perfil.get("edad") or 0
    sexo  = perfil.get("sexo", "M")
    ant   = perfil.get("antecedentes_familiares") or {}
    activ = perfil.get("actividad_fisica", "moderado")
    cintura = perfil.get("perimetro_cintura_cm") or 0
    lim   = 102 if sexo in ("M", "masculino", "male") else 88
    riesgo_prev = perfil.get("riesgo_prevent") or 0

    if riesgo_prev >= 20:
        score += 20; factores.append(FactorRiesgo(factor=f"Score PREVENT elevado ({riesgo_prev:.0f}%)", presente=True, fuente="perfil",
            descripcion="Riesgo cardiovascular calculado muy alto."))
    elif riesgo_prev >= 10:
        score += 10; factores.append(FactorRiesgo(factor=f"Score PREVENT moderado ({riesgo_prev:.0f}%)", presente=True, fuente="perfil",
            descripcion="Riesgo cardiovascular moderado."))
    if ant.get("cardiopatia"):
        score += 12; factores.append(FactorRiesgo(factor="Antecedente familiar cardiopatía", presente=True, fuente="perfil",
            descripcion="Historia de infarto antes de 55/65 años en familiar directo."))
    if imc >= 30:
        score += 8; factores.append(FactorRiesgo(factor="Obesidad", presente=True, fuente="perfil",
            descripcion=f"IMC {imc:.1f}. Incrementa riesgo coronario, ACV e insuficiencia cardíaca."))
    if cintura > lim:
        score += 8; factores.append(FactorRiesgo(factor="Obesidad abdominal", presente=True, fuente="perfil",
            descripcion=f"Cintura {cintura} cm. Principal predictor cardiometabólico."))
    if activ in ("sedentario", "bajo"):
        score += 5; factores.append(FactorRiesgo(factor="Sedentarismo", presente=True, fuente="perfil",
            descripcion="Factor de riesgo cardiovascular equivalente al tabaquismo."))
    if (sexo in ("M", "masculino", "male") and edad >= 45) or \
       (sexo in ("F", "femenino", "female") and edad >= 55):
        score += 5; factores.append(FactorRiesgo(factor="Edad de riesgo cardiovascular", presente=True, fuente="perfil",
            descripcion=f"Edad {edad} años. El riesgo se duplica cada 10 años."))

    return min(score, 40), factores


def _score_perfil_obesidad(perfil: Dict) -> Tuple[int, List[FactorRiesgo]]:
    factores: List[FactorRiesgo] = []
    score = 0
    imc   = perfil.get("imc") or 0
    activ = perfil.get("actividad_fisica", "moderado")
    ant_obs = (perfil.get("antecedentes_familiares") or {}).get("obesidad", False)

    if imc >= 35:
        score += 35; factores.append(FactorRiesgo(factor="Obesidad clase II-III (IMC ≥35)", presente=True, fuente="perfil",
            descripcion=f"IMC {imc:.1f}. Requiere manejo multidisciplinario."))
    elif imc >= 30:
        score += 25; factores.append(FactorRiesgo(factor="Obesidad clase I (IMC 30-34)", presente=True, fuente="perfil",
            descripcion=f"IMC {imc:.1f}. Meta: perder 5-10% del peso en 6 meses."))
    elif imc >= 25:
        score += 12; factores.append(FactorRiesgo(factor="Sobrepeso (IMC 25-29)", presente=True, fuente="perfil",
            descripcion=f"IMC {imc:.1f}. Sin acción puede progresar a obesidad."))
    if activ in ("sedentario", "bajo"):
        score += 8; factores.append(FactorRiesgo(factor="Actividad física insuficiente", presente=True, fuente="perfil",
            descripcion="<150 min/semana. Favorece el balance energético positivo."))
    if ant_obs:
        score += 7; factores.append(FactorRiesgo(factor="Antecedente familiar obesidad", presente=True, fuente="perfil",
            descripcion="Predisposición genética a acumulación de grasa."))

    return min(score, 40), factores


# ──────────────────────────── Helpers generales ───────────────────────────────

def _nivel_riesgo(puntaje: int) -> str:
    if puntaje >= 55: return "alto"
    if puntaje >= 25: return "moderado"
    return "bajo"


async def _buscar_evidencia_ecnt(query: str, top_k: int = 3) -> List[EvidenciaChunk]:
    """Búsqueda RAG — corre en thread pool para no bloquear el event loop."""
    def _sync():
        emb = get_embeddings_service().generar_embedding(query)
        with get_db_cursor() as cur:
            cur.execute("""
                SELECT texto, autoridad,
                       1 - (embedding <=> %s::vector) AS similitud
                FROM knowledge_base
                WHERE version_kb = 'ecnt_v1'
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (emb, emb, top_k))
            rows = cur.fetchall()
        return [
            EvidenciaChunk(texto=r["texto"][:500], autoridad=r["autoridad"],
                           similitud=round(float(r["similitud"]), 3))
            for r in rows if r["similitud"] >= 0.25
        ]

    try:
        loop = asyncio.get_running_loop()
        return await asyncio.wait_for(
            loop.run_in_executor(None, _sync),
            timeout=8.0
        )
    except Exception:
        return []


# ──────────────────────────── Constantes compartidas ─────────────────────────

QUERIES_EVIDENCIA = {
    "diabetes_tipo2":  "factores riesgo diabetes tipo 2 glucemia carbohidratos fibra resistencia insulina",
    "hta":             "factores riesgo hipertension arterial sodio presion dieta",
    "cardiovascular":  "riesgo cardiovascular grasas colesterol LDL dieta corazon",
    "obesidad":        "obesidad exceso calorias sobrepeso intervencion nutricional",
}

NOMBRES = {
    "diabetes_tipo2": "Diabetes tipo 2",
    "hta":            "Hipertensión Arterial",
    "cardiovascular": "Enfermedad Cardiovascular",
    "obesidad":       "Obesidad",
}


# ──────────────────────── Endpoint lazy de evidencia ─────────────────────────
# IMPORTANTE: debe registrarse ANTES de /{user_id} para que FastAPI no
# interprete "evidencia" como un user_id.

@router.get(
    "/evidencia/{enfermedad}",
    response_model=List[EvidenciaChunk],
    summary="Evidencia RAG para una enfermedad (carga lazy)",
    description="Busca los chunks más relevantes de las guías ECNT para la enfermedad indicada.",
)
async def obtener_evidencia_enfermedad(enfermedad: str):
    enfermedades_validas = set(QUERIES_EVIDENCIA.keys())
    if enfermedad not in enfermedades_validas:
        raise HTTPException(
            status_code=400,
            detail=f"Enfermedad no reconocida. Opciones: {', '.join(enfermedades_validas)}"
        )
    query = QUERIES_EVIDENCIA[enfermedad]
    return await _buscar_evidencia_ecnt(query, top_k=3)


# ──────────────────────────── Endpoint principal ──────────────────────────────

@router.get(
    "/{user_id}",
    response_model=ProyeccionesResponse,
    summary="Proyección ECNT basada en perfil + análisis de ingesta",
    description="""
    Calcula la proyección de riesgo para 4 enfermedades crónicas combinando:

    **Score de perfil** (máx 40 pts): IMC, cintura, antecedentes, actividad, edad.

    **Score dietético** (máx 60 pts): patrones de los últimos 30 días del diario —
    carga glucémica, sodio, fibra, calidad de grasas, frecuencia de excesos,
    omisión de comidas. **Este score puede generar riesgo alto incluso sin
    antecedentes familiares si los hábitos son crónicamente malos.**

    La tendencia (mejorando/empeorando/estable) compara la semana reciente
    vs la semana anterior y ajusta el puntaje final.
    """,
)
async def obtener_proyecciones(user_id: str):
    # Todo el I/O síncrono (psycopg2) va a un único thread — nunca bloquea el event loop.
    def _fetch_datos():
        with get_db_cursor() as cur:
            cur.execute("SELECT * FROM perfiles_usuarios WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
        if not row:
            return None, None
        return dict(row), _analizar_ingesta(user_id)

    try:
        loop = asyncio.get_running_loop()
        perfil_dict, dieta = await asyncio.wait_for(
            loop.run_in_executor(None, _fetch_datos),
            timeout=7.0,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504,
            detail="La consulta tardó demasiado. Intenta de nuevo.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando datos: {e}")

    if perfil_dict is None:
        raise HTTPException(status_code=404,
            detail="Perfil no encontrado. Completa tu perfil primero.")

    p = perfil_dict

    # 3. Calcular scores por enfermedad
    calculos = {
        "diabetes_tipo2":  (_score_perfil_diabetes(p),  _score_dieta_diabetes(dieta)),
        "hta":             (_score_perfil_hta(p),        _score_dieta_hta(dieta)),
        "cardiovascular":  (_score_perfil_cardio(p),     _score_dieta_cardio(dieta)),
        "obesidad":        (_score_perfil_obesidad(p),   _score_dieta_obesidad(dieta)),
    }

    patron_etiqueta = _clasificar_patron(dieta)
    tendencia       = dieta.get("tendencia", "sin_datos")
    tendencia_det   = dieta.get("tendencia_detalle", "")
    dias_recientes  = dieta.get("dias_recientes", 0)
    dias_totales    = dieta.get("dias_con_datos", 0)

    patron_dieta_obj = PatronDieta(
        etiqueta=patron_etiqueta,
        descripcion=(
            "Dieta equilibrada sin patrones de riesgo detectados."
            if patron_etiqueta in ("equilibrada", "sin_registro")
            else f"Patrón dietético identificado: {patron_etiqueta}. "
                 "Este patrón aumenta el riesgo de las enfermedades relacionadas."
        ),
        dias_analizados=dias_totales,
        dias_recientes=dias_recientes,
        tendencia=tendencia,
        tendencia_detalle=tendencia_det,
    )

    # Sin RAG aquí — la evidencia se carga por demanda desde /proyecciones/evidencia/{enfermedad}
    proyecciones: List[ProyeccionEnfermedad] = []
    for enfermedad, ((sp, fp), (sd, fd)) in calculos.items():
        puntaje_total = min(sp + sd, 100)
        factores_todos = fp + fd
        proyecciones.append(ProyeccionEnfermedad(
            enfermedad=enfermedad,
            nombre=NOMBRES[enfermedad],
            riesgo=_nivel_riesgo(puntaje_total),
            puntaje=puntaje_total,
            puntaje_perfil=sp,
            puntaje_dieta=sd,
            factores_presentes=factores_todos,
            patron_dieta=patron_dieta_obj,
            evidencia=[],  # se llena lazy desde /evidencia/{enfermedad}
        ))

    # Ordenar alto → moderado → bajo
    proyecciones.sort(key=lambda x: {"alto": 0, "moderado": 1, "bajo": 2}[x.riesgo])

    # Resumen de dieta para el frontend
    resumen_dieta = {k: v for k, v in dieta.items()
                     if k not in ("sin_datos", "tendencia_detalle")}

    return ProyeccionesResponse(
        user_id=user_id,
        proyecciones=proyecciones,
        resumen_dieta=resumen_dieta,
        nota=(
            "Proyecciones basadas en análisis de perfil clínico y "
            f"{dias_totales} días de diario alimentario. "
            "El score dietético (máx 60 pts) puede generar riesgo moderado/alto "
            "incluso sin antecedentes familiares si los hábitos son desfavorables. "
            "No reemplazan el diagnóstico médico profesional."
        ),
    )

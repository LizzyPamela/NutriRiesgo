/**
 * Utilidades de calculo nutricional compartidas — Mifflin-St. Jeor (1990)
 * Usadas en Dashboard, Estadisticas, Recomendaciones y Perfil.
 */

const FACTORES_ACTIVIDAD: Record<string, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muy_intenso: 1.9,
};

/**
 * Normaliza el sexo a 'M' | 'F' | null.
 * Acepta 'M'/'F' (API backend) y 'masculino'/'femenino' (formatos alternativos).
 */
export function normalizarSexo(sexo: string | null | undefined): 'M' | 'F' | null {
  if (!sexo) return null;
  const s = sexo.toLowerCase();
  if (s === 'm' || s === 'masculino') return 'M';
  if (s === 'f' || s === 'femenino') return 'F';
  return null;
}

export interface ObjetivosNutricionales {
  geb: number;        // Gasto Energetico Basal (kcal en reposo)
  get: number;        // Gasto Energetico Total (kcal/dia con actividad)
  carbs_g: number;    // Meta carbohidratos en gramos (55% GET / 4 kcal/g)
  proteina_g: number; // Meta proteina en gramos (15% GET / 4 kcal/g)
  lipidos_g: number;  // Meta lipidos en gramos (30% GET / 9 kcal/g)
}

/**
 * Calcula GEB y GET usando Mifflin-St. Jeor (1990) con distribucion
 * de macronutrientes 55 % carbohidratos / 15 % proteina / 30 % grasas.
 * Retorna null si falta alguno de los parametros esenciales.
 */
export function calcularObjetivos(
  peso_kg: number | null | undefined,
  altura_cm: number | null | undefined,
  edad: number | null | undefined,
  sexo: string | null | undefined,
  actividad_fisica: string | null | undefined,
): ObjetivosNutricionales | null {
  if (!peso_kg || !altura_cm || !edad) return null;
  const s = normalizarSexo(sexo);
  if (!s) return null;

  const geb =
    s === 'M'
      ? 10 * peso_kg + 6.25 * altura_cm - 5 * edad + 5
      : 10 * peso_kg + 6.25 * altura_cm - 5 * edad - 161;

  const factor = FACTORES_ACTIVIDAD[actividad_fisica ?? 'moderado'] ?? 1.55;
  const get = geb * factor;

  return {
    geb: Math.round(geb),
    get: Math.round(get),
    carbs_g: Math.round((get * 0.55) / 4),
    proteina_g: Math.round((get * 0.15) / 4),
    lipidos_g: Math.round((get * 0.3) / 9),
  };
}

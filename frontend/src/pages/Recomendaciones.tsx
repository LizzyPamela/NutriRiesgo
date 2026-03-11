import { useEffect, useState } from 'react';
import {
  AlertCircle, CheckCircle, Info, ChevronDown, ChevronUp,
  Loader2, Scale, Droplets, Wheat, Zap, Heart, Apple, Activity,
  FlaskConical,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { obtenerPerfil, obtenerDiarioAlimentario } from '../services/api';

// ── Types ────────────────────────────────────────────────────────────────────
type Nivel = 'ok' | 'info' | 'precaucion' | 'alerta';
type TipoRec = 'peso' | 'calorias' | 'carbohidratos' | 'proteina' | 'grasas' | 'sodio' | 'fibra' | 'habitos' | 'examenes';

interface Recomendacion {
  id: string;
  tipo: TipoRec;
  nivel: Nivel;
  titulo: string;
  mensaje: string;
  acciones: string[];
}

interface PerfilBackend {
  imc?: number;
  categoria_riesgo?: string;
  riesgo_prevent?: number;
  requiere_derivacion?: boolean;
  edad?: number;
  sexo?: 'masculino' | 'femenino';
  peso_kg?: number;
  altura_cm?: number;
  perimetro_cintura_cm?: number;
  actividad_fisica?: string;
  antecedentes_familiares?: {
    diabetes?: boolean;
    hipertension?: boolean;
    cardiopatia?: boolean;
    obesidad?: boolean;
  };
}

interface RegistroDiario {
  fecha?: string;
  total_calorias?: number;
  total_proteina_g?: number;
  total_carbohidratos_g?: number;
  total_grasas_g?: number;
  tiempo_comida?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getIconForType(tipo: TipoRec) {
  const map: Record<TipoRec, React.ReactNode> = {
    peso:          <Scale className="w-5 h-5" />,
    calorias:      <Zap className="w-5 h-5" />,
    carbohidratos: <Wheat className="w-5 h-5" />,
    proteina:      <Activity className="w-5 h-5" />,
    grasas:        <Droplets className="w-5 h-5" />,
    sodio:         <Droplets className="w-5 h-5" />,
    fibra:         <Apple className="w-5 h-5" />,
    habitos:       <Heart className="w-5 h-5" />,
    examenes:      <FlaskConical className="w-5 h-5" />,
  };
  return map[tipo];
}

const nivelConfig: Record<Nivel, { bg: string; border: string; icon: React.ReactNode; label: string }> = {
  ok:        { bg: 'bg-green-50',  border: 'border-green-200',  icon: <CheckCircle className="w-5 h-5 text-green-600" />,  label: 'Bien' },
  info:      { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: <Info className="w-5 h-5 text-blue-600" />,          label: 'Información' },
  precaucion:{ bg: 'bg-amber-50',  border: 'border-amber-200',  icon: <AlertCircle className="w-5 h-5 text-amber-500" />,  label: 'Precaución' },
  alerta:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: <AlertCircle className="w-5 h-5 text-red-500" />,    label: 'Alerta' },
};

// ── Promedios de los últimos 7 días ──────────────────────────────────────────
function calcularPromedios(registros: RegistroDiario[]) {
  const hoy = new Date();
  const hace7 = new Date(hoy);
  hace7.setDate(hoy.getDate() - 7);

  const recientes = registros.filter((r) => {
    if (!r.fecha) return false;
    return new Date(r.fecha) >= hace7;
  });

  if (recientes.length === 0) return null;

  const suma = recientes.reduce(
    (acc, r) => ({
      calorias:      acc.calorias      + (r.total_calorias ?? 0),
      proteina:      acc.proteina      + (r.total_proteina_g ?? 0),
      carbohidratos: acc.carbohidratos + (r.total_carbohidratos_g ?? 0),
      grasas:        acc.grasas        + (r.total_grasas_g ?? 0),
      registros:     acc.registros     + 1,
    }),
    { calorias: 0, proteina: 0, carbohidratos: 0, grasas: 0, registros: 0 }
  );

  // Agrupar por fecha para ver cuántos días únicos
  const diasUnicos = new Set(recientes.map((r) => r.fecha?.split('T')[0])).size;

  const diasDesayuno = recientes.filter((r) => r.tiempo_comida === 'desayuno').length;
  const diasSinDesayuno = diasUnicos - diasDesayuno;

  const promedioCaloriasXRegistro = suma.calorias / suma.registros;
  const promProteinaXRegistro     = suma.proteina / suma.registros;
  const promCarbosXRegistro       = suma.carbohidratos / suma.registros;
  const promGrasasXRegistro       = suma.grasas / suma.registros;

  const kcalTotal = promedioCaloriasXRegistro;
  const pctCarbs    = kcalTotal > 0 ? (promCarbosXRegistro * 4 / kcalTotal) * 100 : 0;
  const pctProt     = kcalTotal > 0 ? (promProteinaXRegistro * 4 / kcalTotal) * 100 : 0;
  const pctGrasas   = kcalTotal > 0 ? (promGrasasXRegistro * 9 / kcalTotal) * 100 : 0;

  return {
    calorias_promedio: promedioCaloriasXRegistro,
    proteina_g: promProteinaXRegistro,
    carbohidratos_g: promCarbosXRegistro,
    grasas_g: promGrasasXRegistro,
    pct_carbs: pctCarbs,
    pct_proteina: pctProt,
    pct_grasas: pctGrasas,
    dias_con_datos: diasUnicos,
    dias_sin_desayuno: diasSinDesayuno,
    total_registros: suma.registros,
  };
}

// ── Algoritmo de recomendaciones ─────────────────────────────────────────────
function generarRecomendaciones(
  perfil: PerfilBackend,
  promedios: ReturnType<typeof calcularPromedios>
): Recomendacion[] {
  const recs: Recomendacion[] = [];

  const imc        = perfil.imc;
  const diabetes   = perfil.antecedentes_familiares?.diabetes ?? false;
  const hta        = perfil.antecedentes_familiares?.hipertension ?? false;
  const cardio     = perfil.antecedentes_familiares?.cardiopatia ?? false;
  const peso_kg    = perfil.peso_kg;
  const sexo       = perfil.sexo;
  const cintura    = perfil.perimetro_cintura_cm;

  // 1. IMC
  if (imc !== undefined) {
    if (imc < 18.5) {
      recs.push({
        id: 'imc-bajo', tipo: 'peso', nivel: 'precaucion',
        titulo: 'Bajo peso (IMC ' + imc.toFixed(1) + ')',
        mensaje: 'Tu IMC indica bajo peso. Es recomendable aumentar la ingesta calórica de manera gradual con alimentos nutritivos.',
        acciones: [
          'Incrementar carbohidratos complejos (avena, arroz integral, yuca)',
          'Agregar una fuente de proteína en cada comida',
          'Incluir grasas saludables (aguacate, aceite de oliva)',
          'Consultar con nutricionista',
        ],
      });
    } else if (imc >= 18.5 && imc < 25) {
      recs.push({
        id: 'imc-normal', tipo: 'peso', nivel: 'ok',
        titulo: 'Peso normal (IMC ' + imc.toFixed(1) + ')',
        mensaje: '¡Tu IMC está en rango saludable! Mantén tus hábitos actuales.',
        acciones: [
          'Continuar con actividad física regular',
          'Mantener dieta equilibrada',
          'Realizar chequeos anuales',
        ],
      });
    } else if (imc >= 25 && imc < 30) {
      recs.push({
        id: 'imc-sobrepeso', tipo: 'peso', nivel: 'precaucion',
        titulo: 'Sobrepeso (IMC ' + imc.toFixed(1) + ')',
        mensaje: 'Reducir 250-500 kcal/día puede ayudarte a perder 0.5-1 kg por semana de forma segura.',
        acciones: [
          'Reducir carbohidratos refinados (pan blanco, arroz blanco, refrescos)',
          'Aumentar consumo de verduras y hortalizas',
          'Preferir proteínas magras (pollo sin piel, frijoles, pescado)',
          'Incluir 30 min de actividad física moderada al día',
        ],
      });
    } else {
      recs.push({
        id: 'imc-obesidad', tipo: 'peso', nivel: 'alerta',
        titulo: 'Obesidad (IMC ' + imc.toFixed(1) + ')',
        mensaje: 'Tu IMC indica obesidad. Se recomienda consulta médica y nutricional especializada.',
        acciones: [
          'Consultar con médico y nutricionista',
          'Reducción calórica supervisada',
          'Iniciar actividad física progresiva',
          'Evitar dietas de moda — buscar cambios sostenibles',
        ],
      });
    }
  }

  // 2. Cintura (riesgo cardiometabólico)
  if (cintura) {
    const riesgoM = sexo === 'masculino' && cintura > 102;
    const riesgoF = sexo === 'femenino'  && cintura > 88;
    if (riesgoM || riesgoF) {
      recs.push({
        id: 'cintura', tipo: 'peso', nivel: 'alerta',
        titulo: 'Cintura elevada — riesgo cardiometabólico',
        mensaje: `Perímetro de ${cintura} cm supera el límite recomendado (${sexo === 'masculino' ? '102' : '88'} cm). Esto incrementa el riesgo cardiovascular.`,
        acciones: [
          'Reducir grasa abdominal con dieta y ejercicio',
          'Evitar alimentos ultraprocesados',
          'Consultar con médico para evaluación cardiovascular',
        ],
      });
    }
  }

  // 3. Macronutrientes (si hay datos de diario)
  if (promedios && promedios.total_registros > 0) {
    const cal = promedios.calorias_promedio;
    const metaCal = calcularMetaCalorias(perfil);

    // Calorías
    if (metaCal && cal > metaCal * 1.15) {
      recs.push({
        id: 'cal-alto', tipo: 'calorias', nivel: 'precaucion',
        titulo: `Ingesta calórica alta (${cal.toFixed(0)} kcal/registro)`,
        mensaje: `Tu promedio por registro supera la meta estimada de ${metaCal.toFixed(0)} kcal/día.`,
        acciones: [
          'Reducir porciones de alimentos energéticos',
          'Preferir verduras y proteínas magras',
          'Evitar frituras y refrescos azucarados',
        ],
      });
    } else if (metaCal && cal < metaCal * 0.75) {
      recs.push({
        id: 'cal-bajo', tipo: 'calorias', nivel: 'info',
        titulo: `Ingesta calórica baja (${cal.toFixed(0)} kcal/registro)`,
        mensaje: 'Podrías no estar consumiendo suficientes calorías. Asegúrate de registrar todas tus comidas.',
        acciones: [
          'Revisar si estás registrando todas las comidas del día',
          'Incrementar ingesta si la restricción no es intencional',
        ],
      });
    }

    // Carbohidratos — específico para diabetes
    if (diabetes) {
      if (promedios.pct_carbs > 65) {
        recs.push({
          id: 'carbs-alto', tipo: 'carbohidratos', nivel: 'alerta',
          titulo: `Exceso de carbohidratos (${promedios.pct_carbs.toFixed(0)}% VCT)`,
          mensaje: 'Con diabetes, se recomienda 45-65% VCT en carbohidratos. Prefiere siempre los complejos.',
          acciones: [
            'Reducir pan blanco, arroz refinado, papa',
            'Preferir cereales integrales, yuca cocida, frijoles',
            'Limitar azúcares simples a menos del 10% VCT',
            'Distribuir carbohidratos en 5 comidas al día',
          ],
        });
      } else if (promedios.pct_carbs >= 45 && promedios.pct_carbs <= 65) {
        recs.push({
          id: 'carbs-ok', tipo: 'carbohidratos', nivel: 'ok',
          titulo: `Carbohidratos en rango (${promedios.pct_carbs.toFixed(0)}% VCT)`,
          mensaje: 'Tu consumo de carbohidratos está dentro del rango recomendado para diabetes (45-65%).',
          acciones: [
            'Continuar priorizando carbohidratos complejos',
            'Mantener el control glucémico con distribución uniforme de comidas',
          ],
        });
      }
    }

    // Proteína
    if (peso_kg && promedios.proteina_g < peso_kg * 0.8) {
      recs.push({
        id: 'prot-bajo', tipo: 'proteina', nivel: 'info',
        titulo: `Proteína baja (${promedios.proteina_g.toFixed(1)} g/registro)`,
        mensaje: `Se recomienda al menos ${(peso_kg * 0.8).toFixed(0)}-${(peso_kg * 1.0).toFixed(0)} g/día (0.8-1.0 g/kg).`,
        acciones: [
          'Incluir proteína en cada comida (frijoles, pollo, huevo, pescado)',
          'Agregar legumbres a guisos y sopas',
          'Considerar un snack proteico (yogur, nueces)',
        ],
      });
    }

    // Grasas
    if (promedios.pct_grasas > 35) {
      recs.push({
        id: 'grasas-alto', tipo: 'grasas', nivel: 'precaucion',
        titulo: `Grasas elevadas (${promedios.pct_grasas.toFixed(0)}% VCT)`,
        mensaje: 'El exceso de grasas, especialmente saturadas, incrementa el riesgo cardiovascular.',
        acciones: [
          'Reducir frituras, mantequilla, carnes grasas',
          'Preferir aceite de oliva o de maíz en pequeñas cantidades',
          'Aumentar pescado (contiene grasas omega-3 beneficiosas)',
        ],
      });
    }

    // Hábito: saltarse el desayuno
    if (promedios.dias_sin_desayuno >= 3) {
      recs.push({
        id: 'desayuno', tipo: 'habitos', nivel: 'precaucion',
        titulo: 'Saltarse el desayuno',
        mensaje: `Has registrado ${promedios.dias_sin_desayuno} días sin desayuno esta semana.`,
        acciones: [
          'El desayuno debe aportar ~20% de las calorías diarias',
          'Opciones: tortilla con frijoles + fruta, avena con leche, huevo',
          'Saltarlo aumenta el riesgo de comer en exceso al mediodía',
        ],
      });
    }
  } else {
    // Sin datos de diario
    recs.push({
      id: 'sin-diario', tipo: 'habitos', nivel: 'info',
      titulo: 'Registra tus comidas para obtener recomendaciones personalizadas',
      mensaje: 'Aún no tienes registros en tu diario alimentario de los últimos 7 días.',
      acciones: [
        'Ve a "Diario" y agrega tus comidas de hoy',
        'Con al menos 3 días de datos recibirás análisis de macronutrientes',
      ],
    });
  }

  // 4. Recomendaciones por condiciones específicas
  if (hta) {
    recs.push({
      id: 'sodio-hta', tipo: 'sodio', nivel: 'info',
      titulo: 'Control de sodio — Hipertensión',
      mensaje: 'Con hipertensión, limita el sodio a menos de 2300 mg/día (idealmente <1500 mg).',
      acciones: [
        'No agregar sal de mesa a los alimentos ya cocinados',
        'Evitar embutidos, enlatados y comida rápida',
        'Usar hierbas y limón para sazonar',
        'Leer etiquetas nutricionales — verificar sodio por porción',
        'Aumentar alimentos ricos en potasio: plátano, aguacate, tomate',
      ],
    });
  }

  if (diabetes) {
    recs.push({
      id: 'fibra-diabetes', tipo: 'fibra', nivel: 'info',
      titulo: 'Consumo de fibra — Diabetes',
      mensaje: 'La fibra ralentiza la absorción de glucosa. Meta: 14 g por cada 1000 kcal consumidas.',
      acciones: [
        'Consumir verduras en cada comida principal',
        'Preferir frijoles, lentejas, garbanzos como fuente de fibra y proteína',
        'Elegir pan y tortilla integral sobre refinados',
        'Incluir frutas con cáscara (manzana, pera)',
      ],
    });
  }

  if (cardio || perfil.requiere_derivacion) {
    recs.push({
      id: 'cardio', tipo: 'habitos', nivel: 'alerta',
      titulo: 'Riesgo cardiovascular elevado',
      mensaje: 'Tu perfil indica un riesgo cardiovascular que requiere atención médica especializada.',
      acciones: [
        'Consultar con cardiólgo o médico internista',
        'Seguir dieta DASH: rica en frutas, verduras, lácteos bajos en grasa',
        'Reducir grasas saturadas y trans al máximo',
        'Control regular de presión arterial y glucemia',
        'Actividad física moderada supervisada',
      ],
    });
  }

  // 5. Exámenes recomendados
  const examenes: string[] = [];
  if (diabetes) {
    examenes.push('Glucemia en ayunas', 'HbA1c', 'Perfil lipídico completo', 'BUN / Creatinina', 'Microalbuminuria');
  }
  if (hta) {
    examenes.push('Presión arterial (monitoreo)', 'Análisis de orina', 'Creatinina', 'Perfil lipídico');
  }
  if ((imc !== undefined && imc >= 30) || cardio) {
    examenes.push('Glucosa en ayunas', 'Colesterol total', 'Triglicéridos', 'ECG');
  }

  const uniqExamenes = [...new Set(examenes)];
  if (uniqExamenes.length > 0) {
    recs.push({
      id: 'examenes', tipo: 'examenes', nivel: 'info',
      titulo: 'Exámenes de laboratorio recomendados',
      mensaje: 'Solicita estos exámenes con tu médico para un control óptimo de tu salud.',
      acciones: uniqExamenes,
    });
  }

  return recs;
}

function calcularMetaCalorias(perfil: PerfilBackend): number | null {
  const { peso_kg, altura_cm, edad, sexo, actividad_fisica } = perfil;
  if (!peso_kg || !altura_cm || !edad || !sexo) return null;

  // Harris-Benedict revisado
  let tmb: number;
  if (sexo === 'masculino') {
    tmb = 88.362 + 13.397 * peso_kg + 4.799 * altura_cm - 5.677 * edad;
  } else {
    tmb = 447.593 + 9.247 * peso_kg + 3.098 * altura_cm - 4.330 * edad;
  }

  const factores: Record<string, number> = {
    sedentario: 1.2, ligero: 1.375, moderado: 1.55, intenso: 1.725, muy_intenso: 1.9,
  };
  return tmb * (factores[actividad_fisica ?? 'moderado'] ?? 1.55);
}

// ── Card component ────────────────────────────────────────────────────────────
function RecomendacionCard({ rec }: { rec: Recomendacion }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = nivelConfig[rec.nivel];

  return (
    <div className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="mt-0.5 shrink-0">{cfg.icon}</div>
          <div>
            <p className="font-semibold text-nutri-gray-900 text-sm">{rec.titulo}</p>
            <p className="text-sm text-nutri-gray-600 mt-0.5">{rec.mensaje}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={expanded ? 'Ocultar acciones' : 'Ver acciones'}
          onClick={() => setExpanded((v) => !v)}
          className="ml-3 shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors text-nutri-gray-500"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <ul className="mt-3 space-y-1.5 pl-8">
          {rec.acciones.map((a, i) => (
            <li key={i} className="flex items-start space-x-2 text-sm text-nutri-gray-700">
              <span className="text-nutri-primary mt-0.5 shrink-0">•</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Recomendaciones() {
  const { userId } = useAuth();
  const [perfil, setPerfil] = useState<PerfilBackend | null>(null);
  const [promedios, setPromedios] = useState<ReturnType<typeof calcularPromedios>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const [perfilRes, diarioRes] = await Promise.allSettled([
          obtenerPerfil(userId),
          obtenerDiarioAlimentario(userId),
        ]);
        const p = perfilRes.status === 'fulfilled' ? perfilRes.value : {};
        const registros: RegistroDiario[] = diarioRes.status === 'fulfilled'
          ? (diarioRes.value?.registros ?? [])
          : [];
        setPerfil(p);
        setPromedios(calcularPromedios(registros));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-nutri-primary animate-spin" />
      </div>
    );
  }

  if (!perfil || !perfil.imc) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <h1 className="text-2xl font-bold text-nutri-gray-900 mb-4">Recomendaciones</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="font-semibold text-nutri-gray-800 mb-1">Completa tu perfil primero</p>
          <p className="text-sm text-nutri-gray-600">
            Para recibir recomendaciones personalizadas, necesitamos tus datos físicos en{' '}
            <a href="/perfil" className="text-nutri-primary underline">Perfil</a>.
          </p>
        </div>
      </div>
    );
  }

  const recomendaciones = generarRecomendaciones(perfil, promedios);
  const alertas    = recomendaciones.filter((r) => r.nivel === 'alerta');
  const precaution = recomendaciones.filter((r) => r.nivel === 'precaucion');
  const info       = recomendaciones.filter((r) => r.nivel === 'info');
  const ok         = recomendaciones.filter((r) => r.nivel === 'ok');

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-nutri-gray-900">Recomendaciones</h1>
          <p className="text-nutri-gray-600 text-sm mt-1">
            Basadas en tu perfil{promedios ? ' y los últimos 7 días de diario' : ''}
          </p>
        </div>

        {/* Resumen */}
        {promedios && (
          <div className="bg-white rounded-2xl border border-nutri-gray-200 p-4 mb-6 shadow-sm">
            <p className="text-xs font-semibold text-nutri-gray-500 uppercase tracking-wide mb-3">
              Promedio últimos 7 días ({promedios.dias_con_datos} día{promedios.dias_con_datos !== 1 ? 's' : ''} registrados)
            </p>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { v: promedios.calorias_promedio.toFixed(0), u: 'kcal/reg.' },
                { v: promedios.pct_carbs.toFixed(0) + '%', u: 'carbos' },
                { v: promedios.pct_proteina.toFixed(0) + '%', u: 'proteína' },
                { v: promedios.pct_grasas.toFixed(0) + '%', u: 'grasas' },
              ].map(({ v, u }) => (
                <div key={u}>
                  <p className="text-lg font-bold text-nutri-primary">{v}</p>
                  <p className="text-xs text-nutri-gray-500">{u}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-nutri-gray-50 border border-nutri-gray-200 rounded-xl p-3 mb-6 text-xs text-nutri-gray-500 flex items-start space-x-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Esta herramienta es educativa y no sustituye la consulta médica profesional. Consulta a tu médico antes de realizar cambios importantes en tu alimentación.</span>
        </div>

        {/* Alertas primero */}
        {alertas.length > 0 && (
          <section className="mb-5">
            <h2 className="text-sm font-semibold text-red-600 mb-2 flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4" /><span>Alertas ({alertas.length})</span>
            </h2>
            <div className="space-y-3">
              {alertas.map((r) => <RecomendacionCard key={r.id} rec={r} />)}
            </div>
          </section>
        )}

        {/* Precauciones */}
        {precaution.length > 0 && (
          <section className="mb-5">
            <h2 className="text-sm font-semibold text-amber-600 mb-2 flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4" /><span>Precauciones ({precaution.length})</span>
            </h2>
            <div className="space-y-3">
              {precaution.map((r) => <RecomendacionCard key={r.id} rec={r} />)}
            </div>
          </section>
        )}

        {/* Informativas */}
        {info.length > 0 && (
          <section className="mb-5">
            <h2 className="text-sm font-semibold text-blue-600 mb-2 flex items-center space-x-1.5">
              <Info className="w-4 h-4" /><span>Información ({info.length})</span>
            </h2>
            <div className="space-y-3">
              {info.map((r) => <RecomendacionCard key={r.id} rec={r} />)}
            </div>
          </section>
        )}

        {/* OK */}
        {ok.length > 0 && (
          <section className="mb-5">
            <h2 className="text-sm font-semibold text-green-600 mb-2 flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4" /><span>Puntos positivos ({ok.length})</span>
            </h2>
            <div className="space-y-3">
              {ok.map((r) => <RecomendacionCard key={r.id} rec={r} />)}
            </div>
          </section>
        )}

        {getIconForType('peso') && null /* avoid unused import warning */}
      </div>
    </div>
  );
}

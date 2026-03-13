import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, CheckCircle, AlertCircle, Info, Loader2, FlaskConical,
  Calendar, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { obtenerPerfil } from '../services/api';

// ── Types ────────────────────────────────────────────────────────────────────
type Interpretacion = 'normal' | 'borderline' | 'alto' | 'bajo' | 'prediabetes' | 'diabetes' | 'límite' | 'hiperinsulinemia / resistencia a la insulina';

interface Rango {
  max?: number;
  min?: number;
  label: Interpretacion;
  color: string;
}

interface ExamenDef {
  id: string;
  nombre: string;
  unidad: string;
  rangos: Rango[];
  condicion: string[];         // 'diabetes' | 'hipertension' | 'general'
  descripcion: string;
}

interface ResultadoGuardado {
  examenId: string;
  valor: number;
  fecha: string; // ISO string
  interpretacion: Interpretacion;
}

// ── Definición de exámenes ────────────────────────────────────────────────────
const EXAMENES: ExamenDef[] = [
  {
    id: 'glucemia_ayunas',
    nombre: 'Glucemia en Ayunas',
    unidad: 'mg/dl',
    condicion: ['diabetes', 'general'],
    descripcion: 'Mide el nivel de azúcar en sangre tras 8h de ayuno.',
    rangos: [
      { max: 99,  label: 'normal',     color: 'text-green-600' },
      { min: 100, max: 125, label: 'prediabetes', color: 'text-amber-500' },
      { min: 126, label: 'diabetes',   color: 'text-red-600' },
    ],
  },
  {
    id: "insulina_ayunas",
    nombre: "Insulina en Ayunas",
    unidad: "μU/mL",
    condicion: ["resistencia a la insulina", "general"],
    descripcion: "Mide el nivel de insulina en sangre tras 8h de ayuno.",
    rangos: [
      { min: 2, max: 13, label: "normal", color: "text-green-600" },
      { min: 14, max: 15, label: "límite", color: "text-amber-500" },
      { min: 16, max: 20, label: "alto", color: "text-orange-600" },
      { min: 21, label: "hiperinsulinemia / resistencia a la insulina", color: "text-red-600" }
    ]
  },
  {
    id: 'hba1c',
    nombre: 'HbA1c (Hemoglobina Glucosilada)',
    unidad: '%',
    condicion: ['diabetes'],
    descripcion: 'Refleja el control glucémico de los últimos 2-3 meses.',
    rangos: [
      { max: 5.6,  label: 'normal',     color: 'text-green-600' },
      { min: 5.7, max: 6.4, label: 'prediabetes', color: 'text-amber-500' },
      { min: 6.5,  label: 'diabetes',   color: 'text-red-600' },
    ],
  },
  {
    id: 'colesterol_total',
    nombre: 'Colesterol Total',
    unidad: 'mg/dl',
    condicion: ['diabetes', 'hipertension', 'general'],
    descripcion: 'Incluye HDL, LDL y VLDL.',
    rangos: [
      { max: 199, label: 'normal',     color: 'text-green-600' },
      { min: 200, max: 239, label: 'borderline', color: 'text-amber-500' },
      { min: 240, label: 'alto',       color: 'text-red-600' },
    ],
  },
  {
    id: 'trigliceridos',
    nombre: 'Triglicéridos',
    unidad: 'mg/dl',
    condicion: ['diabetes', 'hipertension', 'general'],
    descripcion: 'Tipo de grasa en sangre relacionado con riesgo cardiovascular.',
    rangos: [
      { max: 149, label: 'normal',     color: 'text-green-600' },
      { min: 150, max: 199, label: 'borderline', color: 'text-amber-500' },
      { min: 200, label: 'alto',       color: 'text-red-600' },
    ],
  },
  {
    id: 'hdl',
    nombre: 'HDL-Colesterol ("bueno")',
    unidad: 'mg/dl',
    condicion: ['diabetes', 'hipertension', 'general'],
    descripcion: 'Valores más altos son protectores del corazón.',
    rangos: [
      { max: 39,  label: 'bajo',       color: 'text-red-600' },
      { min: 40, max: 59,  label: 'borderline', color: 'text-amber-500' },
      { min: 60,  label: 'normal',     color: 'text-green-600' },
    ],
  },
  {
    id: 'ldl',
    nombre: 'LDL-Colesterol ("malo")',
    unidad: 'mg/dl',
    condicion: ['diabetes', 'hipertension', 'general'],
    descripcion: 'Valores altos aumentan el riesgo de enfermedad coronaria.',
    rangos: [
      { max: 99,  label: 'normal',     color: 'text-green-600' },
      { min: 100, max: 129, label: 'borderline', color: 'text-amber-500' },
      { min: 130, label: 'alto',       color: 'text-red-600' },
    ],
  },
  {
    id: 'creatinina',
    nombre: 'Creatinina',
    unidad: 'mg/dl',
    condicion: ['diabetes', 'hipertension'],
    descripcion: 'Indicador de función renal. Valores elevados indican daño renal.',
    rangos: [
      { max: 1.2, label: 'normal',     color: 'text-green-600' },
      { min: 1.3, max: 1.9, label: 'borderline', color: 'text-amber-500' },
      { min: 2.0, label: 'alto',       color: 'text-red-600' },
    ],
  },
  {
    id: 'bun',
    nombre: 'BUN (Nitrógeno Ureico)',
    unidad: 'mg/dl',
    condicion: ['diabetes', 'hipertension'],
    descripcion: 'Evalúa la función renal junto con creatinina.',
    rangos: [
      { max: 20,  label: 'normal',     color: 'text-green-600' },
      { min: 21, max: 39, label: 'borderline', color: 'text-amber-500' },
      { min: 40,  label: 'alto',       color: 'text-red-600' },
    ],
  },
  {
    id: 'presion_sistolica',
    nombre: 'Presión Sistólica',
    unidad: 'mmHg',
    condicion: ['hipertension', 'general'],
    descripcion: 'Número superior de la presión arterial.',
    rangos: [
      { max: 119, label: 'normal',     color: 'text-green-600' },
      { min: 120, max: 129, label: 'borderline', color: 'text-amber-500' },
      { min: 130, label: 'alto',       color: 'text-red-600' },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function interpretarValor(examen: ExamenDef, valor: number): Rango {
  for (const rango of examen.rangos) {
    const cumpleMin = rango.min === undefined || valor >= rango.min;
    const cumpleMax = rango.max === undefined || valor <= rango.max;
    if (cumpleMin && cumpleMax) return rango;
  }
  return examen.rangos[examen.rangos.length - 1];
}

const interpretacionLabel: Record<Interpretacion, string> = {
  normal:      'Normal',
  borderline:  'Borderline',
  alto:        'Alto',
  bajo:        'Bajo',
  prediabetes: 'Prediabetes',
  diabetes:    'Diabetes',
  'límite':    'Límite',
  'hiperinsulinemia / resistencia a la insulina': 'Hiperinsulinemia / Resistencia a la insulina',
};

const badgeClass: Record<Interpretacion, string> = {
  normal:      'bg-green-100 text-green-700',
  borderline:  'bg-amber-100 text-amber-700',
  alto:        'bg-red-100 text-red-700',
  bajo:        'bg-blue-100 text-blue-700',
  prediabetes: 'bg-orange-100 text-orange-700',
  diabetes:    'bg-red-100 text-red-700',
  'límite':    'bg-amber-100 text-amber-700',
  'hiperinsulinemia / resistencia a la insulina': 'bg-red-100 text-red-700',
};

const STORAGE_KEY = 'nutririesgo_examenes';

function loadResultados(): ResultadoGuardado[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveResultados(data: ResultadoGuardado[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Row component ─────────────────────────────────────────────────────────────
function ExamenRow({
  examen,
  resultados,
  onAdd,
  onDelete,
}: {
  examen: ExamenDef;
  resultados: ResultadoGuardado[];
  onAdd: (examenId: string) => void;
  onDelete: (examenId: string, fecha: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ultimo = resultados[resultados.length - 1];

  return (
    <div className="bg-white rounded-xl border border-nutri-gray-200 overflow-hidden">
      <div className="flex items-center p-4 space-x-3">
        <FlaskConical className="w-5 h-5 text-nutri-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-nutri-gray-900">{examen.nombre}</p>
          <p className="text-xs text-nutri-gray-500">{examen.unidad}</p>
        </div>

        {ultimo ? (
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass[ultimo.interpretacion]}`}>
              {ultimo.valor} {examen.unidad} — {interpretacionLabel[ultimo.interpretacion]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-nutri-gray-400 italic">Sin resultado</span>
        )}

        <button
          type="button"
          aria-label="Registrar resultado"
          onClick={() => onAdd(examen.id)}
          className="p-1.5 rounded-lg bg-nutri-primary text-white hover:bg-nutri-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>

        {resultados.length > 0 && (
          <button
            type="button"
            aria-label={expanded ? 'Ocultar historial' : 'Ver historial'}
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-nutri-gray-100 text-nutri-gray-500 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {expanded && resultados.length > 0 && (
        <div className="border-t border-nutri-gray-100 px-4 pb-3 pt-2 space-y-1.5">
          <p className="text-xs font-medium text-nutri-gray-500 mb-1">Historial</p>
          {[...resultados].reverse().map((r) => (
            <div key={r.fecha} className="flex items-center justify-between text-xs py-1 border-b border-nutri-gray-50 last:border-0">
              <div className="flex items-center space-x-2">
                <Calendar className="w-3 h-3 text-nutri-gray-400" />
                <span className="text-nutri-gray-600">{new Date(r.fecha).toLocaleDateString('es-HN')}</span>
                <span className="font-semibold text-nutri-gray-800">{r.valor} {examen.unidad}</span>
                <span className={`px-1.5 py-0.5 rounded-full ${badgeClass[r.interpretacion]}`}>
                  {interpretacionLabel[r.interpretacion]}
                </span>
              </div>
              <button
                type="button"
                aria-label="Eliminar resultado"
                onClick={() => onDelete(examen.id, r.fecha)}
                className="p-1 rounded hover:bg-red-50 text-nutri-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal para ingresar resultado ─────────────────────────────────────────────
function ModalResultado({
  examen,
  onGuardar,
  onCerrar,
}: {
  examen: ExamenDef;
  onGuardar: (valor: number, fecha: string) => void;
  onCerrar: () => void;
}) {
  const [valor, setValor] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const preview = valor ? interpretarValor(examen, parseFloat(valor)) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) { setError('Ingresa un valor válido.'); return; }
    onGuardar(v, fecha);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-nutri-gray-900">{examen.nombre}</h3>
            <p className="text-xs text-nutri-gray-500 mt-0.5">{examen.descripcion}</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onCerrar}
            className="p-1.5 rounded-lg hover:bg-nutri-gray-100 text-nutri-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rangos de referencia */}
        <div className="mb-4 bg-nutri-gray-50 rounded-lg p-3 text-xs space-y-1">
          <p className="font-medium text-nutri-gray-600 mb-1.5">Valores de referencia:</p>
          {examen.rangos.map((r, i) => (
            <div key={i} className="flex justify-between">
              <span className={r.color + ' font-medium'}>{interpretacionLabel[r.label]}</span>
              <span className="text-nutri-gray-500">
                {r.min !== undefined && r.max !== undefined ? `${r.min} - ${r.max}` :
                 r.min !== undefined ? `≥ ${r.min}` :
                 `≤ ${r.max}`} {examen.unidad}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="examen-resultado" className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
              Resultado ({examen.unidad})
            </label>
            <input
              id="examen-resultado"
              type="number" value={valor} onChange={(e) => { setValor(e.target.value); setError(''); }}
              min="0" step="0.01" placeholder={`ej: ${examen.rangos[0].max ?? 100}`}
              className="w-full px-4 py-2.5 border border-nutri-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
              autoFocus
            />
          </div>

          {preview && (
            <div className={`text-sm font-medium px-3 py-2 rounded-lg ${badgeClass[preview.label]}`}>
              Interpretación: {interpretacionLabel[preview.label]}
            </div>
          )}

          <div>
            <label htmlFor="examen-fecha" className="block text-sm font-medium text-nutri-gray-700 mb-1.5">Fecha del examen</label>
            <input
              id="examen-fecha"
              type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border border-nutri-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
            />
          </div>

          <div className="flex space-x-3 pt-1">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2.5 border border-nutri-gray-300 text-nutri-gray-700 rounded-lg text-sm font-medium hover:bg-nutri-gray-50">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-nutri-primary text-white rounded-lg text-sm font-semibold hover:bg-nutri-primary-dark flex items-center justify-center space-x-1.5">
              <CheckCircle className="w-4 h-4" />
              <span>Guardar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExamenesMedicos() {
  const { userId } = useAuth();
  const [perfil, setPerfil] = useState<{ antecedentes_familiares?: { diabetes?: boolean; hipertension?: boolean }; imc?: number } | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [resultados, setResultados] = useState<ResultadoGuardado[]>(loadResultados);
  const [modalExamenId, setModalExamenId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    obtenerPerfil(userId)
      .then(setPerfil)
      .catch(() => setPerfil({}))
      .finally(() => setLoadingPerfil(false));
  }, [userId]);

  const tieneDiabetes   = perfil?.antecedentes_familiares?.diabetes ?? false;
  const tieneHta        = perfil?.antecedentes_familiares?.hipertension ?? false;
  const tieneObesidad   = (perfil?.imc ?? 0) >= 30;

  // Filtrar exámenes relevantes según perfil
  const examenesRelevantes = EXAMENES.filter((e) => {
    if (e.condicion.includes('diabetes')     && tieneDiabetes) return true;
    if (e.condicion.includes('hipertension') && tieneHta)      return true;
    if (e.condicion.includes('general')      && (tieneObesidad || (!tieneDiabetes && !tieneHta))) return true;
    return false;
  });

  const examenesFinales = examenesRelevantes.length > 0 ? examenesRelevantes : EXAMENES.filter((e) => e.condicion.includes('general'));

  const getResultadosExamen = useCallback(
    (id: string) => resultados.filter((r) => r.examenId === id).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [resultados]
  );

  const handleGuardar = (valor: number, fecha: string) => {
    if (!modalExamenId) return;
    const examen = EXAMENES.find((e) => e.id === modalExamenId);
    if (!examen) return;
    const interpretacion = interpretarValor(examen, valor).label;
    const nuevo: ResultadoGuardado = { examenId: modalExamenId, valor, fecha, interpretacion };
    const actualizado = [...resultados.filter((r) => !(r.examenId === modalExamenId && r.fecha === fecha)), nuevo];
    setResultados(actualizado);
    saveResultados(actualizado);
    setModalExamenId(null);
  };

  const handleDelete = (examenId: string, fecha: string) => {
    const actualizado = resultados.filter((r) => !(r.examenId === examenId && r.fecha === fecha));
    setResultados(actualizado);
    saveResultados(actualizado);
  };

  const examenModal = EXAMENES.find((e) => e.id === modalExamenId);
  const hayAlertas  = resultados.some((r) => r.interpretacion !== 'normal');

  if (loadingPerfil) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-nutri-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-nutri-gray-900">Exámenes Médicos</h1>
          <p className="text-nutri-gray-600 text-sm mt-1">
            Registra y monitorea tus resultados de laboratorio
          </p>
        </div>

        {/* Condiciones activas */}
        {(tieneDiabetes || tieneHta) && (
          <div className="flex flex-wrap gap-2 mb-5">
            {tieneDiabetes && (
              <span className="text-xs px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                Diabetes Mellitus T2
              </span>
            )}
            {tieneHta && (
              <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                Hipertensión Arterial
              </span>
            )}
          </div>
        )}

        {/* Alerta si hay valores fuera de rango */}
        {hayAlertas && (
          <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Tienes valores fuera de rango. Muestra estos resultados a tu médico.</p>
          </div>
        )}

        {/* Nota informativa */}
        <div className="flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-xs text-blue-700">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Los resultados se guardan localmente en tu dispositivo. Esta herramienta no reemplaza la interpretación médica profesional.</span>
        </div>

        {/* Lista de exámenes */}
        <div className="space-y-3">
          {examenesFinales.map((examen) => (
            <ExamenRow
              key={examen.id}
              examen={examen}
              resultados={getResultadosExamen(examen.id)}
              onAdd={setModalExamenId}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Sin perfil */}
        {!tieneDiabetes && !tieneHta && !tieneObesidad && (
          <p className="text-xs text-nutri-gray-400 text-center mt-4">
            Completa tu{' '}
            <a href="/perfil" className="text-nutri-primary underline">perfil</a>
            {' '}para ver exámenes personalizados según tus condiciones.
          </p>
        )}
      </div>

      {/* Modal */}
      {examenModal && (
        <ModalResultado
          examen={examenModal}
          onGuardar={handleGuardar}
          onCerrar={() => setModalExamenId(null)}
        />
      )}
    </div>
  );
}

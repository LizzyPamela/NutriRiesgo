import { useEffect, useState } from 'react';
import {
  AlertCircle, CheckCircle, Info, ChevronDown, ChevronUp,
  Loader2, Heart, Apple, Activity, Scale, Droplets,
  TrendingUp, BookOpen, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { obtenerProyecciones, obtenerEvidenciaProyeccion } from '../services/api';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────
interface FactorRiesgo {
  factor: string;
  presente: boolean;
  descripcion: string;
  fuente: 'perfil' | 'dieta' | 'tendencia';
}

interface EvidenciaChunk {
  texto: string;
  autoridad: string;
  similitud: number;
}

interface PatronDieta {
  etiqueta: string;
  descripcion: string;
  dias_analizados: number;
  dias_recientes: number;
  tendencia: 'mejorando' | 'empeorando' | 'estable' | 'sin_datos';
  tendencia_detalle: string;
}

interface ProyeccionEnfermedad {
  enfermedad: string;
  nombre: string;
  riesgo: 'bajo' | 'moderado' | 'alto';
  puntaje: number;
  puntaje_perfil: number;
  puntaje_dieta: number;
  factores_presentes: FactorRiesgo[];
  patron_dieta: PatronDieta;
  evidencia: EvidenciaChunk[];
}

interface ProyeccionesResponse {
  user_id: string;
  proyecciones: ProyeccionEnfermedad[];
  resumen_dieta: Record<string, unknown>;
  nota: string;
}

// ── Config visual ─────────────────────────────────────────────────────────────
const riesgoConfig = {
  bajo:     { bg: 'bg-green-50',  border: 'border-green-200',  bar: 'bg-green-400',  label: 'Bajo',     text: 'text-green-700'  },
  moderado: { bg: 'bg-amber-50',  border: 'border-amber-200',  bar: 'bg-amber-400',  label: 'Moderado', text: 'text-amber-700'  },
  alto:     { bg: 'bg-red-50',    border: 'border-red-200',    bar: 'bg-red-500',    label: 'Alto',     text: 'text-red-700'    },
} as const;

const enfermedadIcons: Record<string, React.ReactNode> = {
  diabetes_tipo2: <Droplets className="w-5 h-5" />,
  hta:            <Activity className="w-5 h-5" />,
  cardiovascular: <Heart className="w-5 h-5" />,
  obesidad:       <Scale className="w-5 h-5" />,
};

const tendenciaConfig = {
  mejorando:  { icon: '↑', color: 'text-green-600',       label: 'Mejorando' },
  empeorando: { icon: '↓', color: 'text-red-600',         label: 'Empeorando' },
  estable:    { icon: '→', color: 'text-amber-600',        label: 'Estable' },
  sin_datos:  { icon: '—', color: 'text-nutri-gray-400',   label: 'Sin datos' },
} as const;

// ── ProyeccionCard ────────────────────────────────────────────────────────────
function ProyeccionCard({ proy }: { proy: ProyeccionEnfermedad }) {
  const [expanded, setExpanded] = useState(false);
  const [showEvidencia, setShowEvidencia] = useState(false);
  const [evidencia, setEvidencia] = useState<EvidenciaChunk[]>([]);
  const [loadingEvidencia, setLoadingEvidencia] = useState(false);
  const [evidenciaError, setEvidenciaError] = useState(false);

  const cfg = riesgoConfig[proy.riesgo];
  const factoresPresentes   = proy.factores_presentes.filter((f) => f.presente);
  const factoresProtectores = proy.factores_presentes.filter((f) => !f.presente);
  const patron = proy.patron_dieta;
  const tend   = tendenciaConfig[patron.tendencia] ?? tendenciaConfig.sin_datos;
  const totalScore = proy.puntaje || 1;
  const pctDieta   = Math.round((proy.puntaje_dieta / totalScore) * 100);

  return (
    <div className={`rounded-2xl border ${cfg.bg} ${cfg.border} overflow-hidden`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl bg-white/70 ${cfg.text}`}>
              {enfermedadIcons[proy.enfermedad] ?? <TrendingUp className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-semibold text-nutri-gray-900 text-sm">{proy.nombre}</p>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>
                  Riesgo {cfg.label}
                </span>
                {patron.tendencia !== 'sin_datos' && (
                  <span className={`text-xs font-semibold ${tend.color}`}>
                    {tend.icon} {tend.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Ocultar detalle' : 'Ver detalle'}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors text-nutri-gray-500"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Barra de puntaje */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-nutri-gray-500 mb-1">
            <span>Puntaje total</span>
            <span className={`font-bold ${cfg.text}`}>{proy.puntaje}/100</span>
          </div>
          <div className="h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
              style={{ width: `${proy.puntaje}%` }}
            />
          </div>
        </div>

        {/* Desglose perfil vs dieta */}
        {proy.puntaje > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="bg-white/50 rounded-xl p-2 text-center">
              <p className="text-xs text-nutri-gray-500">Perfil clínico</p>
              <p className="text-sm font-bold text-blue-600">{proy.puntaje_perfil} pts</p>
            </div>
            <div className="bg-white/50 rounded-xl p-2 text-center">
              <p className="text-xs text-nutri-gray-500">Hábitos alimenticios</p>
              <p className={`text-sm font-bold ${proy.puntaje_dieta > 0 ? 'text-orange-600' : 'text-nutri-gray-400'}`}>
                {proy.puntaje_dieta} pts
                {proy.puntaje_dieta > 20 && (
                  <span className="text-xs font-normal ml-1">({pctDieta}% del riesgo)</span>
                )}
              </p>
            </div>
          </div>
        )}

        {patron.dias_analizados > 0 && (
          <p className="text-xs text-nutri-gray-400 mt-2">
            Análisis basado en {patron.dias_analizados} día{patron.dias_analizados !== 1 ? 's' : ''} de diario
            {patron.etiqueta !== 'equilibrada' && patron.etiqueta !== 'sin_registro' && (
              <span className="ml-1 text-orange-600 font-medium">· Patrón: {patron.etiqueta}</span>
            )}
          </p>
        )}
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/50 pt-4">

          {/* Tendencia detalle */}
          {patron.tendencia !== 'sin_datos' && patron.tendencia_detalle && (
            <div className={`rounded-xl p-3 text-xs ${
              patron.tendencia === 'mejorando'  ? 'bg-green-50 text-green-800' :
              patron.tendencia === 'empeorando' ? 'bg-red-50 text-red-800'    :
              'bg-amber-50 text-amber-800'
            }`}>
              <span className="font-semibold">{tend.label}: </span>
              {patron.tendencia_detalle}
            </div>
          )}

          {/* Factores dietéticos */}
          {factoresPresentes.filter((f) => f.fuente === 'dieta').length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-700 mb-2 flex items-center space-x-1">
                <Apple className="w-3.5 h-3.5" />
                <span>Factores dietéticos de riesgo</span>
              </p>
              <ul className="space-y-2">
                {factoresPresentes.filter((f) => f.fuente === 'dieta').map((f, i) => (
                  <li key={i} className="bg-white/70 rounded-xl p-3">
                    <p className="text-xs font-semibold text-nutri-gray-800">{f.factor}</p>
                    <p className="text-xs text-nutri-gray-600 mt-0.5">{f.descripcion}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Factores clínicos */}
          {factoresPresentes.filter((f) => f.fuente === 'perfil').length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-2 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Factores del perfil clínico</span>
              </p>
              <ul className="space-y-2">
                {factoresPresentes.filter((f) => f.fuente === 'perfil').map((f, i) => (
                  <li key={i} className="bg-white/70 rounded-xl p-3">
                    <p className="text-xs font-semibold text-nutri-gray-800">{f.factor}</p>
                    <p className="text-xs text-nutri-gray-600 mt-0.5">{f.descripcion}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Factores protectores */}
          {factoresProtectores.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Factores protectores ({factoresProtectores.length})</span>
              </p>
              <ul className="space-y-1.5">
                {factoresProtectores.map((f, i) => (
                  <li key={i} className="text-xs text-nutri-gray-600 flex items-start space-x-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    <span>{f.factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidencia RAG — carga lazy */}
          <div>
            <button
              type="button"
              onClick={() => {
                const next = !showEvidencia;
                setShowEvidencia(next);
                if (next && evidencia.length === 0 && !loadingEvidencia && !evidenciaError) {
                  setLoadingEvidencia(true);
                  obtenerEvidenciaProyeccion(proy.enfermedad)
                    .then((data: EvidenciaChunk[]) => setEvidencia(data))
                    .catch(() => setEvidenciaError(true))
                    .finally(() => setLoadingEvidencia(false));
                }
              }}
              className="text-xs text-nutri-primary font-medium flex items-center space-x-1 hover:underline"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{showEvidencia ? 'Ocultar' : 'Ver'} evidencia de guías clínicas</span>
            </button>

            {showEvidencia && (
              <div className="mt-2">
                {loadingEvidencia && (
                  <div className="flex items-center space-x-2 text-xs text-nutri-gray-400 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Buscando en guías clínicas...</span>
                  </div>
                )}
                {evidenciaError && (
                  <p className="text-xs text-nutri-gray-400 italic py-1">No se pudo cargar la evidencia.</p>
                )}
                {!loadingEvidencia && !evidenciaError && evidencia.length === 0 && (
                  <p className="text-xs text-nutri-gray-400 italic py-1">Sin evidencia disponible.</p>
                )}
                {evidencia.length > 0 && (
                  <ul className="space-y-2">
                    {evidencia.map((ev, i) => (
                      <li key={i} className="bg-white/80 rounded-xl p-3 border border-white">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-nutri-primary">{ev.autoridad}</span>
                          <span className="text-xs text-nutri-gray-400">{(ev.similitud * 100).toFixed(0)}% relevancia</span>
                        </div>
                        <p className="text-xs text-nutri-gray-600 leading-relaxed line-clamp-4">{ev.texto}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Proyecciones() {
  const { userId } = useAuth();
  const [datos, setDatos] = useState<ProyeccionesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    obtenerProyecciones(userId)
      .then((res) => {
        setDatos(res);
        // Guardar proyecciones en BD para análisis longitudinal
        const filas = res.proyecciones.map((p: ProyeccionEnfermedad) => ({
          user_id: userId,
          enfermedad: p.enfermedad,
          score_total: p.puntaje,
          score_perfil: p.puntaje_perfil,
          score_dieta: p.puntaje_dieta,
          nivel_riesgo: p.riesgo,
          tendencia_dieta: p.patron_dieta?.tendencia ?? null,
          factores: p.factores_presentes,
        }));
        supabase.from('proyecciones_ecnt').insert(filas).then(({ error }) => {
          if (error) console.warn('No se pudieron guardar proyecciones:', error.message);
        });
      })
      .catch((err) => {
        const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
        setError(
          isTimeout
            ? 'Las proyecciones tardaron demasiado en cargar. Recarga la página para intentar de nuevo.'
            : 'No se pudieron cargar las proyecciones. Verifica que tu perfil esté completo.'
        );
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-nutri-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <h1 className="text-2xl font-bold text-nutri-gray-900 mb-4">Proyecciones ECNT</h1>
        <div className="bg-nutri-gray-50 border border-nutri-gray-200 rounded-xl p-4 flex items-start space-x-2 text-sm text-nutri-gray-600">
          <X className="w-4 h-4 mt-0.5 shrink-0 text-nutri-gray-400" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!datos) return null;

  const resumen = datos.resumen_dieta as Record<string, unknown>;
  const n = (v: unknown, fallback = 0): number => { const x = Number(v); return isFinite(x) ? x : fallback; };
  const tieneResumen = !resumen.sin_datos && n(resumen.dias_con_datos) > 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-nutri-gray-900">Proyecciones ECNT</h1>
          <p className="text-nutri-gray-600 text-sm mt-1">
            Evaluación de riesgo para enfermedades crónicas no transmisibles
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-nutri-gray-50 border border-nutri-gray-200 rounded-xl p-3 mb-6 text-xs text-nutri-gray-500 flex items-start space-x-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            El riesgo combina tu perfil clínico (máx 40 pts) con tus hábitos alimenticios de los últimos
            30 días (máx 60 pts). Esta herramienta es educativa y no sustituye la consulta médica.
          </span>
        </div>

        {/* Resumen de ingesta analizada */}
        {tieneResumen && (
          <div className="bg-white border border-nutri-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
            <p className="text-xs font-semibold text-nutri-gray-500 uppercase tracking-wide mb-3">
              Tu patrón alimentario · {n(resumen.dias_con_datos)} días analizados
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { v: n(resumen.avg_kcal).toFixed(0),         u: 'kcal/reg.' },
                { v: n(resumen.pct_carbs).toFixed(0) + '%',  u: 'carbos VCT' },
                { v: n(resumen.pct_grasas).toFixed(0) + '%', u: 'grasas VCT' },
                { v: n(resumen.avg_sodio_mg).toFixed(0),     u: 'mg sodio' },
                { v: n(resumen.avg_fibra_g).toFixed(1),      u: 'g fibra' },
                { v: `${n(resumen.dias_hipercaloricos)}/${n(resumen.dias_con_datos)}`, u: 'días >2500 kcal' },
              ].map(({ v, u }) => (
                <div key={u} className="bg-nutri-gray-50 rounded-xl p-2">
                  <p className="text-sm font-bold text-nutri-primary">{v}</p>
                  <p className="text-nutri-gray-500">{u}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!tieneResumen && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-xs text-blue-700 flex items-start space-x-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Sin registros en el diario alimentario. Las proyecciones se basan solo en tu perfil.
              Registra tus comidas para mejorar la precisión del análisis.
            </span>
          </div>
        )}

        {/* Cards de proyección */}
        <div className="space-y-3 mb-6">
          {datos.proyecciones.map((p) => (
            <ProyeccionCard key={p.enfermedad} proy={p} />
          ))}
        </div>

        <p className="text-xs text-nutri-gray-400 italic">{datos.nota}</p>
      </div>
    </div>
  );
}

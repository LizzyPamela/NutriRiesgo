import { useEffect, useState } from 'react';
import {
  Users, MessageSquare, ShieldOff, ArrowUpRight,
  DollarSign, Loader2, RefreshCw, AlertCircle,
  TrendingUp, Clock, CheckCircle, ThumbsUp, Database, BookOpen, FileText,
} from 'lucide-react';
import { obtenerResumenAdmin } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface MetricaDia {
  fecha: string
  total_consultas: number
  usuarios_unicos: number
  consultas_con_abstension: number
  consultas_con_derivacion: number
  evaluaciones_positivas: number
  evaluaciones_negativas: number
  tiempo_promedio_ms: number
  costo_total_dia: number
}
interface DistribucionRiesgo {
  categoria_riesgo: string
  num_usuarios: number
  edad_promedio: number
  imc_promedio: number
  usuarios_derivacion: number
  hombres: number
  mujeres: number
}
interface ResumenKB {
  autoridad: string
  tipo_doc: string
  nivel_evidencia: string
  total_chunks: number
  chunks_con_embedding: number
}
interface ResumenAlimento {
  categoria: string
  total_alimentos: number
  alimentos_hondurenos: number
  promedio_calorias: number
  promedio_completitud: number
}
interface LogItem {
  id: string
  nivel: string
  mensaje: string
  detalles: Record<string, unknown> | null
  created_at: string
}
interface ActividadItem {
  id: string
  consulta_preview: string
  abstension: boolean
  derivacion: boolean
  nivel_confianza: string
  tipo_consulta: string
  tiempo_respuesta_ms: number
  costo_usd: number
  created_at: string
}
interface Resumen {
  usuarios:    { total: number; esta_semana: number }
  consultas:   { total: number; hoy: number; por_dia: MetricaDia[] }
  abstenciones:{ total: number; pct: number }
  derivaciones:{ total: number; pct: number }
  satisfaccion:{ positivas: number; negativas: number; pct_positivo: number | null }
  rendimiento: { tiempo_promedio_ms: number }
  costo_usd:   { total: number; promedio_por_consulta: number }
  distribucion_riesgo: DistribucionRiesgo[]
  knowledge_base: ResumenKB[]
  alimentos_db: ResumenAlimento[]
  actividad_reciente: ActividadItem[]
  logs_sistema: {
    recientes: LogItem[]
    por_nivel: { nivel: string; cantidad: number }[]
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtHora(iso: string) {
  return new Date(iso).toLocaleString('es-HN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const riesgoColor: Record<string, string> = {
  bajo: 'bg-green-100 text-green-800',
  moderado: 'bg-amber-100 text-amber-800',
  alto: 'bg-red-100 text-red-800',
  muy_alto: 'bg-purple-100 text-purple-800',
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm">
      <div className={`w-fit p-2.5 rounded-xl ${color}`}>{icon}</div>
      <p className="mt-4 text-2xl font-bold text-nutri-gray-900">{value}</p>
      <p className="text-sm font-medium text-nutri-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-nutri-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Gráfico de barras (por día) ───────────────────────────────────────────────
function BarChart({ datos }: { datos: MetricaDia[] }) {
  if (!datos.length) return (
    <p className="text-xs text-nutri-gray-400 italic py-4 text-center">Sin datos de los últimos 7 días</p>
  );
  const max = Math.max(...datos.map((d) => d.total_consultas), 1);
  return (
    <div className="flex items-end gap-1.5 h-20 w-full">
      {datos.map((d) => (
        <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md bg-nutri-primary/80 bar-dynamic"
            style={{ '--bar-h': `${(d.total_consultas / max) * 64}px` } as React.CSSProperties}
            title={`${d.total_consultas} consultas · ${d.usuarios_unicos} usuarios · ${d.consultas_con_abstension} abstenciones`}
          />
          <span className="text-[10px] text-nutri-gray-400">{d.fecha.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Distribución de riesgo ────────────────────────────────────────────────────
function TablaRiesgo({ datos }: { datos: DistribucionRiesgo[] }) {
  if (!datos.length) return <p className="text-xs text-nutri-gray-400 italic">Sin datos de perfiles.</p>;
  const total = datos.reduce((s, d) => s + d.num_usuarios, 0);
  return (
    <div className="space-y-2">
      {datos.map((d) => (
        <div key={d.categoria_riesgo} className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize w-24 text-center ${riesgoColor[d.categoria_riesgo] ?? 'bg-gray-100 text-gray-700'}`}>
            {d.categoria_riesgo?.replace('_', ' ')}
          </span>
          <div className="flex-1 h-2 bg-nutri-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-nutri-primary/70 rounded-full"
              style={{ width: `${total > 0 ? (d.num_usuarios / total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-bold text-nutri-gray-700 w-6 text-right">{d.num_usuarios}</span>
          <span className="text-xs text-nutri-gray-400 hidden sm:inline">
            IMC {d.imc_promedio} · {d.usuarios_derivacion} deriv.
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Resumen Knowledge Base ────────────────────────────────────────────────────
function TablaKB({ datos }: { datos: ResumenKB[] }) {
  if (!datos.length) return <p className="text-xs text-nutri-gray-400 italic">Sin datos.</p>;
  const totalChunks = datos.reduce((s, d) => s + d.total_chunks, 0);
  const totalEmb    = datos.reduce((s, d) => s + d.chunks_con_embedding, 0);
  return (
    <>
      <div className="flex justify-between text-xs text-nutri-gray-500 mb-3 pb-2 border-b border-nutri-gray-100">
        <span>{totalChunks} chunks totales</span>
        <span className="font-semibold text-nutri-primary">{totalEmb} con embedding</span>
      </div>
      <div className="space-y-1.5">
        {datos.map((d, i) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <div className="min-w-0">
              <span className="font-semibold text-nutri-gray-800">{d.autoridad}</span>
              <span className="text-nutri-gray-400 ml-1">· {d.tipo_doc}</span>
            </div>
            <span className="text-nutri-primary font-bold ml-2 shrink-0">{d.total_chunks}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Actividad reciente ────────────────────────────────────────────────────────
function TablaActividad({ items }: { items: ActividadItem[] }) {
  if (!items.length) return (
    <p className="text-sm text-nutri-gray-400 text-center py-8">No hay actividad registrada aún.</p>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-nutri-gray-500 border-b border-nutri-gray-100">
            <th className="text-left py-2 pr-4 font-medium">Consulta</th>
            <th className="text-left py-2 pr-4 font-medium">Tipo</th>
            <th className="text-center py-2 pr-3 font-medium">Abs.</th>
            <th className="text-center py-2 pr-3 font-medium">Deriv.</th>
            <th className="text-right py-2 pr-3 font-medium">ms</th>
            <th className="text-right py-2 font-medium">Hora</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-nutri-gray-50">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-nutri-gray-50 transition-colors">
              <td className="py-2.5 pr-4 max-w-[200px]">
                <p className="truncate text-nutri-gray-700">{item.consulta_preview}</p>
              </td>
              <td className="py-2.5 pr-4">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {item.tipo_consulta ?? '—'}
                </span>
              </td>
              <td className="py-2.5 pr-3 text-center">
                {item.abstension
                  ? <span className="text-red-500 font-bold">Sí</span>
                  : <CheckCircle className="w-3.5 h-3.5 text-green-400 mx-auto" />}
              </td>
              <td className="py-2.5 pr-3 text-center">
                {item.derivacion
                  ? <span className="text-amber-500 font-bold">Sí</span>
                  : <span className="text-nutri-gray-300">—</span>}
              </td>
              <td className="py-2.5 pr-3 text-right text-nutri-gray-500">{item.tiempo_respuesta_ms ?? '—'}</td>
              <td className="py-2.5 text-right text-nutri-gray-400 whitespace-nowrap">{fmtHora(item.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Admin() {
  const [datos, setDatos]     = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [ultimaAct, setUltimaAct] = useState<Date | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await obtenerResumenAdmin();
      setDatos(res);
      setUltimaAct(new Date());
    } catch {
      setError('No se pudo conectar al backend. ¿Está corriendo el servidor?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-nutri-gray-900">Panel de Auditoría</h1>
            <p className="text-nutri-gray-500 text-sm mt-0.5">Métricas del piloto — vistas analíticas en tiempo real</p>
          </div>
          <button
            type="button"
            onClick={cargar}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-nutri-primary border border-nutri-primary rounded-xl px-4 py-2 hover:bg-nutri-primary hover:text-white transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && !datos && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-nutri-primary animate-spin" />
          </div>
        )}

        {datos && (
          <>
            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={<Users className="w-5 h-5 text-blue-600" />}
                label="Usuarios registrados"
                value={datos.usuarios.total}
                sub={`+${datos.usuarios.esta_semana} esta semana`}
                color="bg-blue-50"
              />
              <StatCard
                icon={<MessageSquare className="w-5 h-5 text-nutri-primary" />}
                label="Consultas totales"
                value={datos.consultas.total}
                sub={`${datos.consultas.hoy} hoy`}
                color="bg-green-50"
              />
              <StatCard
                icon={<ShieldOff className="w-5 h-5 text-red-500" />}
                label="Abstenciones"
                value={datos.abstenciones.total}
                sub={`${datos.abstenciones.pct}% de consultas`}
                color="bg-red-50"
              />
              <StatCard
                icon={<ArrowUpRight className="w-5 h-5 text-amber-500" />}
                label="Derivaciones médicas"
                value={datos.derivaciones.total}
                sub={`${datos.derivaciones.pct}% de usuarios`}
                color="bg-amber-50"
              />
            </div>

            {/* ── Fila: gráfico + métricas rápidas ── */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {/* Gráfico barras */}
              <div className="md:col-span-2 bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-nutri-primary" />
                  <p className="text-sm font-semibold text-nutri-gray-800">Consultas · últimos 7 días</p>
                </div>
                <BarChart datos={datos.consultas.por_dia} />
                {/* Detalle por día */}
                {datos.consultas.por_dia.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {datos.consultas.por_dia.slice(-3).reverse().map((d) => (
                      <div key={d.fecha} className="flex items-center justify-between text-xs text-nutri-gray-500">
                        <span>{d.fecha}</span>
                        <span>{d.total_consultas} consultas · {d.usuarios_unicos} usuarios · {d.tiempo_promedio_ms} ms prom.</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Métricas rápidas */}
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-nutri-gray-500" />
                    <p className="text-xs font-semibold text-nutri-gray-500 uppercase tracking-wide">Rendimiento</p>
                  </div>
                  <p className="text-xl font-bold text-nutri-gray-900">{datos.rendimiento.tiempo_promedio_ms} ms</p>
                  <p className="text-xs text-nutri-gray-400 mt-0.5">tiempo promedio de respuesta</p>
                </div>

                <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="w-4 h-4 text-green-500" />
                    <p className="text-xs font-semibold text-nutri-gray-500 uppercase tracking-wide">Satisfacción</p>
                  </div>
                  {datos.satisfaccion.pct_positivo !== null
                    ? <>
                        <p className="text-xl font-bold text-green-600">{datos.satisfaccion.pct_positivo}%</p>
                        <p className="text-xs text-nutri-gray-400 mt-0.5">
                          {datos.satisfaccion.positivas} positivas · {datos.satisfaccion.negativas} negativas
                        </p>
                      </>
                    : <p className="text-xs text-nutri-gray-400 italic">Sin evaluaciones aún</p>
                  }
                </div>

                <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-semibold text-nutri-gray-500 uppercase tracking-wide">Costo API</p>
                  </div>
                  <p className="text-xl font-bold text-nutri-gray-900">${datos.costo_usd.total}</p>
                  <p className="text-xs text-nutri-gray-400 mt-0.5">~${datos.costo_usd.promedio_por_consulta} / consulta</p>
                </div>
              </div>
            </div>

            {/* ── Distribución de riesgo + KB ── */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-nutri-primary" />
                  <p className="text-sm font-semibold text-nutri-gray-800">Distribución de riesgo PREVENT</p>
                </div>
                <TablaRiesgo datos={datos.distribucion_riesgo} />
              </div>

              <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-nutri-primary" />
                  <p className="text-sm font-semibold text-nutri-gray-800">Base de conocimiento (RAG)</p>
                </div>
                <TablaKB datos={datos.knowledge_base} />
              </div>
            </div>

            {/* ── Base de alimentos top categorías ── */}
            <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-nutri-primary" />
                <p className="text-sm font-semibold text-nutri-gray-800">Base de alimentos · top categorías</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {datos.alimentos_db.map((a) => (
                  <div key={a.categoria} className="bg-nutri-gray-50 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-nutri-primary">{a.total_alimentos.toLocaleString()}</p>
                    <p className="text-xs text-nutri-gray-600 mt-0.5 leading-tight capitalize">
                      {a.categoria.replace(/_/g, ' ')}
                    </p>
                    {a.alimentos_hondurenos > 0 && (
                      <p className="text-[10px] text-amber-600 mt-1">{a.alimentos_hondurenos} HN</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Actividad reciente ── */}
            <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-nutri-primary" />
                <p className="text-sm font-semibold text-nutri-gray-800">Actividad reciente</p>
                <span className="text-xs text-nutri-gray-400 ml-auto">últimas 10 consultas</span>
              </div>
              <TablaActividad items={datos.actividad_reciente} />
            </div>

            {/* ── Logs del sistema ── */}
            <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-nutri-primary" />
                <p className="text-sm font-semibold text-nutri-gray-800">Logs del sistema</p>
                <div className="ml-auto flex gap-2">
                  {datos.logs_sistema.por_nivel.map((l) => (
                    <span key={l.nivel} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      l.nivel === 'error'   ? 'bg-red-100 text-red-700' :
                      l.nivel === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {l.nivel} ({l.cantidad})
                    </span>
                  ))}
                </div>
              </div>

              {datos.logs_sistema.recientes.length === 0
                ? <p className="text-xs text-nutri-gray-400 italic text-center py-6">
                    Sin logs aún — se registrarán con la primera consulta al chat.
                  </p>
                : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {datos.logs_sistema.recientes.map((log) => (
                      <div key={log.id} className={`rounded-xl p-3 text-xs ${
                        log.nivel === 'error'   ? 'bg-red-50 border border-red-100' :
                        log.nivel === 'warning' ? 'bg-amber-50 border border-amber-100' :
                        'bg-green-50 border border-green-100'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold uppercase tracking-wide ${
                            log.nivel === 'error'   ? 'text-red-600' :
                            log.nivel === 'warning' ? 'text-amber-600' :
                            'text-green-700'
                          }`}>{log.nivel}</span>
                          <span className="text-nutri-gray-400">{fmtHora(log.created_at)}</span>
                        </div>
                        <p className="text-nutri-gray-700 font-medium">{log.mensaje}</p>
                        {log.detalles && (
                          <p className="text-nutri-gray-500 mt-0.5 truncate">
                            {Object.entries(log.detalles)
                              .filter(([, v]) => v !== null && v !== undefined)
                              .slice(0, 4)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
            </div>

            {ultimaAct && (
              <p className="text-xs text-nutri-gray-400 text-right mt-4">
                Actualizado: {ultimaAct.toLocaleTimeString('es-HN')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { obtenerDiarioAlimentario, obtenerPerfil } from '../services/api';

interface RegistroComida {
  fecha: string;
  total_calorias: number;
  total_proteina_g: number;
  total_carbohidratos_g: number;
  total_grasas_g: number;
}

interface DiaStats {
  day: string;
  fecha: string;
  kcal: number;
}

const META_KCAL = 2200;

// Últimos 7 días
function ultimos7Dias(): { day: string; fecha: string }[] {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: dias[d.getDay()],
      fecha: d.toISOString().split('T')[0],
    };
  });
}

export default function Estadisticas() {
  const { userId } = useAuth();
  const [registros, setRegistros] = useState<RegistroComida[]>([]);
  const [perfil, setPerfil] = useState<{ imc?: number; categoria_riesgo?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.allSettled([
      obtenerDiarioAlimentario(userId),
      obtenerPerfil(userId),
    ]).then(([diarioRes, perfilRes]) => {
      if (diarioRes.status === 'fulfilled') setRegistros(diarioRes.value?.registros ?? []);
      if (perfilRes.status === 'fulfilled') setPerfil(perfilRes.value);
    }).finally(() => setLoading(false));
  }, [userId]);

  const semanaBase = ultimos7Dias();

  // Agrupar calorías por día
  const semana: DiaStats[] = semanaBase.map(({ day, fecha }) => {
    const kcal = registros
      .filter((r) => r.fecha?.startsWith(fecha))
      .reduce((acc, r) => acc + (r.total_calorias ?? 0), 0);
    return { day, fecha, kcal };
  });

  const maxKcal = Math.max(...semana.map((d) => d.kcal), META_KCAL);

  // Totales últimos 7 días
  const registros7 = registros.filter((r) =>
    semanaBase.some((d) => r.fecha?.startsWith(d.fecha))
  );
  const totalKcal7 = registros7.reduce((a, r) => a + (r.total_calorias ?? 0), 0);
  const totalProt7 = registros7.reduce((a, r) => a + (r.total_proteina_g ?? 0), 0);
  const totalCarbs7 = registros7.reduce((a, r) => a + (r.total_carbohidratos_g ?? 0), 0);
  const totalGrasas7 = registros7.reduce((a, r) => a + (r.total_grasas_g ?? 0), 0);
  const diasConDatos = semana.filter((d) => d.kcal > 0).length;
  const promedioKcal = diasConDatos > 0 ? totalKcal7 / diasConDatos : 0;
  const diasSobreObjetivo = semana.filter((d) => d.kcal > META_KCAL).length;

  // Distribución de macros (sobre totales)
  const totalMacros = totalProt7 * 4 + totalCarbs7 * 4 + totalGrasas7 * 9;
  const macros =
    totalMacros > 0
      ? [
          { label: 'Carbohidratos', pct: Math.round((totalCarbs7 * 4 / totalMacros) * 100), color: 'bg-nutri-info', grams: `${totalCarbs7.toFixed(0)} g` },
          { label: 'Grasas', pct: Math.round((totalGrasas7 * 9 / totalMacros) * 100), color: 'bg-nutri-accent', grams: `${totalGrasas7.toFixed(0)} g` },
          { label: 'Proteínas', pct: Math.round((totalProt7 * 4 / totalMacros) * 100), color: 'bg-nutri-success', grams: `${totalProt7.toFixed(0)} g` },
        ]
      : [
          { label: 'Carbohidratos', pct: 55, color: 'bg-nutri-info', grams: '— g' },
          { label: 'Grasas', pct: 30, color: 'bg-nutri-accent', grams: '— g' },
          { label: 'Proteínas', pct: 15, color: 'bg-nutri-success', grams: '— g' },
        ];

  const resumen = [
    { label: 'Promedio calórico diario', value: diasConDatos > 0 ? `${promedioKcal.toFixed(0)} kcal` : 'Sin datos' },
    { label: 'Días con registros', value: `${diasConDatos} de 7` },
    { label: 'Días sobre objetivo', value: `${diasSobreObjetivo} de 7` },
    { label: 'IMC actual', value: perfil?.imc ? `${perfil.imc.toFixed(1)} (${perfil.categoria_riesgo ?? 'ver perfil'})` : 'Completa tu perfil' },
    { label: 'Proteínas (7 días)', value: `${totalProt7.toFixed(0)} g total` },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-nutri-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-nutri-gray-900">Estadísticas</h1>
          <p className="text-nutri-gray-600 text-sm mt-1">
            Últimos 7 días &middot; {diasConDatos > 0 ? 'Datos reales de tu diario' : 'Registra comidas para ver estadísticas'}
          </p>
        </div>

        {/* Calorías Semanales */}
        <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-nutri-gray-900">Calorías Semanales</h2>
            <div className="flex items-center space-x-4 text-xs text-nutri-gray-500">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-nutri-primary inline-block" />
                <span>Consumido</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-nutri-secondary inline-block" />
                <span>Sobre objetivo</span>
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2" style={{ height: '140px' }}>
            {semana.map(({ day, kcal }) => (
              <div key={day} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                  {kcal > 0 ? (
                    <div
                      className={`w-full rounded-t-md transition-all ${kcal > META_KCAL ? 'bg-nutri-secondary' : 'bg-nutri-primary'}`}
                      style={{ height: `${(kcal / maxKcal) * 100}px` }}
                    />
                  ) : (
                    <div className="w-full rounded-t-md bg-nutri-gray-100" style={{ height: '4px' }} />
                  )}
                </div>
                <p className="text-xs font-medium text-nutri-gray-700 mt-2">{day}</p>
                <p className="text-xs text-nutri-gray-400">{kcal > 0 ? kcal.toFixed(0) : '—'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Macros */}
          <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-nutri-gray-900 mb-4">Distribución de Macros</h2>
            <div className="flex rounded-full overflow-hidden h-3 mb-5">
              {macros.map(({ label, pct, color }) => (
                <div
                  key={label}
                  className={`${color} h-full`}
                  style={{ width: `${pct}%` }}
                  title={`${label}: ${pct}%`}
                />
              ))}
            </div>
            <div className="space-y-3">
              {macros.map(({ label, pct, color, grams }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-sm ${color}`} />
                    <span className="text-sm text-nutri-gray-700">{label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-nutri-gray-900">{pct}%</span>
                    <span className="text-xs text-nutri-gray-400 ml-1.5">{grams}</span>
                  </div>
                </div>
              ))}
            </div>
            {totalMacros === 0 && (
              <p className="text-xs text-nutri-gray-400 mt-4 text-center">
                Registra comidas para ver tu distribución real
              </p>
            )}
          </div>

          {/* Resumen */}
          <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-nutri-gray-900 mb-4">Resumen Semanal</h2>
            <div className="space-y-3">
              {resumen.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-center border-b border-nutri-gray-100 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-nutri-gray-600">{label}</span>
                  <span className="text-sm font-semibold text-nutri-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Estado vacío */}
        {diasConDatos === 0 && (
          <div className="bg-nutri-gray-50 rounded-2xl border border-nutri-gray-200 p-8 text-center">
            <p className="text-nutri-gray-600 font-medium mb-1">Sin datos suficientes</p>
            <p className="text-sm text-nutri-gray-400">
              Ve al Diario Alimentario y registra tus comidas para ver estadísticas detalladas aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

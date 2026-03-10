import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Calendar, BarChart3, Search, Flame, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { obtenerPerfil, obtenerDiarioAlimentario } from '../services/api';

const quickActions = [
  { label: 'Chat IA', path: '/chat', icon: MessageSquare, color: 'bg-nutri-primary', desc: 'Consulta nutricional' },
  { label: 'Diario', path: '/diario', icon: Calendar, color: 'bg-nutri-success', desc: 'Registrar comidas' },
  { label: 'Estadísticas', path: '/estadisticas', icon: BarChart3, color: 'bg-nutri-info', desc: 'Ver progreso' },
  { label: 'Alimentos', path: '/alimentos', icon: Search, color: 'bg-nutri-accent', desc: 'Buscar alimentos' },
];

interface PerfilData {
  imc?: number;
  categoria_riesgo?: string;
  riesgo_prevent?: number;
  requiere_derivacion?: boolean;
}

interface RegistroComida {
  total_calorias?: number;
  total_proteina_g?: number;
  tiempo_comida?: string;
  fecha?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { userId, displayName } = useAuth();

  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [comidasHoy, setComidasHoy] = useState<RegistroComida[]>([]);
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
  const hoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      try {
        const [perfilData, diarioData] = await Promise.allSettled([
          obtenerPerfil(userId),
          obtenerDiarioAlimentario(userId),
        ]);

        if (perfilData.status === 'fulfilled') setPerfil(perfilData.value);
        if (diarioData.status === 'fulfilled') {
          const registros: RegistroComida[] = diarioData.value?.registros ?? [];
          setComidasHoy(registros.filter((r: RegistroComida) => r.fecha === hoy));
        }
      } finally {
        setLoadingPerfil(false);
      }
    };

    loadData();
  }, [userId, hoy]);

  const caloriasHoy = comidasHoy.reduce((acc, r) => acc + (r.total_calorias ?? 0), 0);
  const proteinaHoy = comidasHoy.reduce((acc, r) => acc + (r.total_proteina_g ?? 0), 0);
  const metaCalorias = 2200;

  const stats = [
    {
      label: 'Calorías hoy',
      value: loadingPerfil ? '...' : caloriasHoy.toFixed(0),
      unit: 'kcal',
      icon: Flame,
      target: `meta: ${metaCalorias}`,
      pct: Math.min((caloriasHoy / metaCalorias) * 100, 100),
    },
    {
      label: 'Proteínas hoy',
      value: loadingPerfil ? '...' : proteinaHoy.toFixed(1),
      unit: 'g',
      icon: Activity,
      target: 'meta: 80 g',
      pct: Math.min((proteinaHoy / 80) * 100, 100),
    },
    {
      label: 'IMC',
      value: loadingPerfil ? '...' : (perfil?.imc?.toFixed(1) ?? '—'),
      unit: '',
      icon: TrendingUp,
      target: perfil?.categoria_riesgo ?? 'Sin datos',
      pct: perfil?.imc ? Math.min(((perfil.imc - 15) / 25) * 100, 100) : 0,
    },
    {
      label: 'Comidas registradas',
      value: loadingPerfil ? '...' : String(comidasHoy.length),
      unit: 'hoy',
      icon: Calendar,
      target: 'Recomendado: 4',
      pct: Math.min((comidasHoy.length / 4) * 100, 100),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-nutri-gray-900">
          {saludo}, {displayName}
        </h1>
        <p className="text-nutri-gray-600 mt-1 text-sm">Resumen de tu día</p>
      </div>

      {/* Alerta derivación */}
      {perfil?.requiere_derivacion && (
        <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            Tu perfil indica que podrías beneficiarte de una consulta con un profesional de salud.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, unit, icon: Icon, target, pct }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-nutri-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5 text-nutri-primary" />
              <span className="text-xs text-nutri-gray-400 text-right max-w-20 leading-tight">
                {target}
              </span>
            </div>
            <p className="text-2xl font-bold text-nutri-gray-900">
              {value}
              {unit && <span className="text-sm font-normal text-nutri-gray-500 ml-1">{unit}</span>}
            </p>
            <p className="text-xs text-nutri-gray-600 mt-0.5 mb-2">{label}</p>
            <div className="h-1.5 bg-nutri-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-nutri-primary rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-nutri-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map(({ label, path, icon: Icon, color, desc }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="bg-white rounded-2xl p-5 border border-nutri-gray-200 hover:border-nutri-primary hover:shadow-md transition-all text-left group"
            >
              <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-semibold text-nutri-gray-900 text-sm">{label}</p>
              <p className="text-xs text-nutri-gray-500 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Comidas del día */}
      <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-nutri-gray-900">Comidas de Hoy</h2>
          <button
            type="button"
            onClick={() => navigate('/diario')}
            className="text-xs text-nutri-primary hover:text-nutri-primary-dark font-medium"
          >
            Ver diario
          </button>
        </div>
        {loadingPerfil ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-nutri-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comidasHoy.length === 0 ? (
          <p className="text-nutri-gray-400 text-sm text-center py-6">
            No has registrado comidas hoy.{' '}
            <button type="button" onClick={() => navigate('/diario')} className="text-nutri-primary underline">
              Agregar ahora
            </button>
          </p>
        ) : (
          <div className="space-y-3">
            {comidasHoy.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-nutri-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-nutri-primary" />
                  <span className="text-sm font-medium text-nutri-gray-800 capitalize">
                    {r.tiempo_comida}
                  </span>
                </div>
                <span className="text-sm text-nutri-gray-500">
                  {(r.total_calorias ?? 0).toFixed(0)} kcal
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

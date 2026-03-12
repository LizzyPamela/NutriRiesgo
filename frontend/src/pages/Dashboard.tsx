import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fechaHoyHonduras, horaHonduras } from '../utils/fecha';
import {
  MessageSquare, Calendar, BarChart3, Search,
  Flame, Activity, TrendingUp, AlertCircle,
  Lightbulb, FlaskConical, Heart, ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { obtenerPerfil, obtenerDiarioAlimentario, crearOActualizarPerfil } from '../services/api';
import { calcularObjetivos } from '../utils/nutricion';

const quickActions = [
  { label: 'Chat IA',          path: '/chat',            icon: MessageSquare, color: 'bg-nutri-primary',   desc: 'Consulta nutricional' },
  { label: 'Diario',           path: '/diario',          icon: Calendar,      color: 'bg-nutri-success',   desc: 'Registrar comidas' },
  { label: 'Recomendaciones',  path: '/recomendaciones', icon: Lightbulb,     color: 'bg-amber-500',       desc: 'Ver sugerencias' },
  { label: 'Estadísticas',     path: '/estadisticas',    icon: BarChart3,     color: 'bg-nutri-info',      desc: 'Ver progreso' },
  { label: 'Alimentos',        path: '/alimentos',       icon: Search,        color: 'bg-nutri-accent',    desc: 'Buscar alimentos' },
  { label: 'Exámenes',         path: '/examenes',        icon: FlaskConical,  color: 'bg-purple-500',      desc: 'Laboratorio' },
];

interface PerfilData {
  imc?: number;
  categoria_riesgo?: string;
  riesgo_prevent?: number;
  requiere_derivacion?: boolean;
  peso_kg?: number;
  altura_cm?: number;
  edad?: number;
  sexo?: string;
  actividad_fisica?: string;
  antecedentes_familiares?: {
    diabetes?: boolean;
    hipertension?: boolean;
    cardiopatia?: boolean;
  };
}

interface RegistroComida {
  total_calorias?: number;
  total_proteina_g?: number;
  tiempo_comida?: string;
  fecha?: string;
}

function imcColor(imc: number) {
  if (imc < 18.5) return 'text-blue-500';
  if (imc < 25)   return 'text-green-600';
  if (imc < 30)   return 'text-amber-500';
  return 'text-red-500';
}
function imcLabel(imc: number) {
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25)   return 'Normal';
  if (imc < 30)   return 'Sobrepeso';
  return 'Obesidad';
}

const actMap: Record<string, string> = {
  sedentario: 'sedentario', ligero: 'ligero', moderado: 'moderado',
  activo: 'intenso', muy_activo: 'muy_intenso',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { userId, displayName, user } = useAuth();

  const [perfil, setPerfil]             = useState<PerfilData | null>(null);
  const [comidasHoy, setComidasHoy]     = useState<RegistroComida[]>([]);
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  const hora   = horaHonduras();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
  const hoy    = fechaHoyHonduras();

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      try {
        const [perfilRes, diarioRes] = await Promise.allSettled([
          obtenerPerfil(userId),
          obtenerDiarioAlimentario(userId),
        ]);

        if (perfilRes.status === 'fulfilled') {
          setPerfil(perfilRes.value);
        } else {
          // Intentar auto-crear perfil desde metadata de Supabase (registro multi-paso)
          const meta = user?.user_metadata;
          if (meta?.peso_kg && meta?.altura_cm) {
            try {
              const data = await crearOActualizarPerfil(userId, {
                edad:     meta.edad     ? parseInt(String(meta.edad))   : null,
                sexo:     meta.sexo     || null,
                peso_kg:  parseFloat(String(meta.peso_kg)),
                altura_cm: parseFloat(String(meta.altura_cm)),
                perimetro_cintura_cm: meta.perimetro_cintura_cm
                  ? parseFloat(String(meta.perimetro_cintura_cm)) : null,
                actividad_fisica: actMap[meta.nivel_actividad as string] ?? 'moderado',
                fumador: false,
                antecedentes_familiares: {
                  diabetes:   meta.tiene_diabetes   ?? false,
                  hipertension: meta.tiene_hipertension ?? false,
                  cardiopatia:  meta.antecedentes_cardiovasculares ?? false,
                  obesidad: false,
                },
              });
              setPerfil(data);
            } catch { /* perfil no creado, no importa */ }
          }
        }

        if (diarioRes.status === 'fulfilled') {
          const registros: RegistroComida[] = diarioRes.value?.registros ?? [];
          setComidasHoy(registros.filter((r: RegistroComida) => r.fecha?.startsWith(hoy)));
        }
      } finally {
        setLoadingPerfil(false);
      }
    };

    loadData();
  }, [userId, hoy, user]);

  const caloriasHoy  = comidasHoy.reduce((acc, r) => acc + (r.total_calorias ?? 0), 0);
  const proteinaHoy  = comidasHoy.reduce((acc, r) => acc + (r.total_proteina_g ?? 0), 0);

  const objetivos = calcularObjetivos(
    perfil?.peso_kg, perfil?.altura_cm, perfil?.edad, perfil?.sexo, perfil?.actividad_fisica,
  );
  const metaCalorias = objetivos?.get ?? 2200;
  const metaProteina = objetivos?.proteina_g ?? 80;

  const stats = [
    {
      label: 'Calorías hoy', value: loadingPerfil ? '...' : caloriasHoy.toFixed(0),
      unit: 'kcal', icon: Flame, target: `meta: ${metaCalorias} kcal`,
      pct: Math.min((caloriasHoy / metaCalorias) * 100, 100),
    },
    {
      label: 'Proteínas hoy', value: loadingPerfil ? '...' : proteinaHoy.toFixed(1),
      unit: 'g', icon: Activity, target: `meta: ${metaProteina} g`,
      pct: Math.min((proteinaHoy / metaProteina) * 100, 100),
    },
    {
      label: 'IMC', value: loadingPerfil ? '...' : (perfil?.imc?.toFixed(1) ?? '—'),
      unit: '', icon: TrendingUp, target: perfil?.categoria_riesgo ?? 'Sin datos',
      pct: perfil?.imc ? Math.min(((perfil.imc - 15) / 25) * 100, 100) : 0,
    },
    {
      label: 'Comidas registradas', value: loadingPerfil ? '...' : String(comidasHoy.length),
      unit: 'hoy', icon: Calendar, target: 'Recomendado: 4',
      pct: Math.min((comidasHoy.length / 4) * 100, 100),
    },
  ];

  const tieneDiabetes = perfil?.antecedentes_familiares?.diabetes;
  const tieneHta      = perfil?.antecedentes_familiares?.hipertension;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-nutri-gray-900">
          {saludo}, {displayName}
        </h1>
        <p className="text-nutri-gray-600 mt-1 text-sm">Resumen de tu día</p>
      </div>

      {/* Condiciones de salud */}
      {(tieneDiabetes || tieneHta || perfil?.requiere_derivacion) && (
        <div className="flex flex-wrap gap-2 mb-5">
          {tieneDiabetes && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/recomendaciones')}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/recomendaciones')}
              className="flex items-center space-x-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-sm text-orange-700 cursor-pointer hover:bg-orange-100 transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Diabetes — ver recomendaciones</span>
            </div>
          )}
          {tieneHta && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/recomendaciones')}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/recomendaciones')}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <Heart className="w-4 h-4" />
              <span>Hipertensión — guía DASH</span>
            </div>
          )}
          {perfil?.requiere_derivacion && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm text-amber-700">
              <AlertCircle className="w-4 h-4" />
              <span>Riesgo elevado — consulta con especialista</span>
            </div>
          )}
        </div>
      )}

      {/* IMC rápido (si tiene perfil pero sin condiciones badges) */}
      {perfil?.imc && !tieneDiabetes && !tieneHta && (
        <div className="flex items-center space-x-3 bg-white border border-nutri-gray-200 rounded-xl px-4 py-3 mb-5 shadow-sm w-fit">
          <TrendingUp className="w-4 h-4 text-nutri-primary" />
          <span className="text-sm text-nutri-gray-600">IMC:</span>
          <span className={`text-sm font-bold ${imcColor(perfil.imc)}`}>
            {perfil.imc.toFixed(1)} — {imcLabel(perfil.imc)}
          </span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, unit, icon: Icon, target, pct }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-nutri-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5 text-nutri-primary" />
              <span className="text-xs text-nutri-gray-400 text-right max-w-20 leading-tight">{target}</span>
            </div>
            <p className="text-2xl font-bold text-nutri-gray-900">
              {value}
              {unit && <span className="text-sm font-normal text-nutri-gray-500 ml-1">{unit}</span>}
            </p>
            <p className="text-xs text-nutri-gray-600 mt-0.5 mb-2">{label}</p>
            <progress
              value={pct}
              max={100}
              aria-label={`${label}: ${Math.round(pct)}%`}
              className="w-full h-1.5 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-nutri-gray-100 [&::-webkit-progress-value]:bg-nutri-primary [&::-moz-progress-bar]:bg-nutri-primary"
            />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-nutri-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickActions.map(({ label, path, icon: Icon, color, desc }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="bg-white rounded-2xl p-4 border border-nutri-gray-200 hover:border-nutri-primary hover:shadow-md transition-all text-left group"
            >
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-semibold text-nutri-gray-900 text-xs leading-tight">{label}</p>
              <p className="text-xs text-nutri-gray-400 mt-0.5 leading-tight hidden md:block">{desc}</p>
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
                  <span className="text-sm font-medium text-nutri-gray-800 capitalize">{r.tiempo_comida}</span>
                </div>
                <span className="text-sm text-nutri-gray-500">{(r.total_calorias ?? 0).toFixed(0)} kcal</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

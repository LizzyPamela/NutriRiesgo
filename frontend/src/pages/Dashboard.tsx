import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Calendar,
  BarChart3,
  Search,
  Flame,
  Droplets,
  Activity,
  TrendingUp,
} from 'lucide-react';

const quickActions = [
  { label: 'Chat IA', path: '/chat', icon: MessageSquare, color: 'bg-nutri-primary', desc: 'Consulta nutricional' },
  { label: 'Diario', path: '/diario', icon: Calendar, color: 'bg-nutri-success', desc: 'Registrar comidas' },
  { label: 'Estadísticas', path: '/estadisticas', icon: BarChart3, color: 'bg-nutri-info', desc: 'Ver progreso' },
  { label: 'Alimentos', path: '/alimentos', icon: Search, color: 'bg-nutri-accent', desc: 'Buscar alimentos' },
];

const stats = [
  { label: 'Calorías hoy', value: '1,840', unit: 'kcal', icon: Flame, target: 'meta: 2200', pct: 84 },
  { label: 'Agua', value: '1.8', unit: 'L', icon: Droplets, target: 'meta: 2.5 L', pct: 72 },
  { label: 'Proteínas', value: '68', unit: 'g', icon: Activity, target: 'meta: 80 g', pct: 85 },
  { label: 'IMC', value: '23.4', unit: '', icon: TrendingUp, target: 'Normal', pct: 100 },
];

const actividad = [
  { text: 'Consultaste sobre alimentos ricos en hierro', time: 'Hace 2 horas', color: 'bg-nutri-primary' },
  { text: 'Registraste el desayuno: Avena con fruta', time: 'Hace 4 horas', color: 'bg-nutri-success' },
  { text: 'Actualizaste tu perfil nutricional', time: 'Ayer', color: 'bg-nutri-info' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const user: { nombre?: string } = JSON.parse(localStorage.getItem('user') || '{}');
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-nutri-gray-900">
          {saludo}, {user.nombre || 'Usuario'}
        </h1>
        <p className="text-nutri-gray-600 mt-1 text-sm">
          Aquí tienes un resumen de tu día
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, unit, icon: Icon, target, pct }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-5 border border-nutri-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5 text-nutri-primary" />
              <span className="text-xs text-nutri-gray-400">{target}</span>
            </div>
            <p className="text-2xl font-bold text-nutri-gray-900">
              {value}
              <span className="text-sm font-normal text-nutri-gray-500 ml-1">{unit}</span>
            </p>
            <p className="text-xs text-nutri-gray-600 mt-0.5 mb-2">{label}</p>
            <div className="h-1.5 bg-nutri-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-nutri-primary rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-nutri-gray-900 mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map(({ label, path, icon: Icon, color, desc }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="bg-white rounded-2xl p-5 border border-nutri-gray-200 hover:border-nutri-primary hover:shadow-md transition-all text-left group"
            >
              <div
                className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-semibold text-nutri-gray-900 text-sm">{label}</p>
              <p className="text-xs text-nutri-gray-500 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-nutri-gray-900 mb-4">
          Actividad Reciente
        </h2>
        <div className="space-y-4">
          {actividad.map(({ text, time, color }, idx) => (
            <div key={idx} className="flex items-start space-x-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${color}`} />
              <div>
                <p className="text-sm text-nutri-gray-800">{text}</p>
                <p className="text-xs text-nutri-gray-500 mt-0.5">{time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

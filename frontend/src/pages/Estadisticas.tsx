const semana = [
  { day: 'Lun', kcal: 1800 },
  { day: 'Mar', kcal: 2100 },
  { day: 'Mie', kcal: 1650 },
  { day: 'Jue', kcal: 2300 },
  { day: 'Vie', kcal: 1950 },
  { day: 'Sab', kcal: 2400 },
  { day: 'Dom', kcal: 1840 },
];

const macros = [
  { label: 'Carbohidratos', pct: 55, color: 'bg-nutri-info', grams: '242 g' },
  { label: 'Grasas', pct: 30, color: 'bg-nutri-accent', grams: '66 g' },
  { label: 'Proteínas', pct: 15, color: 'bg-nutri-success', grams: '68 g' },
];

const nutrientes = [
  { label: 'Calcio', pct: 78, detalle: '936 mg / 1200 mg', color: 'bg-nutri-primary' },
  { label: 'Hierro', pct: 60, detalle: '10.8 mg / 18 mg', color: 'bg-nutri-secondary' },
  { label: 'Vitamina C', pct: 90, detalle: '81 mg / 90 mg', color: 'bg-nutri-success' },
  { label: 'Fibra', pct: 45, detalle: '11.3 g / 25 g', color: 'bg-nutri-accent' },
  { label: 'Sodio', pct: 110, detalle: '2640 mg / 2400 mg (exceso)', color: 'bg-nutri-secondary' },
];

const resumen = [
  { label: 'Promedio calórico diario', value: '2,006 kcal' },
  { label: 'Días sobre el objetivo', value: '2 de 7' },
  { label: 'Mejor día', value: 'Viernes' },
  { label: 'Riesgo cardiovascular estimado', value: 'Bajo' },
  { label: 'IMC actual', value: '23.4 (Normal)' },
];

const maxKcal = Math.max(...semana.map((d) => d.kcal));

export default function Estadisticas() {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-nutri-gray-900">Estadísticas</h1>
          <p className="text-nutri-gray-600 text-sm mt-1">Resumen de los últimos 7 días (datos demo)</p>
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
                <span className="w-4 h-px bg-nutri-gray-400 inline-block border-t border-dashed border-nutri-gray-400" />
                <span>Objetivo 2200</span>
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2" style={{ height: '140px' }}>
            {semana.map(({ day, kcal }) => (
              <div key={day} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      kcal > 2200 ? 'bg-nutri-secondary' : 'bg-nutri-primary'
                    }`}
                    style={{ height: `${(kcal / maxKcal) * 100}px` }}
                  />
                </div>
                <p className="text-xs font-medium text-nutri-gray-700 mt-2">{day}</p>
                <p className="text-xs text-nutri-gray-400">{kcal}</p>
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

        {/* Micronutrientes */}
        <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-nutri-gray-900 mb-5">
            Micronutrientes (promedio diario)
          </h2>
          <div className="space-y-5">
            {nutrientes.map(({ label, pct, detalle, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-nutri-gray-700">{label}</span>
                  <span
                    className={`font-medium ${
                      pct > 100 ? 'text-nutri-secondary' : 'text-nutri-gray-900'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="h-2 bg-nutri-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-nutri-gray-400 mt-1">{detalle}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-nutri-gray-400 mt-6 text-center">
            Datos de demostración. Próximamente: análisis basado en tu diario real.
          </p>
        </div>
      </div>
    </div>
  );
}

import {
  Heart, GraduationCap, Mail, Phone, Shield, Database,
  MessageSquare, BarChart3, FlaskConical, BookOpen,
} from 'lucide-react';

const caracteristicas = [
  { icon: MessageSquare, titulo: 'Chat con IA (RAG)',    desc: 'Respuestas basadas en guias OMS, INCAP y AHA usando Retrieval-Augmented Generation.' },
  { icon: Database,       titulo: '92,000+ Alimentos',   desc: 'Base de datos USDA FDC + INCAP con alimentos centroamericanos y hondurenos.' },
  { icon: BarChart3,      titulo: 'Estadisticas',        desc: 'Visualizacion de patrones alimentarios y seguimiento de progreso nutricional.' },
  { icon: Shield,         titulo: 'Evaluacion de Riesgo',desc: 'Calculo de riesgo cardiovascular y deteccion de condiciones de salud relevantes.' },
];

const terminos = [
  { sigla: 'IMC',    nombre: 'Indice de Masa Corporal',      def: 'Relacion entre el peso (kg) y el cuadrado de la estatura (m). Indicador de estado nutricional general.' },
  { sigla: 'GEB',    nombre: 'Gasto Energetico Basal',       def: 'Calorias que el cuerpo necesita en reposo absoluto para mantener funciones vitales.' },
  { sigla: 'GET',    nombre: 'Gasto Energetico Total',       def: 'GEB multiplicado por un factor de actividad fisica. Representa el requerimiento calorico diario real.' },
  { sigla: 'VCT',    nombre: 'Valor Calorico Total',         def: 'Total de calorias aportadas por la alimentacion diaria. Base para calcular porcentajes de macronutrientes.' },
  { sigla: 'HbA1c',  nombre: 'Hemoglobina Glicosilada',      def: 'Marcador de glucemia promedio de los ultimos 2-3 meses. Clave en el seguimiento de diabetes.' },
  { sigla: 'PREVENT',nombre: 'Predicting Risk of CVD EVENTs', def: 'Ecuacion de la American Heart Association (2023) para estimar el riesgo cardiovascular a 10 anos.' },
  { sigla: 'RAG',    nombre: 'Retrieval-Augmented Generation',def: 'Tecnica de IA que combina recuperacion de documentos con generacion de texto para respuestas fundamentadas.' },
  { sigla: 'DASH',   nombre: 'Dietary Approaches to Stop Hypertension', def: 'Patron alimentario clinicamente probado para reducir la presion arterial, rico en frutas, verduras y lacteos bajos en grasa.' },
  { sigla: 'OMS',    nombre: 'Organizacion Mundial de la Salud', def: 'Organismo de la ONU rector en politicas de salud global. Fuente de criterios de clasificacion del IMC para adultos.' },
  { sigla: 'INCAP',  nombre: 'Instituto de Nutricion de Centro America y Panama', def: 'Organismo regional que elabora la tabla de composicion de alimentos centroamericanos usada en esta plataforma.' },
  { sigla: 'AHA',    nombre: 'American Heart Association',   def: 'Asociacion que publica guias sobre prevencion cardiovascular y dieta DASH. Fuente de la ecuacion PREVENT.' },
];

const formulas = [
  {
    titulo: 'Indice de Masa Corporal (IMC)',
    formula: 'IMC = peso (kg) / [estatura (m)]²',
    fuente: 'OMS, 2000',
    filas: [
      { grupo: 'Adultos 18-59 años (OMS)', rangos: [
        { cat: 'Bajo peso',       rango: '< 18.5' },
        { cat: 'Normal',          rango: '18.5 — 24.9' },
        { cat: 'Sobrepeso',       rango: '25.0 — 29.9' },
        { cat: 'Obesidad Tipo I', rango: '30.0 — 34.9' },
        { cat: 'Obesidad Tipo II',rango: '35.0 — 39.9' },
        { cat: 'Obesidad Tipo III',rango: '>= 40.0' },
      ]},
      { grupo: 'Adultos mayores >= 60 años (OPS/SEGG)', rangos: [
        { cat: 'Bajo peso',  rango: '< 23.0' },
        { cat: 'Normal',     rango: '23.0 — 27.9' },
        { cat: 'Sobrepeso',  rango: '28.0 — 31.9' },
        { cat: 'Obesidad I', rango: '>= 32.0' },
      ]},
    ],
  },
  {
    titulo: 'Gasto Energetico Basal — Mifflin-St. Jeor (1990)',
    formula: null,
    fuente: 'Mifflin MD et al., J Am Diet Assoc, 1990',
    items: [
      'Hombres: GEB = (10 × peso kg) + (6.25 × altura cm) − (5 × edad) + 5',
      'Mujeres:  GEB = (10 × peso kg) + (6.25 × altura cm) − (5 × edad) − 161',
    ],
  },
  {
    titulo: 'Gasto Energetico Total (GET)',
    formula: 'GET = GEB × Factor de actividad fisica',
    fuente: null,
    items: [
      'Sedentario (sin ejercicio): × 1.20',
      'Ligero (1-3 dias/semana): × 1.375',
      'Moderado (3-5 dias/semana): × 1.55',
      'Intenso (6-7 dias/semana): × 1.725',
      'Muy intenso (2 veces/dia): × 1.90',
    ],
  },
  {
    titulo: 'Distribucion de Macronutrientes',
    formula: 'Sobre el GET diario',
    fuente: 'Referencia OMS / INCAP',
    items: [
      'Carbohidratos: 55 % del GET ÷ 4 kcal/g',
      'Proteinas:     15 % del GET ÷ 4 kcal/g',
      'Lipidos:       30 % del GET ÷ 9 kcal/g',
    ],
  },
];

export default function AcercaDe() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-nutri-gray-900 mb-1">Acerca de NutriColleague</h1>
        <p className="text-sm text-nutri-gray-500">Proyecto de tesis — Universidad Nacional Autonoma de Honduras</p>
      </div>

      {/* Descripcion */}
      <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-nutri-primary/10 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-nutri-primary" />
          </div>
          <h2 className="text-lg font-semibold text-nutri-gray-900">¿Que es NutriColleague?</h2>
        </div>
        <p className="text-sm text-nutri-gray-700 leading-relaxed mb-3">
          NutriColleague es una plataforma de orientacion nutricional y prevencion cardiovascular
          impulsada por inteligencia artificial, desarrollada como proyecto de tesis de grado.
        </p>
        <p className="text-sm text-nutri-gray-700 leading-relaxed">
          Utiliza tecnologia RAG (Retrieval-Augmented Generation) combinada con GPT-4 para
          proporcionar recomendaciones nutricionales personalizadas fundamentadas en 649 fragmentos
          de guias oficiales de la OMS, INCAP y la American Heart Association.
        </p>
      </div>

      {/* Caracteristicas tecnicas */}
      <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6">
        <h2 className="text-lg font-semibold text-nutri-gray-900 mb-4">Caracteristicas Tecnicas</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {caracteristicas.map(({ icon: Icon, titulo, desc }) => (
            <div key={titulo} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-nutri-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-nutri-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-nutri-gray-900">{titulo}</p>
                <p className="text-xs text-nutri-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulas y modelos */}
      <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-5">
          <FlaskConical className="w-5 h-5 text-nutri-primary" />
          <h2 className="text-lg font-semibold text-nutri-gray-900">Formulas y Modelos Implementados</h2>
        </div>
        <div className="space-y-6">
          {formulas.map((f) => (
            <div key={f.titulo} className="border border-nutri-gray-100 rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-1 mb-2">
                <p className="text-sm font-semibold text-nutri-gray-900">{f.titulo}</p>
                {f.fuente && (
                  <span className="text-xs text-nutri-gray-400 italic">{f.fuente}</span>
                )}
              </div>
              {f.formula && (
                <p className="text-xs font-mono bg-nutri-gray-50 border border-nutri-gray-100 rounded-lg px-3 py-2 mb-3 text-nutri-gray-800">
                  {f.formula}
                </p>
              )}
              {'items' in f && f.items && (
                <ul className="space-y-1">
                  {f.items.map((item) => (
                    <li key={item} className="text-xs text-nutri-gray-700 font-mono bg-nutri-gray-50 rounded px-3 py-1.5">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {'filas' in f && f.filas && (
                <div className="space-y-3">
                  {f.filas.map((g) => (
                    <div key={g.grupo}>
                      <p className="text-xs font-medium text-nutri-gray-600 mb-1">{g.grupo}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {g.rangos.map(({ cat, rango }) => (
                          <div key={cat} className="flex justify-between text-xs px-2 py-1 bg-nutri-gray-50 rounded">
                            <span className="text-nutri-gray-700">{cat}</span>
                            <span className="font-mono text-nutri-gray-500">{rango}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Glosario de terminos */}
      <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BookOpen className="w-5 h-5 text-nutri-primary" />
          <h2 className="text-lg font-semibold text-nutri-gray-900">Glosario de Terminos</h2>
        </div>
        <div className="space-y-2">
          {terminos.map(({ sigla, nombre, def }) => (
            <div key={sigla} className="border border-nutri-gray-100 rounded-lg p-3">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-bold font-mono text-nutri-primary bg-nutri-primary/10 px-1.5 py-0.5 rounded">
                  {sigla}
                </span>
                <span className="text-xs font-medium text-nutri-gray-800">{nombre}</span>
              </div>
              <p className="text-xs text-nutri-gray-500 leading-relaxed pl-1">{def}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Institucion y desarrolladora */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <GraduationCap className="w-5 h-5 text-nutri-primary" />
            <h2 className="text-base font-semibold text-nutri-gray-900">Institucion</h2>
          </div>
          <div className="space-y-1 text-sm text-nutri-gray-700">
            <p className="font-medium">Universidad Nacional Autonoma de Honduras</p>
            <p>Centro Universitario Regional del Centro (CURC)</p>
            <p>Comayagua, Honduras</p>
            <p className="text-nutri-gray-500 text-xs mt-2">Ano 2026</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6">
          <h2 className="text-base font-semibold text-nutri-gray-900 mb-4">Solutions 21</h2>
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-nutri-gray-900">Propietaria: Lizzy Pamela Mejia Mejia</p>
            <a
              href="mailto:bylizzymejia@gmail.com"
              className="flex items-center space-x-2 text-sm text-nutri-gray-600 hover:text-nutri-primary transition-colors"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>bylizzymejia@gmail.com</span>
            </a>
            <a
              href="tel:+50488145882"
              className="flex items-center space-x-2 text-sm text-nutri-gray-600 hover:text-nutri-primary transition-colors"
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span>+504 8814-5882</span>
            </a>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">Proposito Academico</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Esta plataforma no sustituye la consulta con profesionales
              de la salud y la nutricion. Las formulas y calculos mostrados son referencias clinicas
              validadas pero deben interpretarse junto a evaluacion profesional. Siempre consulta
              con tu medico antes de realizar cambios importantes en tu alimentacion o estilo de vida.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

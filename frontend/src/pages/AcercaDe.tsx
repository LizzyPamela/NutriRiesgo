import { Heart, GraduationCap, Mail, Phone, Shield, Database, MessageSquare, BarChart3 } from 'lucide-react';

const caracteristicas = [
  { icon: MessageSquare, titulo: 'Chat con IA (RAG)',       desc: 'Respuestas basadas en guías OMS, INCAP y AHA usando Retrieval-Augmented Generation.' },
  { icon: Database,       titulo: '92,000+ Alimentos',       desc: 'Base de datos USDA + INCAP con alimentos centroamericanos y hondureños.' },
  { icon: BarChart3,      titulo: 'Estadísticas',            desc: 'Visualización de patrones alimentarios y seguimiento de progreso nutricional.' },
  { icon: Shield,         titulo: 'Evaluación de Riesgo',    desc: 'Cálculo de riesgo cardiovascular y detección de condiciones de salud relevantes.' },
];

export default function AcercaDe() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-nutri-gray-900 mb-1">Acerca de NutriRiesgo-UNAH</h1>
        <p className="text-sm text-nutri-gray-500">Proyecto de tesis — Universidad Nacional Autónoma de Honduras</p>
      </div>

      {/* Descripción */}
      <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-nutri-primary/10 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-nutri-primary" />
          </div>
          <h2 className="text-lg font-semibold text-nutri-gray-900">¿Qué es NutriRiesgo?</h2>
        </div>
        <p className="text-sm text-nutri-gray-700 leading-relaxed mb-3">
          NutriRiesgo-UNAH es una plataforma de orientación nutricional y prevención cardiovascular
          impulsada por inteligencia artificial, desarrollada como proyecto de tesis de grado.
        </p>
        <p className="text-sm text-nutri-gray-700 leading-relaxed">
          Utiliza tecnología RAG (Retrieval-Augmented Generation) combinada con GPT-4 para
          proporcionar recomendaciones nutricionales personalizadas fundamentadas en 649 fragmentos
          de guías oficiales de la OMS, INCAP y la American Heart Association.
        </p>
      </div>

      {/* Características */}
      <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6">
        <h2 className="text-lg font-semibold text-nutri-gray-900 mb-4">Características Técnicas</h2>
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

      {/* Información del proyecto y desarrolladora */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <GraduationCap className="w-5 h-5 text-nutri-primary" />
            <h2 className="text-base font-semibold text-nutri-gray-900">Institución</h2>
          </div>
          <div className="space-y-1 text-sm text-nutri-gray-700">
            <p className="font-medium">Universidad Nacional Autónoma de Honduras</p>
            <p>Centro Universitario Regional del Centro (CURC)</p>
            <p>Comayagua, Honduras</p>
            <p className="text-nutri-gray-500 text-xs mt-2">Año 2026</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-nutri-gray-200 p-6">
          <h2 className="text-base font-semibold text-nutri-gray-900 mb-4">Desarrolladora</h2>
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-nutri-gray-900">Lizzy Pamela Mejía Mejía</p>
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
            <p className="text-sm font-semibold text-amber-800 mb-1">Propósito Académico</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Esta plataforma fue desarrollada exclusivamente con fines de investigación académica
              y está dirigida a estudiantes de la UNAH. No sustituye la consulta con profesionales
              de la salud y la nutrición. Siempre consulta con tu médico antes de realizar cambios
              importantes en tu alimentación o estilo de vida.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Heart, ArrowRight, MessageSquare, BarChart3, Calendar, User, Mail, Phone, GraduationCap } from 'lucide-react';

const Landing = () => {
  const handleNavigation = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-nutri-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavigation('/')}>
              <Heart className="w-8 h-8 text-nutri-secondary fill-nutri-secondary" />
              <span className="text-2xl font-bold text-nutri-primary">NutriColleague</span>
            </div>
            <button
              onClick={() => handleNavigation('/login')}
              className="px-6 py-2 bg-nutri-primary text-white rounded-lg hover:bg-nutri-primary-dark transition-colors font-medium"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-nutri-gray-900 mb-6">
            Tu Asistente Inteligente de
            <span className="block text-nutri-primary mt-2">Nutrición y Salud</span>
          </h1>
          <p className="text-xl text-nutri-gray-600 mb-8 max-w-2xl mx-auto">
            Plataforma impulsada por IA para orientación nutricional y prevención cardiovascular
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleNavigation('/login')}
              className="inline-flex items-center justify-center px-8 py-4 bg-nutri-primary text-white rounded-xl hover:bg-nutri-primary-dark transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
            >
              Comenzar Gratis
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            <button
              onClick={() => handleNavigation('/chat')}
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-nutri-primary border-2 border-nutri-primary rounded-xl hover:bg-nutri-primary/5 transition-all font-semibold text-lg"
            >
              Probar Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-nutri-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-nutri-gray-900 mb-12">
            Características Principales
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-nutri-primary/10 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-nutri-primary" />
              </div>
              <h3 className="text-lg font-semibold text-nutri-gray-900 mb-2">
                Chat con IA
              </h3>
              <p className="text-nutri-gray-600 text-sm">
                Consultas nutricionales en tiempo real con respuestas basadas en evidencia científica
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-nutri-success/10 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-nutri-success" />
              </div>
              <h3 className="text-lg font-semibold text-nutri-gray-900 mb-2">
                Diario Alimentario
              </h3>
              <p className="text-nutri-gray-600 text-sm">
                Registra tus comidas diarias y obtén análisis nutricional automático
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-nutri-secondary/10 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-nutri-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-nutri-gray-900 mb-2">
                Estadísticas
              </h3>
              <p className="text-nutri-gray-600 text-sm">
                Visualiza tu progreso y patrones alimentarios con gráficos interactivos
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-nutri-info/10 rounded-xl flex items-center justify-center mb-4">
                <User className="w-7 h-7 text-nutri-info" />
              </div>
              <h3 className="text-lg font-semibold text-nutri-gray-900 mb-2">
                Perfil Personalizado
              </h3>
              <p className="text-nutri-gray-600 text-sm">
                Recomendaciones adaptadas a tu edad, peso, altura y objetivos de salud
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-nutri-primary mb-2">92,000+</div>
              <div className="text-nutri-gray-600">Alimentos en Base de Datos</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-nutri-success mb-2">649</div>
              <div className="text-nutri-gray-600">Guías de Nutrición</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-nutri-secondary mb-2">24/7</div>
              <div className="text-nutri-gray-600">Asistente Disponible</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-linear-to-r from-nutri-primary to-nutri-primary-dark">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            ¿Listo para comenzar tu transformación?
          </h2>
          <p className="text-white/90 text-lg mb-8">
            Únete a NutriColleague y toma control de tu salud nutricional
          </p>
          <button
            onClick={() => handleNavigation('/login')}
            className="inline-flex items-center px-8 py-4 bg-white text-nutri-primary rounded-xl hover:bg-nutri-gray-50 transition-colors font-semibold text-lg shadow-lg"
          >
            Registrarse Ahora
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid md:grid-cols-2 gap-15">

            {/* Columna 1 — Marca */}
            <div>
              <div className="flex items-center space-x-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10">
                  <Heart className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">NutriColleague</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Plataforma de orientación nutricional impulsada por IA para la prevención de riesgos cardiovasculares, desarrollada como parte de un proyecto académico en la Universidad Nacional Autónoma de Honduras.s
              </p>
              <div className="flex items-start space-x-2 text-xs text-gray-500">
                <GraduationCap className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-500" />
                <span>Universidad Nacional Autónoma de Honduras · CURC Comayagua · 2026</span>
              </div>
            </div>

            {/* Columna 3 — Desarrolladora */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white">
                Solutions 21
              </h3> <br></br>
              <p className="text-white font-semibold text-sm mb-4">Lizzy Pamela Mejía Mejía</p>
              <div className="space-y-3">
                <a
                  href="mailto:bylizzymejia@gmail.com"
                  className="flex items-center space-x-3 text-sm text-gray-400 hover:text-white transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/6 group-hover:bg-white/10 transition-colors">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span>bylizzymejia@gmail.com</span>
                </a>
                <a
                  href="tel:+50488145882"
                  className="flex items-center space-x-3 text-sm text-gray-400 hover:text-white transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/6 group-hover:bg-white/10 transition-colors">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span>+504 8814-5882</span>
                </a>
              </div>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              © 2026 NutriColleague · Universidad Nacional Autónoma de Honduras UNAH
            </p>
            <p className="text-xs text-gray-600">IS-115 I PAC 2626</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
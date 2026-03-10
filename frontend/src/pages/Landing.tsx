import React from 'react';
import { Heart, CheckCircle, XCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-nutri-primary/5">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Logo y Título */}
            <div className="text-center md:text-left animate-[slideUp_0.4s_ease-out]">
              <div className="flex items-center justify-center md:justify-start mb-6">
                <div className="relative">
                  <Heart 
                    className="w-16 h-16 text-nutri-secondary fill-nutri-secondary"
                    strokeWidth={1.5}
                  />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-nutri-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">💪</span>
                  </div>
                </div>
                <h1 className="text-5xl md:text-6xl font-display font-bold text-nutri-primary ml-4">
                  Nutri-Riesgo
                </h1>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-nutri-gray-800 mb-4">
                Participa en el estudio Inteligencia Artificial:
              </h2>
              
              <p className="text-lg text-nutri-gray-700 mb-6 leading-relaxed">
                Herramienta para la <span className="font-semibold text-nutri-primary">Orientación Alimentaria Preventiva</span> y{' '}
                <span className="font-semibold text-nutri-secondary">Estimación No Diagnóstica del Riesgo Cardiometabólico</span>
              </p>

              <div className="bg-nutri-primary/10 border-l-4 border-nutri-primary p-4 rounded-r-lg mb-8">
                <p className="text-nutri-primary font-semibold text-lg">
                  ¿Qué harás?
                </p>
                <p className="text-nutri-gray-700 mt-2">
                  Utilizar la plataforma para registrar tus alimentos y aumentar la conciencia sobre tu consumo nutricional.
                </p>
              </div>

              <Link
                to="/chat"
                className="inline-flex items-center px-8 py-4 bg-nutri-primary text-white font-semibold rounded-xl hover:bg-nutri-primary-dark transition-all duration-300 shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-strong)] transform hover:scale-105"
              >
                Comenzar Ahora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>

            {/* Requisitos */}
            <div className="bg-white rounded-2xl shadow-[var(--shadow-strong)] p-8 animate-[fadeIn_0.3s_ease-in-out]">
              <h3 className="text-2xl font-bold text-nutri-gray-800 mb-6">
                Requisitos Mínimos:
              </h3>

              <div className="space-y-4">
                {/* Requisito Cumplido */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle className="w-6 h-6 text-nutri-success" />
                  </div>
                  <p className="text-nutri-gray-700">
                    Ser <span className="font-semibold">Estudiante de la UNAH</span> en el Campus Comayagua
                  </p>
                </div>

                {/* Requisito No Cumplido */}
                <div className="flex items-start space-x-3 opacity-60">
                  <div className="flex-shrink-0 mt-1">
                    <XCircle className="w-6 h-6 text-nutri-danger" />
                  </div>
                  <p className="text-nutri-gray-700 line-through">
                    Personas de 18 años o más
                  </p>
                </div>

                {/* Advertencia */}
                <div className="flex items-start space-x-3 bg-nutri-accent/10 p-4 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <AlertCircle className="w-6 h-6 text-nutri-accent" />
                  </div>
                  <p className="text-nutri-gray-700 text-sm">
                    Primer contacto de participación y consentimiento para la plataforma, asegurándose que los datos se utilicen únicamente con fines de investigación.
                  </p>
                </div>

                {/* Compromiso */}
                <div className="flex items-start space-x-3 bg-nutri-info/10 p-4 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <Clock className="w-6 h-6 text-nutri-info" />
                  </div>
                  <p className="text-nutri-gray-700 text-sm">
                    Compromiso de utilización de la plataforma por un período mínimo de <span className="font-semibold">7 días</span>.
                  </p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 p-6 bg-gradient-to-r from-nutri-primary to-nutri-primary-dark rounded-xl text-center">
                <p className="text-white font-bold text-xl mb-2">
                  ¿Te interesa participar?
                </p>
                <p className="text-white/90 text-sm mb-4">
                  Escribe al número:
                </p>
                <a 
                  href="tel:+50496813882"
                  className="inline-block px-6 py-3 bg-white text-nutri-primary font-bold rounded-lg hover:bg-nutri-gray-50 transition-colors"
                >
                  +504 9681-3882
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-nutri-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-nutri-secondary/5 rounded-full blur-3xl -z-10" />
      </section>

      {/* Características */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-nutri-gray-800 mb-12">
            ¿Qué ofrece la plataforma?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Característica 1 */}
            <div className="bg-gradient-to-br from-nutri-primary/10 to-nutri-primary/5 rounded-xl p-6 hover:shadow-[var(--shadow-medium)] transition-shadow">
              <div className="w-12 h-12 bg-nutri-primary rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold text-nutri-gray-800 mb-2">
                Chat con IA
              </h3>
              <p className="text-nutri-gray-600">
                Consulta sobre nutrición con respuestas basadas en guías de OMS, INCAP y autoridades hondureñas.
              </p>
            </div>

            {/* Característica 2 */}
            <div className="bg-gradient-to-br from-nutri-success/10 to-nutri-success/5 rounded-xl p-6 hover:shadow-[var(--shadow-medium)] transition-shadow">
              <div className="w-12 h-12 bg-nutri-success rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🥗</span>
              </div>
              <h3 className="text-xl font-semibold text-nutri-gray-800 mb-2">
                Base de Alimentos
              </h3>
              <p className="text-nutri-gray-600">
                Accede a más de 92,000 alimentos con información nutricional completa, incluyendo alimentos hondureños.
              </p>
            </div>

            {/* Característica 3 */}
            <div className="bg-gradient-to-br from-nutri-secondary/10 to-nutri-secondary/5 rounded-xl p-6 hover:shadow-[var(--shadow-medium)] transition-shadow">
              <div className="w-12 h-12 bg-nutri-secondary rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">❤️</span>
              </div>
              <h3 className="text-xl font-semibold text-nutri-gray-800 mb-2">
                Evaluación de Riesgo
              </h3>
              <p className="text-nutri-gray-600">
                Estimación no diagnóstica del riesgo cardiometabólico basado en tus datos personales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-nutri-primary-dark text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm opacity-90">
            DATOS SOLO PARA FINES DE INVESTIGACIÓN
          </p>
          <p className="text-xs opacity-75 mt-2">
            NutriRiesgo-UNAH © 2026 - Universidad Nacional Autónoma de Honduras
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
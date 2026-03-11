import { CheckCircle, Mail, Calendar, MessageSquare, BarChart3, Lightbulb, FlaskConical, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const funciones = [
  { icon: Calendar,      texto: 'Registrar comidas y obtener análisis nutricional automático' },
  { icon: MessageSquare, texto: 'Consultar con IA sobre alimentación saludable' },
  { icon: BarChart3,     texto: 'Visualizar estadísticas de tu progreso' },
  { icon: Lightbulb,     texto: 'Recibir recomendaciones personalizadas según tu perfil' },
  { icon: FlaskConical,  texto: 'Registrar y hacer seguimiento a exámenes de laboratorio' },
];

export default function RegistroExitoso() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-nutri-primary/5 via-white to-nutri-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Icono principal */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-nutri-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-9 h-9 text-nutri-success" />
            </div>
            <h1 className="text-2xl font-bold text-nutri-gray-900 mb-1">
              ¡Cuenta creada exitosamente!
            </h1>
            <p className="text-nutri-gray-600 text-sm">
              Bienvenido/a a NutriRiesgo-UNAH
            </p>
          </div>

          {/* Aviso de confirmación */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3 mb-6">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Confirma tu correo institucional</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Revisa tu bandeja de entrada y haz clic en el enlace de confirmación
                para activar tu cuenta. Si no lo ves, revisa la carpeta de spam.
              </p>
            </div>
          </div>

          {/* Qué puedes hacer */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-nutri-gray-700 mb-3">
              Una vez actives tu cuenta podrás:
            </h2>
            <ul className="space-y-2">
              {funciones.map(({ icon: Icon, texto }) => (
                <li key={texto} className="flex items-start space-x-2.5 text-sm text-nutri-gray-600">
                  <Icon className="w-4 h-4 text-nutri-primary mt-0.5 shrink-0" />
                  <span>{texto}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
            <p className="text-xs text-amber-700">
              Esta plataforma es una herramienta educativa y no sustituye la consulta
              con un profesional de la salud o la nutrición.
            </p>
          </div>

          {/* Contacto */}
          <div className="border-t border-nutri-gray-200 pt-4 mb-5">
            <p className="text-xs text-nutri-gray-500 text-center">
              ¿Necesitas ayuda? Contacta a la desarrolladora:<br />
              <span className="font-medium text-nutri-gray-700">Lizzy Pamela Mejía Mejía</span>{' '}
              &middot;{' '}
              <a href="mailto:bylizzymejia@gmail.com" className="text-nutri-primary hover:underline">
                bylizzymejia@gmail.com
              </a>
            </p>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center space-x-2 bg-nutri-primary text-white py-3 rounded-xl font-semibold hover:bg-nutri-primary-dark transition-colors"
          >
            <span>Ir a Iniciar Sesión</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <p className="text-center text-xs text-nutri-gray-400 mt-4">
          NutriRiesgo-UNAH &middot; Universidad Nacional Autónoma de Honduras &middot; Comayagua
        </p>
      </div>
    </div>
  );
}

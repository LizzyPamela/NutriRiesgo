import React, { useState } from 'react';
import { Heart, Mail, Lock, User, ArrowRight } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Guardar usuario en localStorage
    localStorage.setItem('user', JSON.stringify({ email, nombre: nombre || email.split('@')[0] }));
    // Redirigir al dashboard
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-nutri-primary/5 via-white to-nutri-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <button onClick={() => window.location.href = '/'} className="inline-flex items-center space-x-3">
            <Heart className="w-12 h-12 text-nutri-secondary fill-nutri-secondary" />
            <span className="text-3xl font-bold text-nutri-primary">NutriRiesgo</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Tabs */}
          <div className="flex mb-8 bg-nutri-gray-100 rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                isLogin
                  ? 'bg-white text-nutri-primary shadow-sm'
                  : 'text-nutri-gray-600 hover:text-nutri-gray-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                !isLogin
                  ? 'bg-white text-nutri-primary shadow-sm'
                  : 'text-nutri-gray-600 hover:text-nutri-gray-900'
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-2">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nutri-gray-400" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required={!isLogin}
                    placeholder="Tu nombre completo"
                    className="w-full pl-10 pr-4 py-3 border border-nutri-gray-300 rounded-lg focus:ring-2 focus:ring-nutri-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-nutri-gray-700 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nutri-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-nutri-gray-300 rounded-lg focus:ring-2 focus:ring-nutri-primary focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-nutri-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nutri-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-nutri-gray-300 rounded-lg focus:ring-2 focus:ring-nutri-primary focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="w-4 h-4 text-nutri-primary border-nutri-gray-300 rounded focus:ring-nutri-primary" />
                  <span className="ml-2 text-nutri-gray-600">Recordarme</span>
                </label>
                <a href="#" className="text-nutri-primary hover:text-nutri-primary-dark font-medium">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-nutri-primary text-white py-3 rounded-lg hover:bg-nutri-primary-dark transition-colors font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <span>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 text-center">
            <p className="text-sm text-nutri-gray-600">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-nutri-primary font-semibold hover:text-nutri-primary-dark"
              >
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-nutri-gray-500 mt-6">
          Solo para estudiantes UNAH Comayagua • Fines de investigación
        </p>
      </div>
    </div>
  );
};

export default Login;
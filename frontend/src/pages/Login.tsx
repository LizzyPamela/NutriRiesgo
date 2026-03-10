import React, { useState } from 'react';
import { Heart, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nombre } },
        });
        if (error) throw error;
        setConfirmado(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de autenticación';
      if (msg.includes('Invalid login credentials')) setError('Correo o contraseña incorrectos.');
      else if (msg.includes('User already registered')) setError('Ya existe una cuenta con este correo. Inicia sesión.');
      else if (msg.includes('Password should be at least')) setError('La contraseña debe tener al menos 6 caracteres.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (confirmado) {
    return (
      <div className="min-h-screen bg-linear-to-br from-nutri-primary/5 via-white to-nutri-secondary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-white rounded-2xl shadow-xl p-8">
          <div className="w-16 h-16 bg-nutri-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-nutri-success" />
          </div>
          <h2 className="text-2xl font-bold text-nutri-gray-900 mb-2">Cuenta creada</h2>
          <p className="text-nutri-gray-600 mb-6">
            Revisa tu correo <strong>{email}</strong> para confirmar tu cuenta, luego inicia sesión.
          </p>
          <button
            type="button"
            onClick={() => { setConfirmado(false); setIsLogin(true); }}
            className="px-6 py-3 bg-nutri-primary text-white rounded-lg font-medium hover:bg-nutri-primary-dark transition-colors"
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-nutri-primary/5 via-white to-nutri-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <button type="button" onClick={() => navigate('/')} className="inline-flex items-center space-x-3">
            <Heart className="w-12 h-12 text-nutri-secondary fill-nutri-secondary" />
            <span className="text-3xl font-bold text-nutri-primary">NutriRiesgo</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Tabs */}
          <div className="flex mb-6 bg-nutri-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                isLogin ? 'bg-white text-nutri-primary shadow-sm' : 'text-nutri-gray-600 hover:text-nutri-gray-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                !isLogin ? 'bg-white text-nutri-primary shadow-sm' : 'text-nutri-gray-600 hover:text-nutri-gray-900'
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-2">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nutri-gray-400" />
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
              <label className="block text-sm font-medium text-nutri-gray-700 mb-2">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nutri-gray-400" />
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
              <label className="block text-sm font-medium text-nutri-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nutri-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-nutri-gray-300 rounded-lg focus:ring-2 focus:ring-nutri-primary focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-nutri-primary text-white py-3 rounded-lg hover:bg-nutri-primary-dark transition-colors font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-nutri-gray-600">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-nutri-primary font-semibold hover:text-nutri-primary-dark"
              >
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-nutri-gray-500 mt-6">
          Solo para estudiantes UNAH Comayagua &middot; Fines de investigación
        </p>
      </div>
    </div>
  );
};

export default Login;

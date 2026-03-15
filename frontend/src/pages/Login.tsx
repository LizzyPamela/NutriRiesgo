import React, { useState } from 'react';
import {
  Heart, Mail, Lock, User, ArrowRight, ArrowLeft,
  AlertCircle, Scale, Ruler, Activity,
  Moon, Sun, Flame, Zap, type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { crearOActualizarPerfil } from '../services/api';

const ACTIVIDAD_MAP: Record<string, string> = {
  sedentario: 'sedentario',
  ligero: 'ligero',
  moderado: 'moderado',
  activo: 'intenso',
  muy_activo: 'intenso',
};

const DOMINIOS_UNAH = ['@unah.hn', '@unah.edu.hn'];
const esEmailInstitucional = (email: string) =>
  DOMINIOS_UNAH.some(d => email.toLowerCase().endsWith(d));

// ── Registration data shape ──────────────────────────────────────────────────
interface RegData {
  nombre: string;
  email: string;
  password: string;
  edad: string;
  sexo: 'M' | 'F' | '';
  peso_kg: string;
  altura_cm: string;
  perimetro_cintura_cm: string;
  nivel_actividad: string;
  tiene_diabetes: boolean;
  tiene_hipertension: boolean;
  tiene_dislipidemia: boolean;
  antecedentes_cardiovasculares: boolean;
  situacion_academica: string;
  tipo_vivienda: string;
}

const defaultReg: RegData = {
  nombre: '', email: '', password: '',
  edad: '', sexo: '', peso_kg: '', altura_cm: '', perimetro_cintura_cm: '',
  nivel_actividad: 'moderado',
  tiene_diabetes: false, tiene_hipertension: false,
  tiene_dislipidemia: false, antecedentes_cardiovasculares: false,
  situacion_academica: '',
  tipo_vivienda: '',
};

const nivelesActividad: { value: string; label: string; desc: string; icon: LucideIcon }[] = [
  { value: 'sedentario', label: 'Sedentario', desc: 'Sin ejercicio regular',    icon: Moon },
  { value: 'ligero',     label: 'Ligero',     desc: '1-3 días/semana',          icon: Sun },
  { value: 'moderado',  label: 'Moderado',   desc: '3-5 días/semana',          icon: Activity },
  { value: 'activo',    label: 'Activo',     desc: '6-7 días/semana',          icon: Flame },
  { value: 'muy_activo',label: 'Muy activo', desc: 'Ejercicio intenso diario', icon: Zap },
];

const situacionesAcademicas = [
  { value: 'estudiando',          label: 'Estudiando',             desc: 'Solo clases presenciales o virtuales' },
  { value: 'vacaciones',          label: 'De vacaciones',          desc: 'Período vacacional universitario' },
  { value: 'trabaja',             label: 'Trabaja y estudia',      desc: 'Empleo formal o informal además de estudiar' },
  { value: 'practica_profesional',label: 'Práctica profesional',   desc: 'Práctica o pasantía como parte de la carrera' },
];

const tiposVivienda = [
  { value: 'familia_nucleo',    label: 'Familia nuclear',       desc: 'Con padres y/o hermanos' },
  { value: 'alquila',           label: 'Alquiler propio',       desc: 'Solo o con compañeros de cuarto' },
  { value: 'familia_extensa',   label: 'Familia extensa',       desc: 'Con tíos, abuelos, primos, cuñados u otro familiar' },
];

const condicionesSalud = [
  { key: 'tiene_diabetes'                  as keyof RegData, label: 'Diabetes Mellitus Tipo 2' },
  { key: 'tiene_hipertension'              as keyof RegData, label: 'Hipertensión Arterial' },
  { key: 'tiene_dislipidemia'              as keyof RegData, label: 'Dislipidemia (colesterol elevado)' },
  { key: 'antecedentes_cardiovasculares'   as keyof RegData, label: 'Antecedentes cardiovasculares' },
];

function calcIMC(peso: string, altura: string): number | null {
  const p = parseFloat(peso);
  const a = parseFloat(altura);
  if (!p || !a || a <= 0) return null;
  return p / Math.pow(a / 100, 2);
}

function imcLabel(imc: number): { texto: string; color: string } {
  if (imc < 18.5) return { texto: 'Bajo peso', color: 'text-blue-500' };
  if (imc < 25)   return { texto: 'Normal',    color: 'text-green-600' };
  if (imc < 30)   return { texto: 'Sobrepeso', color: 'text-amber-500' };
  return              { texto: 'Obesidad',  color: 'text-red-500' };
}

// ── Step progress indicator ──────────────────────────────────────────────────
function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center space-x-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 === step
              ? 'w-6 bg-nutri-primary'
              : i + 1 < step
              ? 'w-2 bg-nutri-primary/50'
              : 'w-2 bg-nutri-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// ── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label ?? (value ? 'Activado' : 'Desactivado')}
      aria-pressed={value ? 'true' : 'false'}
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-nutri-primary' : 'bg-nutri-gray-300'}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration data
  const [reg, setReg] = useState<RegData>({ ...defaultReg });
  const updateReg = <K extends keyof RegData>(k: K, v: RegData[K]) =>
    setReg((prev) => ({ ...prev, [k]: v }));

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ── Login submit ────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de autenticación';
      if (msg.includes('Invalid login credentials')) setError('Correo o contraseña incorrectos.');
      else if (msg.includes('Email not confirmed')) setError('Confirma tu correo antes de iniciar sesión.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step validation ─────────────────────────────────────────────────────
  const validateStep = (): string => {
    if (step === 1) {
      if (!reg.nombre.trim()) return 'Ingresa tu nombre.';
      if (!reg.email.includes('@')) return 'Correo electrónico inválido.';
      if (!esEmailInstitucional(reg.email)) return 'Debes usar tu correo institucional (@unah.hn o @unah.edu.hn).';
      if (reg.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (step === 2) {
      const edad = parseInt(reg.edad);
      if (!reg.edad || edad < 18 || edad > 100) return 'Edad debe estar entre 18 y 100 años.';
      if (!reg.sexo) return 'Selecciona tu sexo biológico.';
      const peso = parseFloat(reg.peso_kg);
      if (!reg.peso_kg || peso < 30 || peso > 200) return 'Peso debe estar entre 30 y 200 kg.';
      const altura = parseFloat(reg.altura_cm);
      if (!reg.altura_cm || altura < 100 || altura > 250) return 'Altura debe estar entre 100 y 250 cm.';
      const cintura = parseFloat(reg.perimetro_cintura_cm);
      if (!reg.perimetro_cintura_cm || cintura < 40 || cintura > 200) return 'Perímetro de cintura debe estar entre 40 y 200 cm.';
    }
    if (step === 5) {
      if (!reg.situacion_academica) return 'Selecciona tu situación académica actual.';
      if (!reg.tipo_vivienda) return 'Selecciona tu tipo de vivienda actual.';
    }
    return '';
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  };

  // ── Registration submit (step 5) ────────────────────────────────────────
  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: reg.email,
        password: reg.password,
        options: {
          data: {
            nombre: reg.nombre,
            edad: reg.edad,
            sexo: reg.sexo,
            peso_kg: reg.peso_kg,
            altura_cm: reg.altura_cm,
            perimetro_cintura_cm: reg.perimetro_cintura_cm,
            nivel_actividad: reg.nivel_actividad,
            tiene_diabetes: reg.tiene_diabetes,
            tiene_hipertension: reg.tiene_hipertension,
            tiene_dislipidemia: reg.tiene_dislipidemia,
            antecedentes_cardiovasculares: reg.antecedentes_cardiovasculares,
            situacion_academica: reg.situacion_academica,
            tipo_vivienda: reg.tipo_vivienda,
          },
        },
      });
      if (error) throw error;

      // Guardar perfil en perfiles_usuarios directamente via Supabase
      // (cubre el caso donde el trigger de BD falla o email confirmation está desactivada)
      if (data.user) {
        await supabase.from('perfiles_usuarios').upsert({
          user_id: data.user.id,
          email: reg.email,
          edad: parseInt(reg.edad) || null,
          sexo: reg.sexo || null,
          peso_kg: parseFloat(reg.peso_kg) || null,
          altura_cm: parseFloat(reg.altura_cm) || null,
          perimetro_cintura_cm: parseFloat(reg.perimetro_cintura_cm) || null,
          actividad_fisica: ACTIVIDAD_MAP[reg.nivel_actividad] ?? 'moderado',
          antecedentes_familiares: {
            diabetes: reg.tiene_diabetes,
            hipertension: reg.tiene_hipertension,
            cardiopatia: reg.antecedentes_cardiovasculares,
            obesidad: false,
          },
        }, { onConflict: 'user_id' });
      }

      navigate('/registro-exitoso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrarse';
      if (msg.includes('User already registered')) setError('Ya existe una cuenta con este correo.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setStep(1);
    setReg({ ...defaultReg });
    setError('');
  };

  const switchToRegister = () => {
    setIsLogin(false);
    setStep(1);
    setError('');
  };

  const imc = calcIMC(reg.peso_kg, reg.altura_cm);

  return (
    <div className="min-h-screen bg-linear-to-br from-nutri-primary/5 via-white to-nutri-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <button type="button" onClick={() => navigate('/')} className="inline-flex items-center space-x-3">
            <Heart className="w-12 h-12 text-nutri-secondary fill-nutri-secondary" />
            <span className="text-3xl font-bold text-nutri-primary">NutriColleague</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Tabs */}
          <div className="flex mb-6 bg-nutri-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={switchToLogin}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                isLogin ? 'bg-white text-nutri-primary shadow-sm' : 'text-nutri-gray-600 hover:text-nutri-gray-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={switchToRegister}
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

          {/* ── LOGIN ─────────────────────────────────────────────────────── */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-2">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nutri-gray-400" />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required placeholder="tu@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-nutri-gray-300 rounded-lg focus:ring-2 focus:ring-nutri-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-2">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-nutri-gray-400" />
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    required minLength={6} placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 border border-nutri-gray-300 rounded-lg focus:ring-2 focus:ring-nutri-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-nutri-primary text-white py-3 rounded-lg hover:bg-nutri-primary-dark transition-colors font-semibold flex items-center justify-center space-x-2 shadow-lg disabled:opacity-60"
              >
                {loading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><span>Iniciar Sesión</span><ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>

          ) : (
            /* ── REGISTRATION STEPS ──────────────────────────────────────── */
            <div>
              <StepProgress step={step} total={5} />

              {/* STEP 1 — Cuenta */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-nutri-gray-600 mb-4">Paso 1 de 5 — Datos de cuenta</p>
                  <div>
                    <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">Nombre Completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nutri-gray-400" />
                      <input
                        type="text" value={reg.nombre} onChange={(e) => updateReg('nombre', e.target.value)}
                        placeholder="Tu nombre completo"
                        className="w-full pl-9 pr-4 py-2.5 border border-nutri-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">Correo Institucional UNAH</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nutri-gray-400" />
                      <input
                        type="email" value={reg.email} onChange={(e) => updateReg('email', e.target.value)}
                        placeholder="tu.nombre@unah.hn"
                        className="w-full pl-9 pr-4 py-2.5 border border-nutri-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:border-transparent outline-none"
                      />
                    </div>
                    {reg.email.includes('@') && !esEmailInstitucional(reg.email) && (
                      <p className="text-xs text-red-500 mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>Usa tu correo @unah.hn o @unah.edu.hn</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nutri-gray-400" />
                      <input
                        type="password" value={reg.password} onChange={(e) => updateReg('password', e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full pl-9 pr-4 py-2.5 border border-nutri-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="button" onClick={handleNext}
                    className="w-full bg-nutri-primary text-white py-3 rounded-lg font-semibold hover:bg-nutri-primary-dark transition-colors flex items-center justify-center space-x-2 mt-2"
                  >
                    <span>Siguiente</span><ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* STEP 2 — Medidas */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-nutri-gray-600 mb-4">Paso 2 de 5 — Datos físicos</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">Edad (años)</label>
                      <input
                        type="number" value={reg.edad} onChange={(e) => updateReg('edad', e.target.value)}
                        min="18" max="100" placeholder="ej: 25"
                        className="w-full px-3 py-2.5 border border-nutri-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">Sexo biológico</label>
                      <div className="flex space-x-2">
                        {(['M', 'F'] as const).map((v) => (
                          <button
                            key={v} type="button" onClick={() => updateReg('sexo', v)}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                              reg.sexo === v
                                ? 'bg-nutri-primary text-white border-nutri-primary'
                                : 'border-nutri-gray-300 text-nutri-gray-700 hover:border-nutri-gray-400'
                            }`}
                          >
                            {v === 'M' ? 'Masculino' : 'Femenino'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
                        <Scale className="inline w-3.5 h-3.5 mr-1" />Peso (kg)
                      </label>
                      <input
                        type="number" value={reg.peso_kg} onChange={(e) => updateReg('peso_kg', e.target.value)}
                        min="30" max="200" step="0.1" placeholder="ej: 70"
                        className="w-full px-3 py-2.5 border border-nutri-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
                        <Ruler className="inline w-3.5 h-3.5 mr-1" />Altura (cm)
                      </label>
                      <input
                        type="number" value={reg.altura_cm} onChange={(e) => updateReg('altura_cm', e.target.value)}
                        min="100" max="250" placeholder="ej: 165"
                        className="w-full px-3 py-2.5 border border-nutri-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">Perímetro de cintura (cm)</label>
                    <input
                      type="number" value={reg.perimetro_cintura_cm} onChange={(e) => updateReg('perimetro_cintura_cm', e.target.value)}
                      min="40" max="200" placeholder="ej: 80"
                      className="w-full px-3 py-2.5 border border-nutri-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
                    />
                    <p className="text-xs text-nutri-gray-500 mt-1">Necesario para evaluar adiposidad central</p>
                  </div>

                  {/* Live IMC */}
                  {imc !== null && (
                    <div className="flex items-center justify-between bg-nutri-gray-50 rounded-lg px-4 py-2.5 border border-nutri-gray-200">
                      <span className="text-sm text-nutri-gray-600">IMC calculado:</span>
                      <span className={`text-sm font-bold ${imcLabel(imc).color}`}>
                        {imc.toFixed(1)} — {imcLabel(imc).texto}
                      </span>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-1">
                    <button
                      type="button" onClick={() => { setError(''); setStep(1); }}
                      className="flex-1 py-2.5 border border-nutri-gray-300 text-nutri-gray-700 rounded-lg text-sm font-medium hover:bg-nutri-gray-50 flex items-center justify-center space-x-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" /><span>Anterior</span>
                    </button>
                    <button
                      type="button" onClick={handleNext}
                      className="flex-1 py-2.5 bg-nutri-primary text-white rounded-lg text-sm font-semibold hover:bg-nutri-primary-dark flex items-center justify-center space-x-1.5"
                    >
                      <span>Siguiente</span><ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — Actividad física */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-nutri-gray-600 mb-4">
                    <Activity className="inline w-4 h-4 mr-1.5" />Paso 3 de 5 — Actividad física
                  </p>
                  <div className="space-y-2">
                    {nivelesActividad.map(({ value, label, desc, icon: Icon }) => (
                      <button
                        key={value} type="button" onClick={() => updateReg('nivel_actividad', value)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl border text-left transition-all ${
                          reg.nivel_actividad === value
                            ? 'border-nutri-primary bg-nutri-primary/5 text-nutri-primary'
                            : 'border-nutri-gray-200 bg-white hover:border-nutri-gray-300 text-nutri-gray-700'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="text-xs text-nutri-gray-500">{desc}</p>
                        </div>
                        {reg.nivel_actividad === value && (
                          <div className="ml-auto w-4 h-4 rounded-full bg-nutri-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex space-x-3 pt-1">
                    <button
                      type="button" onClick={() => { setError(''); setStep(2); }}
                      className="flex-1 py-2.5 border border-nutri-gray-300 text-nutri-gray-700 rounded-lg text-sm font-medium hover:bg-nutri-gray-50 flex items-center justify-center space-x-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" /><span>Anterior</span>
                    </button>
                    <button
                      type="button" onClick={() => { setError(''); setStep(4); }}
                      className="flex-1 py-2.5 bg-nutri-primary text-white rounded-lg text-sm font-semibold hover:bg-nutri-primary-dark flex items-center justify-center space-x-1.5"
                    >
                      <span>Siguiente</span><ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 — Condiciones de salud */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="mb-1">
                    <p className="text-sm font-semibold text-nutri-gray-600">Paso 4 de 5 — Condiciones de salud</p>
                    <p className="text-xs text-nutri-gray-500 mt-0.5">Opcional. Permite personalizar tus recomendaciones.</p>
                  </div>
                  <div className="space-y-3">
                    {condicionesSalud.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between py-2.5 px-3 border border-nutri-gray-200 rounded-xl">
                        <label className="text-sm text-nutri-gray-700 cursor-pointer">{label}</label>
                        <Toggle
                          value={reg[key] as boolean}
                          onChange={(v) => setReg((prev) => ({ ...prev, [key]: v }))}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    Esta herramienta es educativa y no sustituye la consulta médica profesional.
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button" onClick={() => { setError(''); setStep(3); }}
                      className="flex-1 py-2.5 border border-nutri-gray-300 text-nutri-gray-700 rounded-lg text-sm font-medium hover:bg-nutri-gray-50 flex items-center justify-center space-x-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" /><span>Anterior</span>
                    </button>
                    <button
                      type="button" onClick={() => { setError(''); setStep(5); }}
                      className="flex-1 py-2.5 bg-nutri-primary text-white rounded-lg text-sm font-semibold hover:bg-nutri-primary-dark flex items-center justify-center space-x-1.5"
                    >
                      <span>Siguiente</span><ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5 — Contexto estudiantil */}
              {step === 5 && (
                <div className="space-y-4">
                  <div className="mb-1">
                    <p className="text-sm font-semibold text-nutri-gray-600">Paso 5 de 5 — Situación académica y vivienda</p>
                    <p className="text-xs text-nutri-gray-500 mt-0.5">Nos ayuda a entender mejor tu contexto de vida.</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-nutri-gray-700 mb-2">¿Cuál es tu situación académica actual?</p>
                    <div className="space-y-2">
                      {situacionesAcademicas.map(({ value, label, desc }) => (
                        <button
                          key={value} type="button" onClick={() => updateReg('situacion_academica', value)}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl border text-left transition-all ${
                            reg.situacion_academica === value
                              ? 'border-nutri-primary bg-nutri-primary/5 text-nutri-primary'
                              : 'border-nutri-gray-200 bg-white hover:border-nutri-gray-300 text-nutri-gray-700'
                          }`}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{label}</p>
                            <p className="text-xs text-nutri-gray-500">{desc}</p>
                          </div>
                          {reg.situacion_academica === value && (
                            <div className="w-4 h-4 rounded-full bg-nutri-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-nutri-gray-700 mb-2">¿Con quién vives actualmente?</p>
                    <div className="space-y-2">
                      {tiposVivienda.map(({ value, label, desc }) => (
                        <button
                          key={value} type="button" onClick={() => updateReg('tipo_vivienda', value)}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl border text-left transition-all ${
                            reg.tipo_vivienda === value
                              ? 'border-nutri-primary bg-nutri-primary/5 text-nutri-primary'
                              : 'border-nutri-gray-200 bg-white hover:border-nutri-gray-300 text-nutri-gray-700'
                          }`}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{label}</p>
                            <p className="text-xs text-nutri-gray-500">{desc}</p>
                          </div>
                          {reg.tipo_vivienda === value && (
                            <div className="w-4 h-4 rounded-full bg-nutri-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-1">
                    <button
                      type="button" onClick={() => { setError(''); setStep(4); }}
                      className="flex-1 py-2.5 border border-nutri-gray-300 text-nutri-gray-700 rounded-lg text-sm font-medium hover:bg-nutri-gray-50 flex items-center justify-center space-x-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" /><span>Anterior</span>
                    </button>
                    <button
                      type="button" onClick={handleRegister} disabled={loading}
                      className="flex-1 py-2.5 bg-nutri-primary text-white rounded-lg text-sm font-semibold hover:bg-nutri-primary-dark disabled:opacity-60 flex items-center justify-center space-x-1.5"
                    >
                      {loading
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><span>Crear Cuenta</span><ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-nutri-gray-600">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={isLogin ? switchToRegister : switchToLogin}
                className="text-nutri-primary font-semibold hover:text-nutri-primary-dark"
              >
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-nutri-gray-500 mt-6">
          NutriColleague © 2026 · Universidad Nacional Autónoma de Honduras UNAH
        </p>
      </div>
    </div>
  );
};

export default Login;

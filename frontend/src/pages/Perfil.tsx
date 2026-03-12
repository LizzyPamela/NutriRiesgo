import { useState, useEffect } from 'react';
import { Save, CheckCircle, Loader2, AlertCircle, Trash2, TriangleAlert, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { obtenerPerfil, crearOActualizarPerfil, eliminarCuenta } from '../services/api';

// Tipos alineados con el backend (perfil.py)
type Sexo = 'M' | 'F' | '';
type ActividadFisica = 'sedentario' | 'ligero' | 'moderado' | 'intenso' | 'muy_intenso';

interface AntecedentesFA {
  diabetes: boolean;
  hipertension: boolean;
  cardiopatia: boolean;
  obesidad: boolean;
}

interface PerfilForm {
  nombre: string;
  edad: string;
  sexo: Sexo;
  peso_kg: string;
  altura_cm: string;
  perimetro_cintura_cm: string;
  actividad_fisica: ActividadFisica;
  fumador: boolean;
  antecedentes_familiares: AntecedentesFA;
}

const nivelesActividad: { value: ActividadFisica; label: string }[] = [
  { value: 'sedentario', label: 'Sedentario (sin ejercicio)' },
  { value: 'ligero', label: 'Ligero (1-3 días/semana)' },
  { value: 'moderado', label: 'Moderado (3-5 días/semana)' },
  { value: 'intenso', label: 'Intenso (6-7 días/semana)' },
  { value: 'muy_intenso', label: 'Muy intenso (2 veces al día)' },
];

const antecedentesLabels: { key: keyof AntecedentesFA; label: string }[] = [
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'hipertension', label: 'Hipertensión' },
  { key: 'cardiopatia', label: 'Cardiopatía' },
  { key: 'obesidad', label: 'Obesidad' },
];

function calcularIMC(peso: string, altura: string): string | null {
  const p = parseFloat(peso);
  const a = parseFloat(altura);
  if (!p || !a || a <= 0) return null;
  return (p / Math.pow(a / 100, 2)).toFixed(1);
}

function categoriaIMC(imc: number, edad: number): { label: string; color: string } {
  if (edad >= 60) {
    // Criterios OPS/SEGG para adulto mayor
    if (imc < 23.0) return { label: 'Bajo peso', color: 'text-nutri-info' };
    if (imc < 28.0) return { label: 'Normal', color: 'text-nutri-success' };
    if (imc < 32.0) return { label: 'Sobrepeso', color: 'text-nutri-accent' };
    return { label: 'Obesidad Tipo I', color: 'text-nutri-secondary' };
  }
  // Criterios OMS para adulto (18-59 años)
  if (imc < 18.5) return { label: 'Bajo peso', color: 'text-nutri-info' };
  if (imc < 25.0) return { label: 'Normal', color: 'text-nutri-success' };
  if (imc < 30.0) return { label: 'Sobrepeso', color: 'text-nutri-accent' };
  if (imc < 35.0) return { label: 'Obesidad Tipo I', color: 'text-nutri-secondary' };
  if (imc < 40.0) return { label: 'Obesidad Tipo II', color: 'text-nutri-secondary' };
  return { label: 'Obesidad Tipo III', color: 'text-nutri-secondary' };
}

function calcularGastoEnergetico(
  peso: string,
  altura: string,
  edad: string,
  sexo: Sexo,
  actividad: ActividadFisica,
): { geb: number; get: number; macros: { carbs: number; proteinas: number; lipidos: number } } | null {
  const p = parseFloat(peso);
  const a = parseFloat(altura);
  const e = parseFloat(edad);
  if (!p || !a || !e || sexo === '') return null;

  const geb =
    sexo === 'M'
      ? 10 * p + 6.25 * a - 5 * e + 5
      : 10 * p + 6.25 * a - 5 * e - 161;

  const factores: Record<ActividadFisica, number> = {
    sedentario: 1.2,
    ligero: 1.375,
    moderado: 1.55,
    intenso: 1.725,
    muy_intenso: 1.9,
  };

  const get = geb * factores[actividad];
  return {
    geb: Math.round(geb * 10) / 10,
    get: Math.round(get * 10) / 10,
    macros: {
      carbs: Math.round(((get * 0.55) / 4) * 10) / 10,
      proteinas: Math.round(((get * 0.15) / 4) * 10) / 10,
      lipidos: Math.round(((get * 0.3) / 9) * 10) / 10,
    },
  };
}

const defaultForm: PerfilForm = {
  nombre: '',
  edad: '',
  sexo: '',
  peso_kg: '',
  altura_cm: '',
  perimetro_cintura_cm: '',
  actividad_fisica: 'moderado',
  fumador: false,
  antecedentes_familiares: {
    diabetes: false,
    hipertension: false,
    cardiopatia: false,
    obesidad: false,
  },
};

export default function Perfil() {
  const { userId, displayName, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<PerfilForm>({ ...defaultForm, nombre: displayName });
  const [guardado, setGuardado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [perfilBackend, setPerfilBackend] = useState<{
    imc?: number;
    categoria_riesgo?: string;
    riesgo_prevent?: number;
  } | null>(null);

  // Panel de informacion IMC
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // Eliminacion de cuenta
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Cargar perfil existente del backend
  useEffect(() => {
    if (!userId) return;
    obtenerPerfil(userId)
      .then((data) => {
        setPerfilBackend(data);
        setForm((prev) => ({
          ...prev,
          nombre: displayName,
          edad: data.edad ? String(data.edad) : prev.edad,
          sexo: data.sexo ?? prev.sexo,
          peso_kg: data.peso_kg ? String(data.peso_kg) : prev.peso_kg,
          altura_cm: data.altura_cm ? String(data.altura_cm) : prev.altura_cm,
          perimetro_cintura_cm: data.perimetro_cintura_cm
            ? String(data.perimetro_cintura_cm)
            : prev.perimetro_cintura_cm,
          actividad_fisica: data.actividad_fisica ?? prev.actividad_fisica,
          fumador: data.fumador ?? prev.fumador,
          antecedentes_familiares:
            data.antecedentes_familiares ?? prev.antecedentes_familiares,
        }));
      })
      .catch(() => {
        /* perfil aun no existe */
      })
      .finally(() => setLoading(false));
  }, [userId, displayName]);

  const imc = calcularIMC(form.peso_kg, form.altura_cm);
  const imcNum = imc ? parseFloat(imc) : null;
  const edadNum = form.edad ? parseInt(form.edad) : 30;
  const gastoEnergetico = calcularGastoEnergetico(
    form.peso_kg,
    form.altura_cm,
    form.edad,
    form.sexo,
    form.actividad_fisica,
  );

  const set = <K extends keyof PerfilForm>(field: K) =>
    (value: PerfilForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setGuardado(false);
    };

  const handleSave = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!userId) return;
    setError('');
    setSaving(true);
    try {
      const payload = {
        edad: form.edad ? parseInt(form.edad) : null,
        sexo: form.sexo || null,
        peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
        altura_cm: form.altura_cm ? parseFloat(form.altura_cm) : null,
        perimetro_cintura_cm: form.perimetro_cintura_cm
          ? parseFloat(form.perimetro_cintura_cm)
          : null,
        actividad_fisica: form.actividad_fisica,
        fumador: form.fumador,
        antecedentes_familiares: form.antecedentes_familiares,
      };
      const data = await crearOActualizarPerfil(userId, payload);
      setPerfilBackend(data);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch {
      setError('Error al guardar. Verifica tu conexión con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await eliminarCuenta(userId);
      await signOut();
      navigate('/login');
    } catch {
      setDeleteError('No se pudo eliminar la cuenta. Intentalo de nuevo.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-nutri-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-nutri-gray-900">Perfil</h1>
          <p className="text-nutri-gray-600 text-sm mt-1">
            {user?.email} &middot; Datos para recomendaciones personalizadas
          </p>
        </div>

        {/* IMC Card */}
        {imc && imcNum && (
          <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 mb-6 shadow-sm">
            {/* Header: IMC + riesgo backend + boton info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-nutri-gray-600">
                    &Iacute;ndice de Masa Corporal
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowInfoPanel((v) => !v)}
                    className="text-nutri-gray-400 hover:text-nutri-primary transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-3xl font-bold text-nutri-gray-900 mt-1">{imc}</p>
                <p className={`text-sm font-medium mt-0.5 ${categoriaIMC(imcNum, edadNum).color}`}>
                  {categoriaIMC(imcNum, edadNum).label}
                </p>
              </div>
              {perfilBackend && (
                <div className="text-right">
                  {perfilBackend.categoria_riesgo && (
                    <p className="text-xs text-nutri-gray-500">
                      Riesgo:{' '}
                      <span className="font-semibold text-nutri-gray-800">
                        {perfilBackend.categoria_riesgo}
                      </span>
                    </p>
                  )}
                  {perfilBackend.riesgo_prevent != null && (
                    <p className="text-xs text-nutri-gray-500 mt-0.5">
                      PREVENT:{' '}
                      <span className="font-semibold text-nutri-gray-800">
                        {(perfilBackend.riesgo_prevent * 100).toFixed(1)}%
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Panel explicativo */}
            {showInfoPanel && (
              <div className="mt-4 border border-nutri-gray-200 rounded-xl p-4 bg-nutri-gray-50 space-y-3">
                <p className="font-semibold text-sm text-nutri-gray-900">
                  &iquest;C&oacute;mo se calculan estos valores?
                </p>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-nutri-gray-800">IMC</p>
                  <p className="text-xs leading-relaxed text-nutri-gray-700">
                    El IMC (
                    &Iacute;ndice de Masa Corporal) se obtiene dividiendo tu peso en kg entre
                    tu estatura en metros al cuadrado. Es una medida de referencia general
                    &mdash; no distingue entre m&uacute;sculo y grasa, por lo que debe
                    interpretarse junto a otros indicadores como la circunferencia de cintura.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-nutri-gray-800">
                    Calor&iacute;as
                  </p>
                  <p className="text-xs leading-relaxed text-nutri-gray-700">
                    El requerimiento cal&oacute;rico se calcula con la f&oacute;rmula
                    Mifflin-St. Jeor (1990), que considera tu peso, estatura, edad y sexo
                    para estimar las calor&iacute;as que tu cuerpo necesita en reposo. A ese
                    valor se le aplica un factor seg&uacute;n tu nivel de actividad
                    f&iacute;sica para obtener tu requerimiento total diario.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-nutri-gray-800">Nota &eacute;tica</p>
                  <p className="text-xs leading-relaxed text-nutri-gray-700">
                    Esta plataforma muestra tu requerimiento de mantenimiento. No se calculan
                    d&eacute;ficits cal&oacute;ricos porque esa decisi&oacute;n requiere
                    supervisi&oacute;n profesional.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInfoPanel(false)}
                  className="text-xs text-nutri-primary font-medium hover:underline"
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* Gasto Energetico */}
            {gastoEnergetico && (
              <div className="border-t border-nutri-gray-100 mt-4 pt-4">
                <p className="text-sm text-nutri-gray-600">
                  Requerimiento energ&eacute;tico estimado
                </p>
                <div className="mt-1">
                  <span className="text-2xl font-bold text-nutri-gray-900">
                    {gastoEnergetico.get} kcal/d&iacute;a
                  </span>
                  <span className="text-xs text-nutri-gray-500 ml-2">
                    GEB: {gastoEnergetico.geb} kcal
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="rounded-full bg-nutri-gray-100 text-xs px-2 py-0.5 text-nutri-gray-700">
                    HC: {gastoEnergetico.macros.carbs}g
                  </span>
                  <span className="rounded-full bg-nutri-gray-100 text-xs px-2 py-0.5 text-nutri-gray-700">
                    Prot: {gastoEnergetico.macros.proteinas}g
                  </span>
                  <span className="rounded-full bg-nutri-gray-100 text-xs px-2 py-0.5 text-nutri-gray-700">
                    Grasas: {gastoEnergetico.macros.lipidos}g
                  </span>
                </div>
                <p className="text-xs text-nutri-gray-400 italic mt-2">
                  F&oacute;rmula Mifflin-St. Jeor &middot; Solo referencial &middot; Consulta
                  a un nutricionista para metas personalizadas
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl border border-nutri-gray-200 p-6 shadow-sm space-y-7"
        >
          {/* Datos personales */}
          <section>
            <h2 className="font-semibold text-nutri-gray-900 mb-4 pb-2 border-b border-nutri-gray-100">
              Datos Personales
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
                  Edad (años)
                </label>
                <input
                  type="number"
                  value={form.edad}
                  onChange={(e) => set('edad')(e.target.value)}
                  min="1"
                  max="120"
                  placeholder="ej: 22"
                  className="w-full px-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
                  Sexo biol&oacute;gico
                </label>
                <div className="flex space-x-3">
                  {(
                    [
                      ['M', 'Masculino'],
                      ['F', 'Femenino'],
                    ] as [Sexo, string][]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set('sexo')(v)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.sexo === v
                          ? 'bg-nutri-primary text-white border-nutri-primary'
                          : 'border-nutri-gray-200 text-nutri-gray-700 hover:border-nutri-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Medidas */}
          <section>
            <h2 className="font-semibold text-nutri-gray-900 mb-4 pb-2 border-b border-nutri-gray-100">
              Medidas Corporales
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  value={form.peso_kg}
                  onChange={(e) => set('peso_kg')(e.target.value)}
                  min="20"
                  max="300"
                  step="0.1"
                  placeholder="ej: 68.5"
                  className="w-full px-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  value={form.altura_cm}
                  onChange={(e) => set('altura_cm')(e.target.value)}
                  min="100"
                  max="250"
                  placeholder="ej: 165"
                  className="w-full px-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
                  Cintura (cm)
                </label>
                <input
                  type="number"
                  value={form.perimetro_cintura_cm}
                  onChange={(e) => set('perimetro_cintura_cm')(e.target.value)}
                  min="40"
                  max="200"
                  placeholder="ej: 82"
                  className="w-full px-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Estilo de vida */}
          <section>
            <h2 className="font-semibold text-nutri-gray-900 mb-4 pb-2 border-b border-nutri-gray-100">
              Estilo de Vida
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
                  Actividad F&iacute;sica
                </label>
                <select
                  value={form.actividad_fisica}
                  onChange={(e) =>
                    set('actividad_fisica')(e.target.value as ActividadFisica)
                  }
                  className="w-full px-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none bg-white"
                >
                  {nivelesActividad.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-nutri-gray-700">
                  Fumador/a
                </label>
                <button
                  type="button"
                  onClick={() => set('fumador')(!form.fumador)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    form.fumador ? 'bg-nutri-secondary' : 'bg-nutri-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form.fumador ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Antecedentes familiares */}
          <section>
            <h2 className="font-semibold text-nutri-gray-900 mb-4 pb-2 border-b border-nutri-gray-100">
              Antecedentes Familiares
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {antecedentesLabels.map(({ key, label }) => (
                <label key={key} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.antecedentes_familiares[key]}
                    onChange={(e) =>
                      set('antecedentes_familiares')({
                        ...form.antecedentes_familiares,
                        [key]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-nutri-primary border-nutri-gray-300 rounded focus:ring-nutri-primary"
                  />
                  <span className="text-sm text-nutri-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-nutri-primary text-white rounded-lg font-semibold hover:bg-nutri-primary-dark transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : guardado ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Guardado</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Guardar Perfil</span>
              </>
            )}
          </button>
        </form>

        {/* Zona de peligro */}
        <div className="mt-8 border border-red-200 rounded-2xl overflow-hidden">
          <div className="bg-red-50 px-6 py-4 flex items-center space-x-2">
            <TriangleAlert className="w-4 h-4 text-red-600 shrink-0" />
            <h2 className="text-sm font-semibold text-red-700">Zona de peligro</h2>
          </div>

          <div className="bg-white px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-nutri-gray-900">Eliminar cuenta</p>
                <p className="text-xs text-nutri-gray-500 mt-0.5">
                  Elimina permanentemente tu cuenta y todos tus datos. Esta
                  acci&oacute;n no se puede deshacer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setDeleteInput('');
                  setDeleteError('');
                }}
                className="shrink-0 flex items-center space-x-1.5 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar cuenta</span>
              </button>
            </div>

            {/* Modal de confirmacion inline */}
            {showDeleteConfirm && (
              <div className="mt-5 border border-red-200 rounded-xl p-5 bg-red-50 space-y-4">
                <p className="text-sm text-red-800 font-medium">
                  Esta acci&oacute;n eliminar&aacute; tu cuenta, perfil y diario
                  alimentario de forma permanente.
                </p>
                <p className="text-xs text-red-700">
                  Escribe{' '}
                  <span className="font-bold font-mono">ELIMINAR</span> para confirmar:
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="ELIMINAR"
                  className="w-full px-4 py-2.5 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:outline-none bg-white"
                />
                {deleteError && (
                  <div className="flex items-center space-x-2 text-red-700 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 py-2.5 border border-nutri-gray-200 text-nutri-gray-700 rounded-lg text-sm font-medium hover:bg-nutri-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== 'ELIMINAR' || deleting}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center space-x-2"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar mi cuenta</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

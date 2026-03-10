import { useState, FormEvent } from 'react';
import { Save, CheckCircle } from 'lucide-react';

type Sexo = 'M' | 'F' | '';
type NivelActividad = 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy_activo';
type Objetivo = 'mantener' | 'perder' | 'ganar';

interface PerfilForm {
  nombre: string;
  email: string;
  edad: string;
  sexo: Sexo;
  peso_kg: string;
  altura_cm: string;
  nivel_actividad: NivelActividad;
  objetivo: Objetivo;
}

const nivelesActividad: { value: NivelActividad; label: string }[] = [
  { value: 'sedentario', label: 'Sedentario (sin ejercicio)' },
  { value: 'ligero', label: 'Ligero (1-3 días/semana)' },
  { value: 'moderado', label: 'Moderado (3-5 días/semana)' },
  { value: 'activo', label: 'Activo (6-7 días/semana)' },
  { value: 'muy_activo', label: 'Muy activo (2 veces al día)' },
];

const objetivos: { value: Objetivo; label: string }[] = [
  { value: 'mantener', label: 'Mantener peso' },
  { value: 'perder', label: 'Perder peso' },
  { value: 'ganar', label: 'Ganar músculo' },
];

function calcularIMC(peso: string, altura: string): string | null {
  const p = parseFloat(peso);
  const a = parseFloat(altura);
  if (!p || !a || a <= 0) return null;
  return (p / Math.pow(a / 100, 2)).toFixed(1);
}

function categoriaIMC(imc: number): { label: string; color: string } {
  if (imc < 18.5) return { label: 'Bajo peso', color: 'text-nutri-info' };
  if (imc < 25) return { label: 'Normal', color: 'text-nutri-success' };
  if (imc < 30) return { label: 'Sobrepeso', color: 'text-nutri-accent' };
  return { label: 'Obesidad', color: 'text-nutri-secondary' };
}

export default function Perfil() {
  const user: { nombre?: string; email?: string } = JSON.parse(
    localStorage.getItem('user') || '{}'
  );
  const saved_perfil: Partial<PerfilForm> = JSON.parse(
    localStorage.getItem('perfil') || '{}'
  );

  const [form, setForm] = useState<PerfilForm>({
    nombre: user.nombre || '',
    email: user.email || '',
    edad: saved_perfil.edad || '',
    sexo: saved_perfil.sexo || '',
    peso_kg: saved_perfil.peso_kg || '',
    altura_cm: saved_perfil.altura_cm || '',
    nivel_actividad: saved_perfil.nivel_actividad || 'moderado',
    objetivo: saved_perfil.objetivo || 'mantener',
  });
  const [guardado, setGuardado] = useState(false);

  const imc = calcularIMC(form.peso_kg, form.altura_cm);
  const imcNum = imc ? parseFloat(imc) : null;

  const set = (field: keyof PerfilForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setGuardado(false);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem(
      'user',
      JSON.stringify({ nombre: form.nombre, email: form.email })
    );
    localStorage.setItem(
      'perfil',
      JSON.stringify({
        edad: form.edad,
        sexo: form.sexo,
        peso_kg: form.peso_kg,
        altura_cm: form.altura_cm,
        nivel_actividad: form.nivel_actividad,
        objetivo: form.objetivo,
      })
    );
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-nutri-gray-900">Perfil</h1>
          <p className="text-nutri-gray-600 text-sm mt-1">
            Tus datos para recomendaciones nutricionales personalizadas
          </p>
        </div>

        {/* IMC Card */}
        {imc && imcNum && (
          <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-nutri-gray-600">Índice de Masa Corporal</p>
                <p className="text-3xl font-bold text-nutri-gray-900 mt-1">{imc}</p>
                <p className={`text-sm font-medium mt-0.5 ${categoriaIMC(imcNum).color}`}>
                  {categoriaIMC(imcNum).label}
                </p>
              </div>
              <div className="text-right text-sm text-nutri-gray-400">
                <p>{form.peso_kg} kg</p>
                <p>{form.altura_cm} cm</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
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
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => set('nombre')(e.target.value)}
                  className="w-full px-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
                  Correo
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email')(e.target.value)}
                  className="w-full px-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
                />
              </div>
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
                  Sexo
                </label>
                <div className="flex space-x-3">
                  {(['M', 'F'] as const).map((v) => (
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
                      {v === 'M' ? 'Masculino' : 'Femenino'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Medidas */}
          <section>
            <h2 className="font-semibold text-nutri-gray-900 mb-4 pb-2 border-b border-nutri-gray-100">
              Medidas
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
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
                  Nivel de Actividad
                </label>
                <select
                  value={form.nivel_actividad}
                  onChange={(e) => set('nivel_actividad')(e.target.value)}
                  className="w-full px-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none bg-white"
                >
                  {nivelesActividad.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-nutri-gray-700 mb-1.5">
                  Objetivo
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {objetivos.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set('objetivo')(value)}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        form.objetivo === value
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

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-nutri-primary text-white rounded-lg font-semibold hover:bg-nutri-primary-dark transition-colors flex items-center justify-center space-x-2"
          >
            {guardado ? (
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
      </div>
    </div>
  );
}

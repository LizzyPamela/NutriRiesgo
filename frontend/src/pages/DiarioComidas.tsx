import { useState, useEffect, useRef } from 'react';
import { Plus, X, Search, Loader2, Coffee, Sun, Moon, Apple } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Alimento } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { buscarAlimentos, obtenerDiarioAlimentario, registrarComida, eliminarRegistroComida } from '../services/api';

// Backend usa "merienda" — UI lo muestra como "Snack"
type TiempoComida = 'desayuno' | 'almuerzo' | 'cena' | 'merienda';

interface AlimentoSeleccionado {
  alimento: Alimento;
  cantidad_g: number;
}

interface RegistroBackend {
  id: string;
  tiempo_comida: TiempoComida;
  fecha: string;
  total_calorias: number;
  total_proteina_g: number;
  total_carbohidratos_g: number;
  total_grasas_g: number;
  alimentos: { nombre: string; cantidad_g: number; energia_kcal: number }[];
}

interface TipoConfig {
  id: TiempoComida;
  label: string;
  icon: LucideIcon;
  color: string;
}

const tipos: TipoConfig[] = [
  { id: 'desayuno', label: 'Desayuno', icon: Coffee, color: 'text-nutri-accent' },
  { id: 'almuerzo', label: 'Almuerzo', icon: Sun, color: 'text-nutri-primary' },
  { id: 'cena', label: 'Cena', icon: Moon, color: 'text-nutri-info' },
  { id: 'merienda', label: 'Snack', icon: Apple, color: 'text-nutri-success' },
];

function calcularNutrientes(alimentos: AlimentoSeleccionado[]) {
  return alimentos.reduce(
    (acc, { alimento, cantidad_g }) => {
      const f = cantidad_g / 100;
      return {
        calorias: acc.calorias + (alimento.energia_kcal ?? 0) * f,
        proteina: acc.proteina + (alimento.proteina_g ?? 0) * f,
        carbs: acc.carbs + (alimento.carbohidratos_g ?? 0) * f,
        grasas: acc.grasas + (alimento.grasa_g ?? 0) * f,
      };
    },
    { calorias: 0, proteina: 0, carbs: 0, grasas: 0 }
  );
}

export default function DiarioComidas() {
  const { userId } = useAuth();
  const hoy = new Date().toISOString().split('T')[0];

  const [fecha, setFecha] = useState(hoy);
  const [activeTab, setActiveTab] = useState<TiempoComida>('desayuno');

  // Registros del backend
  const [registros, setRegistros] = useState<RegistroBackend[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(true);

  // Búsqueda de alimentos
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Alimento[]>([]);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Alimentos seleccionados para el registro actual
  const [seleccionados, setSeleccionados] = useState<AlimentoSeleccionado[]>([]);
  const [cantidad, setCantidad] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Cargar registros del backend
  useEffect(() => {
    if (!userId) return;
    setLoadingRegistros(true);
    obtenerDiarioAlimentario(userId)
      .then((data) => setRegistros(data?.registros ?? []))
      .catch(() => setRegistros([]))
      .finally(() => setLoadingRegistros(false));
  }, [userId]);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) { setResultados([]); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const data = await buscarAlimentos(query, undefined, false, 8);
        setResultados(data.alimentos ?? []);
      } catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const registrosDelDia = registros.filter((r) => r.fecha?.startsWith(fecha));
  const registrosPorTipo = (tipo: TiempoComida) =>
    registrosDelDia.filter((r) => r.tiempo_comida === tipo);

  const agregarAlimento = (alimento: Alimento) => {
    if (seleccionados.find((s) => s.alimento.id === alimento.id)) return;
    setSeleccionados((prev) => [...prev, { alimento, cantidad_g: 100 }]);
    setCantidad((prev) => ({ ...prev, [alimento.id]: '100' }));
    setQuery('');
    setResultados([]);
  };

  const quitarAlimento = (id: string) => {
    setSeleccionados((prev) => prev.filter((s) => s.alimento.id !== id));
    setCantidad((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const actualizarCantidad = (id: string, val: string) => {
    const g = Math.max(1, parseFloat(val) || 1);
    setCantidad((prev) => ({ ...prev, [id]: String(g) }));
    setSeleccionados((prev) =>
      prev.map((s) => (s.alimento.id === id ? { ...s, cantidad_g: g } : s))
    );
  };

  const handleGuardar = async () => {
    if (!userId || seleccionados.length === 0) return;
    setGuardando(true);
    try {
      const nutr = calcularNutrientes(seleccionados);
      await registrarComida({
        user_id: userId,
        fecha,
        tiempo_comida: activeTab,
        alimentos: seleccionados.map(({ alimento, cantidad_g }) => ({
          alimento_id: alimento.id,
          nombre: alimento.nombre,
          cantidad_g,
          energia_kcal: ((alimento.energia_kcal ?? 0) * cantidad_g) / 100,
          proteina_g: ((alimento.proteina_g ?? 0) * cantidad_g) / 100,
          carbohidratos_g: ((alimento.carbohidratos_g ?? 0) * cantidad_g) / 100,
          grasas_g: ((alimento.grasa_g ?? 0) * cantidad_g) / 100,
        })),
        total_calorias: nutr.calorias,
        total_proteina_g: nutr.proteina,
        total_carbohidratos_g: nutr.carbs,
        total_grasas_g: nutr.grasas,
        notas: null,
      });
      // Recargar registros
      const data = await obtenerDiarioAlimentario(userId);
      setRegistros(data?.registros ?? []);
      setSeleccionados([]);
      setCantidad({});
      setShowForm(false);
    } catch { /* sin-op */ }
    finally { setGuardando(false); }
  };

  const handleEliminar = async (id: string) => {
    if (!userId) return;
    try {
      await eliminarRegistroComida(id);
      setRegistros((prev) => prev.filter((r) => r.id !== id));
    } catch { /* sin-op */ }
  };

  const nutrForm = calcularNutrientes(seleccionados);
  const tipoActivo = tipos.find((t) => t.id === activeTab);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-nutri-gray-900">Diario Alimentario</h1>
            <p className="text-nutri-gray-600 text-sm mt-1">Registra lo que comes cada día</p>
          </div>
          <input
            type="date" value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-label="Fecha del diario"
            className="px-3 py-2 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none bg-white"
          />
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {tipos.map(({ id, label, icon: Icon, color }) => {
            const active = activeTab === id;
            const count = registrosPorTipo(id).length;
            return (
              <button
                key={id} type="button" onClick={() => { setActiveTab(id); setShowForm(false); }}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  active ? 'border-nutri-primary bg-nutri-primary/5' : 'border-nutri-gray-200 bg-white hover:border-nutri-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${active ? 'text-nutri-primary' : color}`} />
                <span className={`text-xs font-medium ${active ? 'text-nutri-primary' : 'text-nutri-gray-700'}`}>
                  {label}
                </span>
                {count > 0 && (
                  <span className="text-xs text-nutri-gray-400 mt-0.5">{count} reg.</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Registros guardados */}
        <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-nutri-gray-900">{tipoActivo?.label}</h2>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-nutri-primary text-white rounded-lg text-sm hover:bg-nutri-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar</span>
            </button>
          </div>

          {loadingRegistros ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-nutri-primary animate-spin" />
            </div>
          ) : registrosPorTipo(activeTab).length === 0 ? (
            <p className="text-nutri-gray-400 text-sm text-center py-8">
              Sin registros para {tipoActivo?.label.toLowerCase()} en esta fecha.
            </p>
          ) : (
            <div className="space-y-3">
              {registrosPorTipo(activeTab).map((reg) => (
                <div key={reg.id} className="border border-nutri-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="grid grid-cols-4 gap-2 flex-1 text-center">
                      {[
                        { v: reg.total_calorias?.toFixed(0), u: 'kcal' },
                        { v: reg.total_proteina_g?.toFixed(1), u: 'prot' },
                        { v: reg.total_carbohidratos_g?.toFixed(1), u: 'carbs' },
                        { v: reg.total_grasas_g?.toFixed(1), u: 'grasas' },
                      ].map(({ v, u }) => (
                        <div key={u}>
                          <p className="text-sm font-bold text-nutri-gray-900">{v ?? '—'}</p>
                          <p className="text-xs text-nutri-gray-500">{u}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEliminar(reg.id)}
                      aria-label="Eliminar registro"
                      className="p-1.5 rounded-lg hover:bg-nutri-gray-100 text-nutri-gray-400 hover:text-nutri-secondary ml-2 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {reg.alimentos?.length > 0 && (
                    <ul className="text-xs text-nutri-gray-500 space-y-0.5 border-t border-nutri-gray-100 pt-2 mt-2">
                      {reg.alimentos.map((a, i) => (
                        <li key={i}>{a.nombre} — {a.cantidad_g} g</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulario nuevo registro */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-nutri-primary p-5 shadow-sm mb-4">
            <h3 className="font-semibold text-nutri-gray-900 mb-4">
              Agregar alimentos — {tipoActivo?.label}
            </h3>

            {/* Búsqueda */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nutri-gray-400" />
              <input
                type="text" value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar alimento (ej: pollo, arroz...)"
                className="w-full pl-10 pr-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
              />
              {buscando && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nutri-gray-400 animate-spin" />
              )}
              {resultados.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-nutri-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {resultados.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => agregarAlimento(a)}
                        className="w-full text-left px-4 py-2.5 hover:bg-nutri-gray-50 text-sm"
                      >
                        <span className="font-medium text-nutri-gray-900">{a.nombre}</span>
                        <span className="text-nutri-gray-500 ml-2">
                          {a.energia_kcal?.toFixed(0)} kcal/100g
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Lista seleccionados */}
            {seleccionados.length > 0 && (
              <ul className="space-y-2 mb-4">
                {seleccionados.map(({ alimento, cantidad_g }) => {
                  const f = cantidad_g / 100;
                  return (
                    <li key={alimento.id} className="flex items-center space-x-3 bg-nutri-gray-50 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-nutri-gray-900 truncate">{alimento.nombre}</p>
                        <p className="text-xs text-nutri-gray-500">
                          {((alimento.energia_kcal ?? 0) * f).toFixed(0)} kcal &middot;{' '}
                          {((alimento.proteina_g ?? 0) * f).toFixed(1)} g prot
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <input
                          type="number"
                          value={cantidad[alimento.id] ?? '100'}
                          onChange={(e) => actualizarCantidad(alimento.id, e.target.value)}
                          min="1" max="2000"
                          aria-label={`Cantidad en gramos de ${alimento.nombre}`}
                          className="w-16 px-2 py-1 border border-nutri-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-nutri-primary"
                        />
                        <span className="text-xs text-nutri-gray-500">g</span>
                        <button
                          type="button"
                          aria-label={`Quitar ${alimento.nombre}`}
                          onClick={() => quitarAlimento(alimento.id)}
                          className="p-1 hover:bg-nutri-gray-200 rounded text-nutri-gray-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Totales preview */}
            {seleccionados.length > 0 && (
              <div className="grid grid-cols-4 gap-2 bg-nutri-primary/5 rounded-xl p-3 mb-4 text-center">
                {[
                  { v: nutrForm.calorias.toFixed(0), u: 'kcal' },
                  { v: nutrForm.proteina.toFixed(1), u: 'prot g' },
                  { v: nutrForm.carbs.toFixed(1), u: 'carbs g' },
                  { v: nutrForm.grasas.toFixed(1), u: 'grasas g' },
                ].map(({ v, u }) => (
                  <div key={u}>
                    <p className="text-sm font-bold text-nutri-primary">{v}</p>
                    <p className="text-xs text-nutri-gray-600">{u}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleGuardar}
                disabled={guardando || seleccionados.length === 0}
                className="flex-1 py-2.5 bg-nutri-primary text-white rounded-lg text-sm font-medium hover:bg-nutri-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Guardar Registro</span>}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setSeleccionados([]); setCantidad({}); setQuery(''); }}
                className="flex-1 py-2.5 border border-nutri-gray-200 text-nutri-gray-700 rounded-lg text-sm font-medium hover:bg-nutri-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Resumen del día */}
        {registrosDelDia.length > 0 && (
          <div className="bg-nutri-gray-50 rounded-2xl p-5 border border-nutri-gray-200">
            <h3 className="font-semibold text-nutri-gray-900 mb-3">Totales del Día</h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { v: registrosDelDia.reduce((a, r) => a + (r.total_calorias ?? 0), 0).toFixed(0), u: 'kcal' },
                { v: registrosDelDia.reduce((a, r) => a + (r.total_proteina_g ?? 0), 0).toFixed(1), u: 'prot g' },
                { v: registrosDelDia.reduce((a, r) => a + (r.total_carbohidratos_g ?? 0), 0).toFixed(1), u: 'carbs g' },
                { v: registrosDelDia.reduce((a, r) => a + (r.total_grasas_g ?? 0), 0).toFixed(1), u: 'grasas g' },
              ].map(({ v, u }) => (
                <div key={u}>
                  <p className="text-xl font-bold text-nutri-primary">{v}</p>
                  <p className="text-xs text-nutri-gray-600 mt-0.5">{u}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

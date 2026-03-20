import { useState, useEffect, useRef } from 'react';
import { Plus, X, Search, Loader2, Coffee, Sun, Moon, Apple, Droplets, HelpCircle } from 'lucide-react';
import { fechaHoyHonduras } from '../utils/fecha';
import type { LucideIcon } from 'lucide-react';
import type { Alimento } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  buscarAlimentos,
  obtenerDiarioAlimentario,
  registrarComida,
  eliminarRegistroComida,
  obtenerPerfil,
  obtenerAlimentosFrecuentes,
} from '../services/api';

// Backend usa "merienda" — UI lo muestra como "Snack"
type TiempoComida = 'desayuno' | 'almuerzo' | 'cena' | 'merienda';

interface AlimentoSeleccionado {
  uid: string;       // identificador único por entrada (crypto.randomUUID)
  alimento: Alimento;
  cantidad_g: number;
  porciones: number; // default 1
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
  { id: 'almuerzo', label: 'Almuerzo', icon: Sun,    color: 'text-nutri-primary' },
  { id: 'cena',     label: 'Cena',     icon: Moon,   color: 'text-nutri-info' },
  { id: 'merienda', label: 'Snack',    icon: Apple,  color: 'text-nutri-success' },
];

function calcularNutrientes(alimentos: AlimentoSeleccionado[]) {
  return alimentos.reduce(
    (acc, { alimento, cantidad_g, porciones }) => {
      const f = (cantidad_g / 100) * porciones;
      return {
        calorias: acc.calorias + (alimento.energia_kcal ?? 0) * f,
        proteina: acc.proteina + (alimento.proteina_g ?? 0) * f,
        carbs:    acc.carbs    + (alimento.carbohidratos_g ?? 0) * f,
        grasas:   acc.grasas   + (alimento.grasa_g ?? 0) * f,
        fibra:    acc.fibra    + (alimento.fibra_g ?? 0) * f,
        sodio:    acc.sodio    + (alimento.sodio_mg ?? 0) * f,
      };
    },
    { calorias: 0, proteina: 0, carbs: 0, grasas: 0, fibra: 0, sodio: 0 }
  );
}

function calcularMetaAgua(
  peso_kg: number | null,
  actividad_fisica: string | null,
): { meta_ml: number; meta_vasos: number; formula: string } {
  const base_ml = peso_kg ? Math.round(peso_kg * 35) : 2000;
  const ajuste: Record<string, number> = {
    sedentario: 0, ligero: 250, moderado: 500, intenso: 750, muy_intenso: 1000,
  };
  const extra = ajuste[actividad_fisica ?? ''] ?? 0;
  const meta_ml = base_ml + extra;
  const meta_vasos = Math.round(meta_ml / 250);
  const formula = peso_kg
    ? `${peso_kg} kg × 35 ml${extra > 0 ? ` + ${extra} ml por actividad` : ''}`
    : 'Estimacion base (completa tu perfil para personalizar)';
  return { meta_ml, meta_vasos, formula };
}

export default function DiarioComidas() {
  const { userId } = useAuth();
  const hoy = fechaHoyHonduras();

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

  // Alimentos seleccionados para el registro actual (uid-keyed)
  const [seleccionados, setSeleccionados] = useState<AlimentoSeleccionado[]>([]);
  const [cantidad, setCantidad] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Autocomplete: alimentos frecuentes del usuario
  const [frecuentes, setFrecuentes] = useState<{ alimento_id: string; nombre: string; energia_kcal_100g: number | null }[]>([]);

  // Perfil para hidratación
  const [perfilHidratacion, setPerfilHidratacion] = useState<{
    peso_kg: number | null;
    actividad_fisica: string | null;
  } | null>(null);

  // TODO: persistir hidratacion en backend (trabajo futuro)
  //const [vasosRegistrados, setVasosRegistrados] = useState(0);
  const [vasosRegistrados, setVasosRegistrados] = useState<number>(() => {
  const hoyKey = `hidratacion_${fechaHoyHonduras()}_${userId ?? 'guest'}`;
  return parseInt(localStorage.getItem(hoyKey) ?? '0', 10) || 0;
});
  const [mlManuales, setMlManuales] = useState('');
  const [mostrarInputMl, setMostrarInputMl] = useState(false);
  const [mostrarTooltipAgua, setMostrarTooltipAgua] = useState(false);

  // Cargar registros del backend
  useEffect(() => {
    if (!userId) return;
    setLoadingRegistros(true);
    obtenerDiarioAlimentario(userId)
      .then((data) => setRegistros(data?.registros ?? []))
      .catch(() => setRegistros([]))
      .finally(() => setLoadingRegistros(false));
  }, [userId]);

  // Cargar perfil para meta de agua
  useEffect(() => {
    if (!userId) return;
    obtenerPerfil(userId)
      .then((data) =>
        setPerfilHidratacion({
          peso_kg: data.peso_kg ?? null,
          actividad_fisica: data.actividad_fisica ?? null,
        })
      )
      .catch(() => {});
  }, [userId]);

  // Reiniciar vasos al cambiar de fecha
  // useEffect(() => {
  //   setVasosRegistrados(0);
  //   setMlManuales('');
  //   setMostrarInputMl(false);
  // }, [fecha]);
useEffect(() => {
  const key = `hidratacion_${fecha}_${userId ?? 'guest'}`;
  const guardado = parseInt(localStorage.getItem(key) ?? '0', 10) || 0;
  setVasosRegistrados(guardado);
  setMlManuales('');
  setMostrarInputMl(false);
}, [fecha, userId]);

useEffect(() => {
  if (!userId) return;
  const key = `hidratacion_${fecha}_${userId}`;
  localStorage.setItem(key, String(vasosRegistrados));
}, [vasosRegistrados, fecha, userId]);

  // Cargar alimentos frecuentes cuando se abre el formulario
  useEffect(() => {
    if (!showForm || !userId) return;
    obtenerAlimentosFrecuentes(userId, activeTab, 6)
      .then((data) => setFrecuentes(data?.sugerencias ?? []))
      .catch(() => setFrecuentes([]));
  }, [showForm, activeTab, userId]);

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
    const uid = crypto.randomUUID();
    setSeleccionados((prev) => [...prev, { uid, alimento, cantidad_g: 100, porciones: 1 }]);
    setCantidad((prev) => ({ ...prev, [uid]: '100' }));
    setQuery('');
    setResultados([]);
  };

  const quitarAlimento = (uid: string) => {
    setSeleccionados((prev) => prev.filter((s) => s.uid !== uid));
    setCantidad((prev) => { const n = { ...prev }; delete n[uid]; return n; });
  };

  const actualizarCantidad = (uid: string, val: string) => {
    const g = Math.max(1, parseFloat(val) || 1);
    setCantidad((prev) => ({ ...prev, [uid]: String(g) }));
    setSeleccionados((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, cantidad_g: g } : s))
    );
  };

  const actualizarPorciones = (uid: string, delta: number) => {
    setSeleccionados((prev) =>
      prev.map((s) =>
        s.uid === uid
          ? { ...s, porciones: Math.min(20, Math.max(1, s.porciones + delta)) }
          : s
      )
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
        alimentos: seleccionados.map(({ alimento, cantidad_g, porciones }) => ({
          alimento_id: alimento.id,
          nombre: porciones > 1 ? `${alimento.nombre} (x${porciones})` : alimento.nombre,
          cantidad_g: cantidad_g * porciones,
          energia_kcal: ((alimento.energia_kcal ?? 0) * cantidad_g / 100) * porciones,
          proteina_g:   ((alimento.proteina_g ?? 0) * cantidad_g / 100) * porciones,
          carbohidratos_g: ((alimento.carbohidratos_g ?? 0) * cantidad_g / 100) * porciones,
          grasas_g:     ((alimento.grasa_g ?? 0) * cantidad_g / 100) * porciones,
        })),
        total_calorias:        nutr.calorias,
        total_proteina_g:      nutr.proteina,
        total_carbohidratos_g: nutr.carbs,
        total_grasas_g:        nutr.grasas,
        notas: null,
      });
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

  // Hidratación
  const { meta_ml, meta_vasos, formula } = calcularMetaAgua(
    perfilHidratacion?.peso_kg ?? null,
    perfilHidratacion?.actividad_fisica ?? null,
  );
  const mlRegistrados = vasosRegistrados * 250;
  const pctAgua = Math.min(Math.round((mlRegistrados / meta_ml) * 100), 100);
  const metaAlcanzada = vasosRegistrados >= meta_vasos;
  const pocaAgua = vasosRegistrados < Math.ceil(meta_vasos * 0.5);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-nutri-gray-900">Diario Alimentario</h1>
            <p className="text-nutri-gray-600 text-sm mt-1">Registra lo que comes cada dia</p>
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
                key={id} type="button"
                onClick={() => { setActiveTab(id); setShowForm(false); }}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  active
                    ? 'border-nutri-primary bg-nutri-primary/5'
                    : 'border-nutri-gray-200 bg-white hover:border-nutri-gray-300'
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
                        { v: reg.total_calorias?.toFixed(0),        u: 'kcal' },
                        { v: reg.total_proteina_g?.toFixed(1),       u: 'prot' },
                        { v: reg.total_carbohidratos_g?.toFixed(1),  u: 'carbs' },
                        { v: reg.total_grasas_g?.toFixed(1),         u: 'grasas' },
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

            {/* Sugerencias frecuentes (solo si no hay búsqueda activa) */}
            {frecuentes.length > 0 && !query && seleccionados.length === 0 && (
              <div className="mb-3">
                <p className="text-xs text-nutri-gray-500 mb-2">Usados frecuentemente:</p>
                <div className="flex flex-wrap gap-2">
                  {frecuentes.map((f) => (
                    <button
                      key={f.alimento_id}
                      type="button"
                      onClick={() => setQuery(f.nombre)}
                      className="px-3 py-1.5 bg-nutri-primary/8 border border-nutri-primary/20 text-nutri-primary text-xs rounded-full hover:bg-nutri-primary/15 transition-colors truncate max-w-[160px]"
                      title={f.nombre}
                    >
                      {f.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* Lista seleccionados (uid-keyed, con porciones) */}
            {seleccionados.length > 0 && (
              <ul className="space-y-2 mb-4">
                {seleccionados.map(({ uid, alimento, cantidad_g, porciones }) => {
                  const f = (cantidad_g / 100) * porciones;
                  return (
                    <li key={uid} className="bg-nutri-gray-50 rounded-lg px-3 py-2.5">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-nutri-gray-900 truncate">{alimento.nombre}</p>
                          <p className="text-xs text-nutri-gray-500">
                            {((alimento.energia_kcal ?? 0) * f).toFixed(0)} kcal &middot;{' '}
                            {((alimento.proteina_g ?? 0) * f).toFixed(1)} g prot
                            {alimento.fibra_g ? ` · ${(alimento.fibra_g * f).toFixed(1)} g fibra` : ''}
                            {alimento.sodio_mg ? ` · ${(alimento.sodio_mg * f).toFixed(0)} mg sodio` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Quitar ${alimento.nombre}`}
                          onClick={() => quitarAlimento(uid)}
                          className="p-1 hover:bg-nutri-gray-200 rounded text-nutri-gray-400 ml-2 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Porciones */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-nutri-gray-500 mr-1">Porciones:</span>
                          <button
                            type="button"
                            aria-label="Reducir porciones"
                            onClick={() => actualizarPorciones(uid, -1)}
                            disabled={porciones <= 1}
                            className="w-7 h-7 rounded-full border border-nutri-gray-200 flex items-center justify-center text-nutri-gray-700 hover:bg-nutri-gray-100 disabled:opacity-40 text-sm font-bold"
                          >
                            −
                          </button>
                          <span className="text-sm font-semibold text-nutri-gray-900 w-5 text-center">
                            {porciones}
                          </span>
                          <button
                            type="button"
                            aria-label="Aumentar porciones"
                            onClick={() => actualizarPorciones(uid, 1)}
                            disabled={porciones >= 20}
                            className="w-7 h-7 rounded-full border border-nutri-gray-200 flex items-center justify-center text-nutri-gray-700 hover:bg-nutri-gray-100 disabled:opacity-40 text-sm font-bold"
                          >
                            +
                          </button>
                        </div>
                        {/* Gramos por porción */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-nutri-gray-500">Cantidad:</span>
                          <input
                            type="number"
                            value={cantidad[uid] ?? '100'}
                            onChange={(e) => actualizarCantidad(uid, e.target.value)}
                            min="1" max="2000"
                            aria-label={`Gramos por porcion de ${alimento.nombre}`}
                            className="w-16 px-2 py-1 border border-nutri-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-nutri-primary"
                          />
                          <span className="text-xs text-nutri-gray-500">g</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Totales preview */}
            {seleccionados.length > 0 && (
              <div className="grid grid-cols-3 gap-2 bg-nutri-primary/5 rounded-xl p-3 mb-4 text-center">
                {[
                  { v: nutrForm.calorias.toFixed(0), u: 'kcal' },
                  { v: nutrForm.proteina.toFixed(1),  u: 'prot g' },
                  { v: nutrForm.carbs.toFixed(1),     u: 'carbs g' },
                  { v: nutrForm.grasas.toFixed(1),    u: 'grasas g' },
                  ...(nutrForm.fibra > 0 ? [{ v: nutrForm.fibra.toFixed(1), u: 'fibra g' }] : []),
                  ...(nutrForm.sodio > 0 ? [{ v: nutrForm.sodio.toFixed(0), u: 'sodio mg' }] : []),
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
            <h3 className="font-semibold text-nutri-gray-900 mb-3">Totales del Dia</h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { v: registrosDelDia.reduce((a, r) => a + (r.total_calorias ?? 0), 0).toFixed(0),        u: 'kcal' },
                { v: registrosDelDia.reduce((a, r) => a + (r.total_proteina_g ?? 0), 0).toFixed(1),       u: 'prot g' },
                { v: registrosDelDia.reduce((a, r) => a + (r.total_carbohidratos_g ?? 0), 0).toFixed(1),  u: 'carbs g' },
                { v: registrosDelDia.reduce((a, r) => a + (r.total_grasas_g ?? 0), 0).toFixed(1),         u: 'grasas g' },
              ].map(({ v, u }) => (
                <div key={u}>
                  <p className="text-xl font-bold text-nutri-primary">{v}</p>
                  <p className="text-xs text-nutri-gray-600 mt-0.5">{u}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidratación */}
        <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 shadow-sm mt-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Droplets className="w-5 h-5 text-nutri-info" />
              <h3 className="font-semibold text-nutri-gray-900">Hidratacion</h3>
            </div>
            <button
              type="button"
              aria-label="Como se calcula la meta de agua"
              onClick={() => setMostrarTooltipAgua((v) => !v)}
              className="p-1 rounded-lg hover:bg-nutri-gray-100 text-nutri-gray-400"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Tooltip */}
          {mostrarTooltipAgua && (
            <div className="bg-nutri-gray-50 border border-nutri-gray-200 rounded-xl p-3 mb-3 text-xs text-nutri-gray-600 leading-relaxed">
              <p>
                La meta de hidratacion se calcula con la formula estandar clinica de{' '}
                <strong>35 ml por kg de peso corporal</strong>, ajustada segun tu nivel de actividad
                fisica. Un vaso equivale a 250 ml. Si no tienes tu peso registrado en el perfil, se
                usa una estimacion base de 2,000 ml diarios.
              </p>
              <button
                type="button"
                onClick={() => setMostrarTooltipAgua(false)}
                className="mt-2 text-nutri-primary font-medium hover:underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Meta */}
          <div className="mb-3">
            <p className="text-sm font-medium text-nutri-gray-800">
              Meta:{' '}
              <span className="text-nutri-info font-bold">
                {meta_ml.toLocaleString()} ml
              </span>
              {' · '}
              <span className="text-nutri-info font-bold">{meta_vasos} vasos</span>
            </p>
            <p className="text-xs text-nutri-gray-400 mt-0.5">Base: {formula}</p>
          </div>

          {/* Barra de progreso */}
          <div className="mb-1">
            <progress
              value={pctAgua}
              max={100}
              aria-label={`Hidratacion: ${pctAgua}%`}
              className="w-full h-3 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-nutri-gray-100 [&::-webkit-progress-value]:bg-nutri-info [&::-moz-progress-bar]:bg-nutri-info"
            />
          </div>
          <p className="text-xs text-nutri-gray-500 mb-4">
            {vasosRegistrados} de {meta_vasos} vasos ({pctAgua}%)
            {vasosRegistrados > meta_vasos && (
              <span className="ml-1 text-nutri-success font-medium">+{vasosRegistrados - meta_vasos} extra</span>
            )}
          </p>

          {/* Alertas */}
          {metaAlcanzada && (
            <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4 text-sm text-green-700">
              <span>✅</span>
              <span>Meta de hidratacion alcanzada!</span>
            </div>
          )}
          {!metaAlcanzada && pocaAgua && vasosRegistrados > 0 && (
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-sm text-amber-700">
              <span>⚠️</span>
              <span>Recuerda hidratarte durante el dia</span>
            </div>
          )}

          {/* Contador de vasos */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-nutri-gray-700">Vasos de 250 ml:</span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                aria-label="Quitar un vaso"
                onClick={() => setVasosRegistrados((v) => Math.max(0, v - 1))}
                disabled={vasosRegistrados === 0}
                className="w-10 h-10 rounded-full border border-nutri-gray-200 flex items-center justify-center text-nutri-gray-700 hover:bg-nutri-gray-100 disabled:opacity-40 text-lg font-bold"
              >
                −
              </button>
              <span className="text-xl font-bold text-nutri-gray-900 w-8 text-center">
                {vasosRegistrados}
              </span>
              <button
                type="button"
                aria-label="Agregar un vaso"
                onClick={() => setVasosRegistrados((v) => Math.min(v + 1, meta_vasos * 2))}
                disabled={vasosRegistrados >= meta_vasos * 2}
                className="w-10 h-10 rounded-full border border-nutri-gray-200 flex items-center justify-center text-nutri-gray-700 hover:bg-nutri-gray-100 disabled:opacity-40 text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Registro en ml */}
          <div>
            {!mostrarInputMl ? (
              <button
                type="button"
                onClick={() => setMostrarInputMl(true)}
                className="text-xs text-nutri-primary hover:underline"
              >
                Prefiero registrar en ml
              </button>
            ) : (
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="number"
                  value={mlManuales}
                  onChange={(e) => setMlManuales(e.target.value)}
                  min="1"
                  placeholder="ml"
                  aria-label="Mililitros a registrar"
                  className="w-24 px-2 py-1.5 border border-nutri-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-nutri-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    const ml = parseFloat(mlManuales);
                    if (ml > 0) {
                      setVasosRegistrados((v) => v + Math.round(ml / 250));
                      setMlManuales('');
                    }
                  }}
                  disabled={!mlManuales || parseFloat(mlManuales) <= 0}
                  className="px-3 py-1.5 bg-nutri-info text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40"
                >
                  Agregar
                </button>
                <button
                  type="button"
                  onClick={() => { setMostrarInputMl(false); setMlManuales(''); }}
                  className="text-xs text-nutri-gray-400 hover:text-nutri-gray-600"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

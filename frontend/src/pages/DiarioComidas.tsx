import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Coffee, Sun, Moon, Apple } from 'lucide-react';

type TipoComida = 'desayuno' | 'almuerzo' | 'cena' | 'snack';

interface RegistroLocal {
  id: string;
  alimento: string;
  cantidad: string;
  tipo: TipoComida;
}

interface TipoConfig {
  id: TipoComida;
  label: string;
  icon: LucideIcon;
  color: string;
}

const tipos: TipoConfig[] = [
  { id: 'desayuno', label: 'Desayuno', icon: Coffee, color: 'text-nutri-accent' },
  { id: 'almuerzo', label: 'Almuerzo', icon: Sun, color: 'text-nutri-primary' },
  { id: 'cena', label: 'Cena', icon: Moon, color: 'text-nutri-info' },
  { id: 'snack', label: 'Snack', icon: Apple, color: 'text-nutri-success' },
];

const registrosIniciales: RegistroLocal[] = [
  { id: '1', alimento: 'Avena con leche', cantidad: '250 g', tipo: 'desayuno' },
  { id: '2', alimento: 'Platano', cantidad: '1 unidad', tipo: 'desayuno' },
  { id: '3', alimento: 'Arroz con pollo', cantidad: '300 g', tipo: 'almuerzo' },
  { id: '4', alimento: 'Ensalada verde', cantidad: '150 g', tipo: 'almuerzo' },
];

export default function DiarioComidas() {
  const hoy = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(hoy);
  const [registros, setRegistros] = useState<RegistroLocal[]>(registrosIniciales);
  const [activeTab, setActiveTab] = useState<TipoComida>('desayuno');
  const [showForm, setShowForm] = useState(false);
  const [newAlimento, setNewAlimento] = useState('');
  const [newCantidad, setNewCantidad] = useState('');

  const filtrados = registros.filter((r) => r.tipo === activeTab);
  const countPorTipo = (tipo: TipoComida) => registros.filter((r) => r.tipo === tipo).length;

  const handleAdd = () => {
    if (!newAlimento.trim()) return;
    setRegistros((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        alimento: newAlimento.trim(),
        cantidad: newCantidad.trim() || '100 g',
        tipo: activeTab,
      },
    ]);
    setNewAlimento('');
    setNewCantidad('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  };

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
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-3 py-2 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none bg-white"
          />
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {tipos.map(({ id, label, icon: Icon, color }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  active
                    ? 'border-nutri-primary bg-nutri-primary/5'
                    : 'border-nutri-gray-200 bg-white hover:border-nutri-gray-300'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-1 ${active ? 'text-nutri-primary' : color}`}
                />
                <span
                  className={`text-xs font-medium ${
                    active ? 'text-nutri-primary' : 'text-nutri-gray-700'
                  }`}
                >
                  {label}
                </span>
                {countPorTipo(id) > 0 && (
                  <span className="text-xs text-nutri-gray-400 mt-0.5">
                    {countPorTipo(id)} item{countPorTipo(id) !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista */}
        <div className="bg-white rounded-2xl border border-nutri-gray-200 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-nutri-gray-900">{tipoActivo?.label}</h2>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-nutri-primary text-white rounded-lg text-sm hover:bg-nutri-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar</span>
            </button>
          </div>

          {filtrados.length === 0 ? (
            <p className="text-nutri-gray-400 text-sm text-center py-8">
              Sin registros para {tipoActivo?.label.toLowerCase()}. Presiona Agregar.
            </p>
          ) : (
            <ul className="divide-y divide-nutri-gray-100">
              {filtrados.map(({ id, alimento, cantidad }) => (
                <li key={id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-nutri-gray-900">{alimento}</p>
                    <p className="text-xs text-nutri-gray-500">{cantidad}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(id)}
                    className="p-1.5 rounded-lg hover:bg-nutri-gray-100 text-nutri-gray-400 hover:text-nutri-secondary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Formulario agregar */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-nutri-primary p-5 shadow-sm mb-4">
            <h3 className="font-semibold text-nutri-gray-900 mb-4">Agregar alimento</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newAlimento}
                onChange={(e) => setNewAlimento(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Nombre del alimento"
                autoFocus
                className="w-full px-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
              />
              <input
                type="text"
                value={newCantidad}
                onChange={(e) => setNewCantidad(e.target.value)}
                placeholder="Cantidad (ej: 150 g, 1 taza)"
                className="w-full px-4 py-2.5 border border-nutri-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-nutri-primary focus:outline-none"
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleAdd}
                  className="flex-1 py-2.5 bg-nutri-primary text-white rounded-lg text-sm font-medium hover:bg-nutri-primary-dark transition-colors"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setNewAlimento('');
                    setNewCantidad('');
                  }}
                  className="flex-1 py-2.5 border border-nutri-gray-200 text-nutri-gray-700 rounded-lg text-sm font-medium hover:bg-nutri-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resumen del día */}
        <div className="bg-nutri-gray-50 rounded-2xl p-5 border border-nutri-gray-200">
          <h3 className="font-semibold text-nutri-gray-900 mb-3">Resumen del Día</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            {tipos.map(({ id, label }) => (
              <div key={id}>
                <p className="text-xl font-bold text-nutri-primary">{countPorTipo(id)}</p>
                <p className="text-xs text-nutri-gray-600 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-nutri-gray-400 mt-4 text-center">
            Total: {registros.length} registros &middot; Próximamente: análisis calórico automático
          </p>
        </div>
      </div>
    </div>
  );
}

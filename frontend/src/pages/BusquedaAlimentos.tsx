import React, { useState } from 'react';
import { Search, Loader2, X, ChevronDown } from 'lucide-react';
import { buscarAlimentos, listarCategorias } from '../services/api';
import type { Alimento } from '../types';

const BusquedaAlimentos = () => {
  const [termino, setTermino] = useState('');
  const [categoria, setCategoria] = useState<string>('');
  const [soloHondurenos, setSoloHondurenos] = useState(false);
  const [resultados, setResultados] = useState<Alimento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalEncontrados, setTotalEncontrados] = useState(0);
  const [alimentoSeleccionado, setAlimentoSeleccionado] = useState<Alimento | null>(null);

  const categorias = [
    'frutas',
    'verduras',
    'cereales',
    'leguminosas',
    'lacteos_huevos',
    'carnes',
    'grasas_aceites',
    'azucares_dulces',
    'bebidas'
  ];

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termino.trim()) return;

    setIsLoading(true);
    try {
      const data = await buscarAlimentos(
        termino,
        categoria || undefined,
        soloHondurenos,
        20
      );
      setResultados(data.alimentos);
      setTotalEncontrados(data.total_encontrados);
    } catch (error) {
      console.error('Error al buscar:', error);
      setResultados([]);
      setTotalEncontrados(0);
    } finally {
      setIsLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setTermino('');
    setCategoria('');
    setSoloHondurenos(false);
    setResultados([]);
    setTotalEncontrados(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-nutri-gray-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-nutri-primary mb-2">
            🥗 Búsqueda de Alimentos
          </h1>
          <p className="text-nutri-gray-600">
            Explora nuestra base de datos con más de 92,000 alimentos
          </p>
        </div>

        {/* Formulario de Búsqueda */}
        <form onSubmit={handleBuscar} className="bg-white rounded-2xl shadow-[var(--shadow-medium)] p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {/* Campo de búsqueda */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-nutri-gray-700 mb-2">
                Buscar alimento
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nutri-gray-400" />
                <input
                  type="text"
                  value={termino}
                  onChange={(e) => setTermino(e.target.value)}
                  placeholder="Ej: mango, frijoles, tortilla..."
                  className="w-full pl-10 pr-4 py-3 bg-nutri-gray-50 border border-nutri-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-nutri-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-nutri-gray-700 mb-2">
                Categoría
              </label>
              <div className="relative">
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-4 py-3 bg-nutri-gray-50 border border-nutri-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-nutri-primary focus:border-transparent appearance-none"
                >
                  <option value="">Todas</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-nutri-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={soloHondurenos}
                onChange={(e) => setSoloHondurenos(e.target.checked)}
                className="w-5 h-5 text-nutri-primary border-nutri-gray-300 rounded focus:ring-nutri-primary"
              />
              <span className="text-sm text-nutri-gray-700">
                Solo alimentos hondureños 🇭🇳
              </span>
            </label>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={limpiarFiltros}
                className="px-4 py-2 text-nutri-gray-600 hover:text-nutri-gray-800 transition-colors flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Limpiar</span>
              </button>
              <button
                type="submit"
                disabled={!termino.trim() || isLoading}
                className="px-6 py-2 bg-nutri-primary text-white rounded-xl hover:bg-nutri-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Buscar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Resultados */}
        {totalEncontrados > 0 && (
          <div className="mb-4">
            <p className="text-sm text-nutri-gray-600">
              Se encontraron <span className="font-semibold text-nutri-primary">{totalEncontrados}</span> resultados
            </p>
          </div>
        )}

        {/* Grid de resultados */}
        {resultados.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resultados.map((alimento) => (
              <div
                key={alimento.id}
                onClick={() => setAlimentoSeleccionado(alimento)}
                className="bg-white rounded-xl border border-nutri-gray-200 p-4 hover:border-nutri-primary hover:shadow-[var(--shadow-medium)] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-nutri-gray-800 flex-1">
                    {alimento.nombre}
                  </h3>
                  {alimento.es_alimento_hondureno && (
                    <span className="text-lg ml-2">🇭🇳</span>
                  )}
                </div>
                
                <p className="text-xs text-nutri-gray-500 mb-3">
                  {alimento.categoria.replace(/_/g, ' ')} • {alimento.fuente}
                </p>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-nutri-gray-50 rounded-lg p-2">
                    <p className="text-xs text-nutri-gray-600">Energía</p>
                    <p className="font-semibold text-nutri-primary">
                      {alimento.energia_kcal != null ? alimento.energia_kcal.toFixed(0) : '—'} kcal
                    </p>
                  </div>
                  <div className="bg-nutri-gray-50 rounded-lg p-2">
                    <p className="text-xs text-nutri-gray-600">Proteína</p>
                    <p className="font-semibold text-nutri-success">
                      {alimento.proteina_g != null ? alimento.proteina_g.toFixed(1) : '—'} g
                    </p>
                  </div>
                  <div className="bg-nutri-gray-50 rounded-lg p-2">
                    <p className="text-xs text-nutri-gray-600">Grasa</p>
                    <p className="font-semibold text-nutri-accent">
                      {alimento.grasa_g != null ? alimento.grasa_g.toFixed(1) : '—'} g
                    </p>
                  </div>
                  <div className="bg-nutri-gray-50 rounded-lg p-2">
                    <p className="text-xs text-nutri-gray-600">Carbohidratos</p>
                    <p className="font-semibold text-nutri-info">
                      {alimento.carbohidratos_g != null ? alimento.carbohidratos_g.toFixed(1) : '—'} g
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sin resultados */}
        {!isLoading && resultados.length === 0 && termino && (
          <div className="text-center py-12">
            <p className="text-nutri-gray-500 mb-2">
              No se encontraron resultados para "{termino}"
            </p>
            <p className="text-sm text-nutri-gray-400">
              Intenta con otro término de búsqueda
            </p>
          </div>
        )}

        {/* Modal de Detalle */}
        {alimentoSeleccionado && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setAlimentoSeleccionado(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-nutri-primary mb-2">
                    {alimentoSeleccionado.nombre}
                  </h2>
                  <p className="text-sm text-nutri-gray-600">
                    {alimentoSeleccionado.categoria.replace(/_/g, ' ')} • {alimentoSeleccionado.fuente}
                  </p>
                </div>
                <button
                  onClick={() => setAlimentoSeleccionado(null)}
                  className="p-2 hover:bg-nutri-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-nutri-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-nutri-primary/10 to-nutri-primary/5 rounded-xl p-4">
                    <p className="text-xs text-nutri-gray-600 mb-1">Energía</p>
                    <p className="text-xl font-bold text-nutri-primary">
                      {alimentoSeleccionado.energia_kcal != null ? alimentoSeleccionado.energia_kcal.toFixed(0) : '—'}
                    </p>
                    <p className="text-xs text-nutri-gray-500">kcal</p>
                  </div>
                  <div className="bg-gradient-to-br from-nutri-success/10 to-nutri-success/5 rounded-xl p-4">
                    <p className="text-xs text-nutri-gray-600 mb-1">Proteína</p>
                    <p className="text-xl font-bold text-nutri-success">
                      {alimentoSeleccionado.proteina_g != null ? alimentoSeleccionado.proteina_g.toFixed(1) : '—'}
                    </p>
                    <p className="text-xs text-nutri-gray-500">g</p>
                  </div>
                  <div className="bg-gradient-to-br from-nutri-accent/10 to-nutri-accent/5 rounded-xl p-4">
                    <p className="text-xs text-nutri-gray-600 mb-1">Grasa</p>
                    <p className="text-xl font-bold text-nutri-accent">
                      {alimentoSeleccionado.grasa_g != null ? alimentoSeleccionado.grasa_g.toFixed(1) : '—'}
                    </p>
                    <p className="text-xs text-nutri-gray-500">g</p>
                  </div>
                  <div className="bg-gradient-to-br from-nutri-info/10 to-nutri-info/5 rounded-xl p-4">
                    <p className="text-xs text-nutri-gray-600 mb-1">Carbohidratos</p>
                    <p className="text-xl font-bold text-nutri-info">
                      {alimentoSeleccionado.carbohidratos_g != null ? alimentoSeleccionado.carbohidratos_g.toFixed(1) : '—'}
                    </p>
                    <p className="text-xs text-nutri-gray-500">g</p>
                  </div>
                </div>

                {/* Información adicional si está disponible */}
                {(alimentoSeleccionado.fibra_g || 
                  alimentoSeleccionado.calcio_mg || 
                  alimentoSeleccionado.hierro_mg ||
                  alimentoSeleccionado.vitamina_a_ug ||
                  alimentoSeleccionado.vitamina_c_mg) && (
                  <div className="border-t border-nutri-gray-200 pt-4">
                    <h3 className="font-semibold text-nutri-gray-800 mb-3">
                      Micronutrientes
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {alimentoSeleccionado.fibra_g && (
                        <div className="text-sm">
                          <p className="text-nutri-gray-600">Fibra</p>
                          <p className="font-semibold">{alimentoSeleccionado.fibra_g.toFixed(1)} g</p>
                        </div>
                      )}
                      {alimentoSeleccionado.calcio_mg && (
                        <div className="text-sm">
                          <p className="text-nutri-gray-600">Calcio</p>
                          <p className="font-semibold">{alimentoSeleccionado.calcio_mg.toFixed(0)} mg</p>
                        </div>
                      )}
                      {alimentoSeleccionado.hierro_mg && (
                        <div className="text-sm">
                          <p className="text-nutri-gray-600">Hierro</p>
                          <p className="font-semibold">{alimentoSeleccionado.hierro_mg.toFixed(1)} mg</p>
                        </div>
                      )}
                      {alimentoSeleccionado.vitamina_a_ug && (
                        <div className="text-sm">
                          <p className="text-nutri-gray-600">Vitamina A</p>
                          <p className="font-semibold">{alimentoSeleccionado.vitamina_a_ug.toFixed(0)} μg</p>
                        </div>
                      )}
                      {alimentoSeleccionado.vitamina_c_mg && (
                        <div className="text-sm">
                          <p className="text-nutri-gray-600">Vitamina C</p>
                          <p className="font-semibold">{alimentoSeleccionado.vitamina_c_mg.toFixed(1)} mg</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-nutri-gray-500 text-center">
                  Valores nutricionales por 100g de porción comestible
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusquedaAlimentos;
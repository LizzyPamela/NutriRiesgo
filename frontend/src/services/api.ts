import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// CHAT
// ============================================================================

export const enviarConsulta = async (consulta: string, userId?: string) => {
  const response = await api.post('/chat/consulta', {
    consulta,
    user_id: userId || null,
    incluir_contexto_perfil: false
  });
  return response.data;
};

export const obtenerConversaciones = async (userId: string) => {
  const response = await api.get(`/chat/conversaciones/${userId}`);
  return response.data;
};

export const obtenerEstadisticas = async () => {
  const response = await api.get('/chat/estadisticas');
  return response.data;
};

// ============================================================================
// ALIMENTOS
// ============================================================================

export const buscarAlimentos = async (
  termino: string,
  categoria?: string,
  soloHondurenos: boolean = false,
  limite: number = 10
) => {
  const response = await api.post('/alimentos/buscar', {
    termino,
    categoria,
    solo_hondurenos: soloHondurenos,
    limite
  });
  return response.data;
};

export const obtenerAlimento = async (alimentoId: string) => {
  const response = await api.get(`/alimentos/${alimentoId}`);
  return response.data;
};

export const listarCategorias = async () => {
  const response = await api.get('/alimentos/categorias/listar');
  return response.data;
};

export const obtenerTopHondurenos = async (limite: number = 20) => {
  const response = await api.get('/alimentos/hondurenos/top', {
    params: { limite }
  });
  return response.data;
};

// ============================================================================
// PERFIL (Para futuro)
// ============================================================================

export const obtenerPerfil = async (userId: string) => {
  const response = await api.get(`/perfil/${userId}`);
  return response.data;
};

export const crearOActualizarPerfil = async (userId: string, datos: any) => {
  const response = await api.post(`/perfil/${userId}`, datos);
  return response.data;
};

export const eliminarPerfil = async (userId: string) => {
  const response = await api.delete(`/perfil/${userId}`);
  return response.data;
};

export const eliminarCuenta = async (userId: string) => {
  const response = await api.delete(`/perfil/${userId}/cuenta`);
  return response.data;
};

// ============================================================================
// COMIDAS (Para futuro)
// ============================================================================

export const registrarComida = async (datos: any) => {
  const response = await api.post('/comidas/registrar', datos);
  return response.data;
};

export const obtenerDiarioAlimentario = async (userId: string) => {
  const response = await api.get(`/comidas/${userId}`);
  return response.data;
};

export const eliminarRegistroComida = async (registroId: string) => {
  const response = await api.delete(`/comidas/${registroId}`);
  return response.data;
};

// ============================================================================
// HEALTH
// ============================================================================

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
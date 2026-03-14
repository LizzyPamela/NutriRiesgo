import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inyectar el token de Supabase en cada request automáticamente
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return config;
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

export const recomendarAlimentos = async (consulta: string, userId?: string) => {
  const response = await api.post('/alimentos/recomendar', {
    consulta,
    user_id: userId || null,
  });
  return response.data;
};

// ============================================================================
// EXÁMENES MÉDICOS
// ============================================================================

export const guardarResultadoExamen = async (
  userId: string,
  datos: { examen_id: string; valor: number; fecha: string; interpretacion: string }
) => {
  const response = await api.post(`/examenes/${userId}`, datos);
  return response.data;
};

export const obtenerHistorialExamenes = async (userId: string) => {
  const response = await api.get(`/examenes/${userId}`);
  return response.data;
};

export const eliminarResultadoExamen = async (
  userId: string,
  examenId: string,
  fecha: string
) => {
  const response = await api.delete(`/examenes/${userId}/${examenId}/${fecha}`);
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

export const obtenerAlimentosFrecuentes = async (
  userId: string,
  tiempoComida?: string,
  limite = 5
) => {
  const response = await api.get(`/comidas/frecuentes/${userId}`, {
    params: { tiempo_comida: tiempoComida, limite },
  });
  return response.data;
};

// ============================================================================
// PROYECCIONES ECNT
// ============================================================================

export const obtenerProyecciones = async (userId: string) => {
  const response = await api.get(`/proyecciones/${userId}`, { timeout: 8000 });
  return response.data;
};

export const obtenerEvidenciaProyeccion = async (enfermedad: string) => {
  const response = await api.get(`/proyecciones/evidencia/${enfermedad}`, { timeout: 15000 });
  return response.data;
};

// ============================================================================
// ADMIN
// ============================================================================

export const obtenerResumenAdmin = async () => {
  const response = await api.get('/admin/resumen');
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
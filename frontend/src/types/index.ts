// ============================================================================
// TIPOS DE RESPUESTAS DE LA API
// ============================================================================

export interface ConsultaResponse {
  respuesta: string;
  abstension: boolean;
  derivacion: boolean;
  nivel_confianza: 'alto' | 'medio' | 'bajo';
  chunks_utilizados: ChunkRecuperado[];
  tipo_consulta: string;
  tiempo_respuesta_ms: number;
  costo_estimado_usd: number;
  mensaje_abstension: string | null;
  razon_derivacion: string | null;
  conversation_id: string;
  timestamp: string;
}

export interface ChunkRecuperado {
  texto: string;
  autoridad: string;
  seccion: string;
  similitud: number;
}

export interface Alimento {
  id: string;
  nombre: string;
  categoria: string;
  fuente: string;
  es_alimento_hondureno: boolean;
  energia_kcal: number;
  proteina_g: number;
  grasa_g: number;
  carbohidratos_g: number;
  fibra_g?: number;
  sodio_mg?: number;
  calcio_mg?: number;
  hierro_mg?: number;
  vitamina_a_ug?: number;
  vitamina_c_mg?: number;
}

export interface BusquedaAlimentosResponse {
  alimentos: Alimento[];
  total_encontrados: number;
  termino_busqueda: string;
  filtros_aplicados: {
    categoria?: string;
    solo_hondurenos: boolean;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  dependencies: {
    database: {
      healthy: boolean;
      message: string;
    };
    embeddings: {
      healthy: boolean;
      message: string;
    };
    openai: {
      configured: boolean;
      model: string;
    };
  };
}

export interface Conversacion {
  id: string;
  user_id: string | null;
  consulta: string;
  respuesta: string;
  chunks_recuperados: ChunkRecuperado[];
  abstension: boolean;
  derivacion: boolean;
  nivel_confianza: string;
  tipo_consulta: string;
  tiempo_respuesta_ms: number;
  costo_usd: number;
  created_at: string;
}

export interface PerfilUsuario {
  user_id: string;
  edad: number;
  sexo: 'M' | 'F';
  peso_kg: number;
  altura_cm: number;
  imc: number;
  nivel_actividad: 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy_activo';
  objetivo: 'mantener' | 'perder' | 'ganar';
  condiciones_salud: string[];
  alergias: string[];
  preferencias_alimentarias: string[];
  riesgo_cardiovascular: number;
  created_at: string;
  updated_at: string;
}

export interface RegistroComida {
  id: string;
  user_id: string;
  tipo_comida: 'desayuno' | 'almuerzo' | 'cena' | 'snack';
  alimentos: {
    alimento_id: string;
    nombre: string;
    cantidad_g: number;
  }[];
  fecha: string;
  notas: string | null;
  created_at: string;
}

// ============================================================================
// TIPOS DE COMPONENTES
// ============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  abstension?: boolean;
  derivacion?: boolean;
  nivel_confianza?: 'alto' | 'medio' | 'bajo';
  chunks_utilizados?: ChunkRecuperado[];
}
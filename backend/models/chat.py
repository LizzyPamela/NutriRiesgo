"""
Modelos Pydantic para el sistema de chat RAG
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============================================================================
# ENUMS
# ============================================================================

class TipoConsulta(str, Enum):
    """Tipos de consulta soportados"""
    NUTRICIONAL = "nutricional"
    RIESGO_CARDIOVASCULAR = "riesgo_cardiovascular"
    ALIMENTOS = "alimentos"
    GENERAL = "general"
    CONSULTA_MEDICA = "consulta_medica"
    ERROR = "error"

class NivelConfianza(str, Enum):
    """Nivel de confianza de la respuesta"""
    ALTO = "alto"
    MEDIO = "medio"
    BAJO = "bajo"

# ============================================================================
# REQUEST MODELS
# ============================================================================

class ConsultaRequest(BaseModel):
    """Request para una consulta al sistema RAG"""
    consulta: str = Field(..., min_length=3, max_length=500, description="Pregunta del usuario")
    user_id: Optional[str] = Field(None, description="ID del usuario (opcional)")
    incluir_contexto_perfil: bool = Field(False, description="Incluir datos del perfil en el contexto")
    
    @validator('consulta')
    def validar_consulta(cls, v):
        """Valida que la consulta no esté vacía"""
        v = v.strip()
        if not v:
            raise ValueError("La consulta no puede estar vacía")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "consulta": "¿Cuántas porciones de frutas debo consumir al día?",
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "incluir_contexto_perfil": False
            }
        }

class BusquedaAlimentosRequest(BaseModel):
    """Request para búsqueda de alimentos"""
    termino: str = Field(..., min_length=2, max_length=100, description="Término de búsqueda")
    categoria: Optional[str] = Field(None, description="Filtrar por categoría")
    solo_hondurenos: bool = Field(False, description="Solo alimentos hondureños/INCAP")
    limite: int = Field(10, ge=1, le=50, description="Número máximo de resultados")
    
    class Config:
        json_schema_extra = {
            "example": {
                "termino": "mango",
                "categoria": "frutas",
                "solo_hondurenos": True,
                "limite": 10
            }
        }

# ============================================================================
# RESPONSE MODELS
# ============================================================================

class ChunkRecuperado(BaseModel):
    """Chunk de conocimiento recuperado"""
    texto: str
    autoridad: str
    seccion: Optional[str] = None
    similitud: float = Field(..., ge=0, le=1, description="Score de similitud")
    
    class Config:
        json_schema_extra = {
            "example": {
                "texto": "La OMS recomienda consumir al menos 400g de frutas y verduras al día...",
                "autoridad": "OMS",
                "seccion": "Alimentación saludable",
                "similitud": 0.85
            }
        }

class ConsultaResponse(BaseModel):
    """Response de una consulta al sistema RAG"""
    respuesta: str = Field(..., description="Respuesta generada por el sistema")
    abstension: bool = Field(..., description="Si el sistema se abstuvo de responder")
    derivacion: bool = Field(..., description="Si se recomienda derivación médica")
    nivel_confianza: NivelConfianza = Field(..., description="Nivel de confianza de la respuesta")
    
    chunks_utilizados: List[ChunkRecuperado] = Field(default_factory=list, description="Chunks RAG utilizados")
    tipo_consulta: TipoConsulta = Field(..., description="Tipo de consulta detectado")
    
    tiempo_respuesta_ms: int = Field(..., description="Tiempo de procesamiento en ms")
    costo_estimado_usd: float = Field(..., description="Costo estimado en USD")
    
    mensaje_abstension: Optional[str] = Field(None, description="Mensaje si hubo abstención")
    razon_derivacion: Optional[str] = Field(None, description="Razón de derivación si aplica")
    
    conversation_id: Optional[str] = Field(None, description="ID de la conversación guardada")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "respuesta": "La OMS recomienda consumir al menos 5 porciones de frutas y verduras al día...",
                "abstension": False,
                "derivacion": False,
                "nivel_confianza": "alto",
                "chunks_utilizados": [
                    {
                        "texto": "La OMS recomienda...",
                        "autoridad": "OMS",
                        "seccion": "Guías alimentarias",
                        "similitud": 0.85
                    }
                ],
                "tipo_consulta": "nutricional",
                "tiempo_respuesta_ms": 1250,
                "costo_estimado_usd": 0.002,
                "conversation_id": "conv_123",
                "timestamp": "2026-03-10T14:30:00Z"
            }
        }

class AlimentoResponse(BaseModel):
    """Response de información de un alimento"""
    id: str
    nombre: str
    categoria: str
    fuente: str
    es_alimento_hondureno: bool
    
    # Nutrientes (por 100g)
    energia_kcal: Optional[float] = None
    proteina_g: Optional[float] = None
    grasa_g: Optional[float] = None
    carbohidratos_g: Optional[float] = None
    fibra_g: Optional[float] = None
    
    calcio_mg: Optional[float] = None
    hierro_mg: Optional[float] = None
    sodio_mg: Optional[float] = None
    vitamina_c_mg: Optional[float] = None

    completitud_datos: Optional[float] = Field(None, description="% de completitud de datos nutricionales")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "ALI00001",
                "nombre": "Tortilla de maíz",
                "categoria": "cereales",
                "fuente": "INCAP",
                "es_alimento_hondureno": True,
                "energia_kcal": 218.0,
                "proteina_g": 5.7,
                "grasa_g": 1.1,
                "carbohidratos_g": 45.7,
                "fibra_g": 5.2,
                "calcio_mg": 180.0,
                "hierro_mg": 1.2,
                "sodio_mg": 5.0,
                "completitud_datos": 85.5
            }
        }

class BusquedaAlimentosResponse(BaseModel):
    """Response de búsqueda de alimentos"""
    alimentos: List[AlimentoResponse]
    total_encontrados: int
    termino_busqueda: str
    filtros_aplicados: dict
    
    class Config:
        json_schema_extra = {
            "example": {
                "alimentos": [
                    {
                        "id": "ALI00003",
                        "nombre": "Mango",
                        "categoria": "frutas",
                        "fuente": "INCAP",
                        "es_alimento_hondureno": True,
                        "energia_kcal": 60.0,
                        "proteina_g": 0.8,
                        "grasa_g": 0.4,
                        "carbohidratos_g": 15.0
                    }
                ],
                "total_encontrados": 1,
                "termino_busqueda": "mango",
                "filtros_aplicados": {
                    "categoria": "frutas",
                    "solo_hondurenos": True
                }
            }
        }

# ============================================================================
# INTERNAL MODELS
# ============================================================================

class RAGContext(BaseModel):
    """Contexto interno para el sistema RAG"""
    chunks: List[ChunkRecuperado]
    query_embedding: List[float]
    user_profile: Optional[dict] = None
    
class PromptTemplate(BaseModel):
    """Template para prompts de OpenAI"""
    system_prompt: str
    user_prompt: str
    chunks_context: str
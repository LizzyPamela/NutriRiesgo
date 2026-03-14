"""
Servicio RAG completo - Orquesta todo el pipeline
"""

from typing import Dict, List, Optional, Tuple
import asyncio
import time

# Servicios (se importarán los que creamos)
from services.embeddings_service import get_embeddings_service
from services.abstention_service import get_abstention_service
from services.openai_service import get_openai_service
from utils.database import (
    buscar_conocimiento_semantico,
    guardar_conversacion,
    obtener_perfil_usuario,
    registrar_log_sistema
)

class RAGService:
    """Servicio principal del sistema RAG"""
    
    def __init__(self):
        """Inicializa el servicio RAG"""
        self.embeddings_service = get_embeddings_service()
        self.abstention_service = get_abstention_service()
        self.openai_service = get_openai_service()
        
        self.top_k_chunks = 4
        self.min_similarity = 0.25
        
        print("✅ RAG Service inicializado")
    
    def _log(self, nivel: str, mensaje: str, detalles: dict = None):
        """Registra log en BD sin lanzar excepción si falla."""
        detalles_safe = None
        if detalles:
            detalles_safe = {
                k: str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v
                for k, v in detalles.items()
            }
        try:
            registrar_log_sistema(
                nivel,
                mensaje,
                detalles_safe,
                componente="rag_service",
            )
        except Exception as e:
            print(f"[LOG FALLIDO] {nivel}: {e}")

    async def procesar_consulta(
        self,
        consulta: str,
        user_id: Optional[str] = None,
        incluir_contexto_perfil: bool = False
    ) -> Dict:
        """
        Procesa una consulta completa usando el pipeline RAG
        
        Args:
            consulta: Pregunta del usuario
            user_id: ID del usuario (opcional)
            incluir_contexto_perfil: Si incluir datos del perfil
        
        Returns:
            Diccionario con la respuesta completa
        """
        inicio = time.time()
        
        # 1. Verificar abstención
        debe_abstenerse, razon_abstension = self.abstention_service.debe_abstenerse(consulta)
        
        if debe_abstenerse:
            mensaje = self.abstention_service.generar_mensaje_abstension(razon_abstension)
            tiempo_ms = int((time.time() - inicio) * 1000)

            self._log("warning", "Abstencion activada", {
                "razon": razon_abstension,
                "consulta_preview": consulta[:80],
                "user_id": user_id,
                "tiempo_ms": tiempo_ms
            })

            return {
                "respuesta": mensaje,
                "abstension": True,
                "derivacion": False,
                "nivel_confianza": "alto",
                "chunks_utilizados": [],
                "tipo_consulta": "consulta_medica",
                "tiempo_respuesta_ms": tiempo_ms,
                "costo_estimado_usd": 0.0,
                "mensaje_abstension": razon_abstension,
                "conversation_id": None
            }
        
        # 2. Obtener perfil del usuario (si está disponible)
        perfil_usuario = None
        if user_id and incluir_contexto_perfil:
            perfil_usuario = obtener_perfil_usuario(user_id)
        
        # 3. Verificar derivación por perfil
        requiere_derivacion = False
        razon_derivacion = None
        
        if perfil_usuario:
            imc = perfil_usuario.get('imc')
            riesgo = perfil_usuario.get('riesgo_prevent')
            
            requiere_derivacion, razon_derivacion = self.abstention_service.requiere_derivacion(
                consulta, imc, riesgo
            )
        
        # 4. Generar embedding de la consulta
        try:
            query_embedding = self.embeddings_service.generar_embedding(consulta)
        except Exception as e:
            print(f"❌ Error generando embedding: {str(e)}")
            return self._generar_respuesta_error("Error procesando la consulta")
        
        # 5. Buscar chunks relevantes
        try:
            chunks_raw = buscar_conocimiento_semantico(
                query_embedding=query_embedding,
                limite=self.top_k_chunks,
                nivel_evidencia_min='medio'
            )
        except Exception as e:
            print(f"❌ Error en búsqueda vectorial: {str(e)}")
            return self._generar_respuesta_error("Error buscando información")
        
        # 6. Filtrar por similitud mínima
        chunks_filtrados = [
            chunk for chunk in chunks_raw
            if chunk.get('similitud', 0) >= self.min_similarity
        ]
        
        # 7. Preparar chunks para respuesta
        chunks_utilizados = [
            {
                "texto": chunk['texto'],
                "autoridad": chunk['autoridad'],
                "seccion": chunk.get('seccion'),
                "similitud": float(chunk['similitud'])
            }
            for chunk in chunks_filtrados
        ]
        
        # 8. Generar respuesta con OpenAI
        try:
            respuesta, tokens_usados, costo_usd = self.openai_service.generar_respuesta(
                consulta=consulta,
                chunks_contexto=chunks_utilizados,
                perfil_usuario=perfil_usuario
            )
        except Exception as e:
            print(f"❌ Error en OpenAI: {str(e)}")
            return self._generar_respuesta_error("Error generando respuesta")
        
        # 9. Determinar nivel de confianza
        nivel_confianza = self._calcular_nivel_confianza(chunks_filtrados)
        
        # 10. Clasificar tipo de consulta
        tipo_consulta = self._clasificar_consulta(consulta, chunks_utilizados)
        
        # 11. Agregar mensaje de derivación si aplica
        if requiere_derivacion:
            mensaje_derivacion = self.abstention_service.generar_mensaje_derivacion(razon_derivacion)
            respuesta = f"{respuesta}\n\n{mensaje_derivacion}"
            self._log("warning", "Derivacion medica requerida", {
                "razon": razon_derivacion,
                "user_id": user_id,
                "imc": perfil_usuario.get("imc") if perfil_usuario else None
            })
        
        # 12. Guardar conversación en thread (sync DB no puede bloquear el event loop)
        tiempo_ms = int((time.time() - inicio) * 1000)

        def _guardar():
            return guardar_conversacion(
                user_id=user_id,
                consulta=consulta,
                respuesta=respuesta,
                chunks_recuperados=chunks_utilizados,
                abstension=False,
                derivacion=requiere_derivacion,
                nivel_confianza=nivel_confianza,
                tipo_consulta=tipo_consulta,
                tiempo_respuesta_ms=tiempo_ms,
                costo_usd=costo_usd
            )

        try:
            loop = asyncio.get_running_loop()
            conversation_id = await asyncio.wait_for(
                loop.run_in_executor(None, _guardar),
                timeout=5.0
            )
        except Exception as e:
            print(f"⚠️  Error guardando conversación: {type(e).__name__}: {str(e)}")
            conversation_id = None

        self._log("info", "Consulta procesada", {
            "tipo_consulta": tipo_consulta,
            "tiempo_ms": tiempo_ms,
            "costo_usd": costo_usd,
            "num_chunks": len(chunks_filtrados),
            "nivel_confianza": nivel_confianza,
            "derivacion": requiere_derivacion,
            "user_id": user_id,
            "conversation_id": conversation_id
        })

        # 13. Retornar respuesta completa
        return {
            "respuesta": respuesta,
            "abstension": False,
            "derivacion": requiere_derivacion,
            "nivel_confianza": nivel_confianza,
            "chunks_utilizados": chunks_utilizados,
            "tipo_consulta": tipo_consulta,
            "tiempo_respuesta_ms": tiempo_ms,
            "costo_estimado_usd": costo_usd,
            "razon_derivacion": razon_derivacion if requiere_derivacion else None,
            "conversation_id": conversation_id,
            "metadata": {
                "num_chunks_encontrados": len(chunks_raw),
                "num_chunks_utilizados": len(chunks_filtrados),
                "tokens_usados": tokens_usados
            }
        }
    
    def _calcular_nivel_confianza(self, chunks: List[Dict]) -> str:
        """
        Calcula el nivel de confianza basado en los chunks recuperados
        
        Args:
            chunks: Chunks recuperados
        
        Returns:
            'alto', 'medio' o 'bajo'
        """
        if not chunks:
            return "bajo"
        
        # Similitud promedio
        similitudes = [chunk.get('similitud', 0) for chunk in chunks]
        similitud_promedio = sum(similitudes) / len(similitudes)
        
        if similitud_promedio >= 0.7:
            return "alto"
        elif similitud_promedio >= 0.5:
            return "medio"
        else:
            return "bajo"
    
    def _clasificar_consulta(self, consulta: str, chunks: List[Dict]) -> str:
        """
        Clasifica el tipo de consulta
        
        Args:
            consulta: Consulta del usuario
            chunks: Chunks utilizados
        
        Returns:
            Tipo de consulta
        """
        consulta_lower = consulta.lower()
        
        # Clasificación basada en palabras clave
        if any(word in consulta_lower for word in ["alimento", "comida", "comer", "nutriente"]):
            return "alimentos"
        
        if any(word in consulta_lower for word in ["riesgo", "cardiovascular", "corazón", "presión"]):
            return "riesgo_cardiovascular"
        
        if any(word in consulta_lower for word in ["dieta", "nutrición", "saludable", "balanceada"]):
            return "nutricional"
        
        return "general"
    
    def _generar_respuesta_error(self, mensaje: str) -> Dict:
        """Genera una respuesta de error estándar"""
        self._log("error", mensaje)
        return {
            "respuesta": f"⚠️ {mensaje}. Por favor, intenta de nuevo.",
            "abstension": False,
            "derivacion": False,
            "nivel_confianza": "bajo",
            "chunks_utilizados": [],
            "tipo_consulta": "error",
            "tiempo_respuesta_ms": 0,
            "costo_estimado_usd": 0.0,
            "conversation_id": None
        }

# Singleton global
_rag_service = None

def get_rag_service() -> RAGService:
    """Obtiene la instancia singleton del servicio RAG"""
    global _rag_service
    
    if _rag_service is None:
        _rag_service = RAGService()
    
    return _rag_service
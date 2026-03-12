"""
Servicio de OpenAI para generación de respuestas
"""

from openai import OpenAI
from typing import List, Dict, Tuple
import os
from dotenv import load_dotenv

load_dotenv()

class OpenAIService:
    """Servicio para interactuar con la API de OpenAI"""
    
    def __init__(
        self,
        api_key: str = None,
        model: str = "gpt-4o-mini",
        temperature: float = 0.3,
        max_tokens: int = 800
    ):
        """
        Inicializa el servicio de OpenAI
        
        Args:
            api_key: API key de OpenAI
            model: Modelo a usar (gpt-4, gpt-3.5-turbo)
            temperature: Temperatura para generación
            max_tokens: Máximo de tokens en respuesta
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY no configurada")
        
        self.client = OpenAI(api_key=self.api_key)
        print(f"✅ OpenAI service inicializado (modelo: {self.model})")
    
    def generar_respuesta(
        self,
        consulta: str,
        chunks_contexto: List[Dict],
        perfil_usuario: Dict = None
    ) -> Tuple[str, int, float]:
        """
        Genera una respuesta usando RAG
        
        Args:
            consulta: Pregunta del usuario
            chunks_contexto: Chunks recuperados del RAG
            perfil_usuario: Perfil del usuario (opcional)
        
        Returns:
            (respuesta, tokens_usados, costo_usd)
        """
        # Construir prompt del sistema
        system_prompt = self._construir_system_prompt()
        
        # Construir contexto de chunks
        contexto = self._construir_contexto_chunks(chunks_contexto)
        
        # Construir contexto de perfil
        contexto_perfil = ""
        if perfil_usuario:
            contexto_perfil = self._construir_contexto_perfil(perfil_usuario)
        
        # Construir prompt del usuario
        user_prompt = f"""
Contexto de conocimiento nutricional:
{contexto}

{contexto_perfil}

Pregunta del usuario:
{consulta}

Por favor, proporciona una respuesta clara, precisa y basada en evidencia.
"""
        
        # Llamar a OpenAI
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            respuesta = response.choices[0].message.content
            tokens_usados = response.usage.total_tokens
            costo_usd = self._calcular_costo(tokens_usados)
            
            return respuesta, tokens_usados, costo_usd
            
        except Exception as e:
            print(f"❌ Error en llamada a OpenAI: {str(e)}")
            raise
    
    def _construir_system_prompt(self) -> str:
        """Construye el prompt del sistema"""
        return """Eres NutriBot, asistente de orientación nutricional de la UNAH para Honduras.

INSTRUCCIONES:
1. Usa el contexto provisto como fuente principal. Si el contexto cubre la pregunta, cita la autoridad: (OMS), (INCAP), (SESAL), etc.
2. Si el contexto no cubre la pregunta directamente, usa tu conocimiento nutricional general — pero indica que es conocimiento general y recomienda confirmar con un profesional.
3. Solo di "No tengo información sobre eso" si la pregunta es completamente ajena a nutrición o salud.
4. NUNCA des diagnósticos, prescripciones médicas ni interpretes resultados clínicos de laboratorio.
5. Respuestas concisas: máximo 3-4 párrafos o una lista corta. Sin relleno ni repetición.
6. Prioriza alimentos accesibles en Honduras: frijoles, arroz, maíz, plátano, güisquil, loroco, etc.
7. Si el usuario menciona síntomas específicos o condición médica diagnosticada, recomienda consultar un nutricionista o médico.
8. Tono: directo, amigable, sin tecnicismos innecesarios.

Eres un sistema de ORIENTACIÓN nutricional preventiva, no un sustituto de atención médica."""
    
    def _construir_contexto_chunks(self, chunks: List[Dict]) -> str:
        """Construye el contexto a partir de los chunks"""
        if not chunks:
            return "No se encontró información específica en la base de conocimiento."
        
        contexto_parts = []
        for i, chunk in enumerate(chunks, 1):
            texto = chunk.get('texto', '')
            autoridad = chunk.get('autoridad', 'Desconocida')
            seccion = chunk.get('seccion', '')
            
            parte = f"""
[Fuente {i}] {autoridad}
{f'Sección: {seccion}' if seccion else ''}
{texto}
"""
            contexto_parts.append(parte)
        
        return "\n---\n".join(contexto_parts)
    
    def _construir_contexto_perfil(self, perfil: Dict) -> str:
        """Construye el contexto del perfil del usuario"""
        if not perfil:
            return ""
        
        edad = perfil.get('edad')
        sexo = perfil.get('sexo')
        imc = perfil.get('imc')
        categoria_riesgo = perfil.get('categoria_riesgo')
        
        contexto = "\nContexto del usuario:\n"
        
        if edad:
            contexto += f"- Edad: {edad} años\n"
        if sexo:
            contexto += f"- Sexo: {sexo}\n"
        if imc:
            contexto += f"- IMC: {imc:.1f}\n"
        if categoria_riesgo:
            contexto += f"- Categoría de riesgo: {categoria_riesgo}\n"
        
        contexto += "\nConsidera esta información al dar recomendaciones personalizadas.\n"
        
        return contexto
    
    def _calcular_costo(self, tokens: int) -> float:
        """
        Calcula el costo estimado de la llamada
        
        Precios aproximados (marzo 2024):
        - GPT-4: $0.03 / 1K tokens input, $0.06 / 1K tokens output
        - GPT-3.5-turbo: $0.0015 / 1K tokens
        """
        if "gpt-4" in self.model:
            # Aproximación: 60% input, 40% output
            costo = (tokens * 0.6 * 0.03 + tokens * 0.4 * 0.06) / 1000
        else:  # gpt-3.5-turbo
            costo = tokens * 0.0015 / 1000
        
        return round(costo, 6)

# Singleton global
_openai_service = None

def get_openai_service() -> OpenAIService:
    """Obtiene la instancia singleton del servicio de OpenAI"""
    global _openai_service
    
    if _openai_service is None:
        _openai_service = OpenAIService()
    
    return _openai_service
"""
Servicio de abstención y detección de necesidad de derivación médica
"""

from typing import Tuple, Optional
import re

class AbstentionService:
    """Servicio para determinar cuándo el sistema debe abstenerse de responder"""
    
    # Palabras clave que indican consulta médica
    KEYWORDS_MEDICAS = [
        # Tratamientos
        "tratamiento", "medicamento", "medicina", "pastilla", "dosis",
        "prescripción", "receta", "antibiótico", "cirugía", "operación",
        
        # Diagnósticos
        "diagnóstico", "diagnosticar", "tengo", "padezco", "sufro",
        "me duele", "dolor", "síntoma", "enfermo",
        
        # Condiciones graves
        "cáncer", "tumor", "insuficiencia", "infarto", "derrame",
        "diabetes tipo 1", "diabetes tipo 2", "hipertensión severa",
        
        # Emergencias
        "emergencia", "urgencia", "grave", "crítico",
        
        # Poblaciones vulnerables
        "embarazada", "lactancia", "bebé", "recién nacido",
        
        # Profesionales
        "doctor", "médico", "especialista", "nutriólogo", "cardiólogo"
    ]
    
    # Patrones de preguntas médicas
    PATRONES_MEDICOS = [
        r"qué medicina.*tomar",
        r"qué medicamento.*para",
        r"cómo se cura",
        r"cómo tratar",
        r"tengo.*qué hago",
        r"me diagnosticaron",
        r"estoy enferm[oa]",
    ]
    
    # Umbrales de derivación por IMC
    IMC_OBESIDAD_SEVERA = 35.0
    IMC_OBESIDAD_MORBIDA = 40.0
    
    # Umbral de riesgo cardiovascular
    RIESGO_ALTO = 0.20  # 20%
    
    def debe_abstenerse(self, consulta: str) -> Tuple[bool, Optional[str]]:
        """
        Determina si el sistema debe abstenerse de responder
        
        Args:
            consulta: Consulta del usuario
        
        Returns:
            (debe_abstenerse, razon)
        """
        consulta_lower = consulta.lower()
        
        # 1. Detectar palabras clave médicas
        for keyword in self.KEYWORDS_MEDICAS:
            if keyword in consulta_lower:
                return True, f"Consulta requiere atención médica profesional (keyword: {keyword})"
        
        # 2. Detectar patrones médicos
        for patron in self.PATRONES_MEDICOS:
            if re.search(patron, consulta_lower):
                return True, f"Consulta requiere atención médica profesional (patrón médico detectado)"
        
        # 3. Detectar solicitud de diagnóstico
        if self._es_solicitud_diagnostico(consulta_lower):
            return True, "No puedo realizar diagnósticos médicos"
        
        # 4. Detectar solicitud de prescripción
        if self._es_solicitud_prescripcion(consulta_lower):
            return True, "No puedo prescribir medicamentos ni tratamientos"
        
        return False, None
    
    def requiere_derivacion(
        self,
        consulta: str,
        imc: Optional[float] = None,
        riesgo_cardiovascular: Optional[float] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Determina si el usuario requiere derivación a profesional de salud
        
        Args:
            consulta: Consulta del usuario
            imc: IMC del usuario (si disponible)
            riesgo_cardiovascular: Riesgo cardiovascular (si disponible)
        
        Returns:
            (requiere_derivacion, razon)
        """
        razones = []
        
        # 1. Derivación por IMC
        if imc is not None:
            if imc >= self.IMC_OBESIDAD_MORBIDA:
                razones.append(f"IMC de {imc:.1f} indica obesidad mórbida")
            elif imc >= self.IMC_OBESIDAD_SEVERA:
                razones.append(f"IMC de {imc:.1f} indica obesidad severa")
        
        # 2. Derivación por riesgo cardiovascular
        if riesgo_cardiovascular is not None:
            if riesgo_cardiovascular >= self.RIESGO_ALTO:
                razones.append(f"Riesgo cardiovascular alto ({riesgo_cardiovascular*100:.1f}%)")
        
        # 3. Derivación por contenido de la consulta
        consulta_lower = consulta.lower()
        
        if any(keyword in consulta_lower for keyword in ["dolor", "síntoma", "malestar"]):
            razones.append("Presencia de síntomas que requieren evaluación médica")
        
        if razones:
            return True, "; ".join(razones)
        
        return False, None
    
    def _es_solicitud_diagnostico(self, consulta: str) -> bool:
        """Detecta si es una solicitud de diagnóstico"""
        patrones_diagnostico = [
            r"qué tengo",
            r"qué me pasa",
            r"estoy enferm[oa]",
            r"qué enfermedad",
            r"tengo.*enfermedad",
        ]
        
        return any(re.search(p, consulta) for p in patrones_diagnostico)
    
    def _es_solicitud_prescripcion(self, consulta: str) -> bool:
        """Detecta si es una solicitud de prescripción"""
        patrones_prescripcion = [
            r"qué medicina.*tomar",
            r"qué medicamento.*usar",
            r"cuánto.*dosis",
            r"receta para",
        ]
        
        return any(re.search(p, consulta) for p in patrones_prescripcion)
    
    def generar_mensaje_abstension(self, razon: str) -> str:
        """
        Genera un mensaje amigable de abstención
        
        Args:
            razon: Razón de la abstención
        
        Returns:
            Mensaje para el usuario
        """
        mensaje_base = (
            "⚕️ Tu consulta requiere la atención de un profesional de salud.\n\n"
            "Como sistema de orientación nutricional, no puedo:\n"
            "• Realizar diagnósticos médicos\n"
            "• Prescribir medicamentos o tratamientos\n"
            "• Atender emergencias médicas\n\n"
            "Te recomiendo consultar con:\n"
            "• Tu médico de cabecera\n"
            "• Un nutricionista certificado\n"
            "• Servicios de salud de UNAH\n\n"
            "Para consultas sobre alimentación saludable y prevención, "
            "estaré encantado de ayudarte. 😊"
        )
        
        return mensaje_base
    
    def generar_mensaje_derivacion(self, razon: str) -> str:
        """
        Genera un mensaje de derivación
        
        Args:
            razon: Razón de la derivación
        
        Returns:
            Mensaje para el usuario
        """
        mensaje = (
            f"🏥 Recomendación importante:\n\n"
            f"Basado en tu perfil ({razon}), te recomiendo consultar con "
            f"un profesional de salud para una evaluación personalizada.\n\n"
            f"Puedes acudir a:\n"
            f"• Servicios médicos de UNAH\n"
            f"• Centro de salud más cercano\n"
            f"• Nutricionista certificado\n\n"
            f"Mientras tanto, puedo ayudarte con orientación general sobre "
            f"alimentación saludable. ¿En qué más puedo asistirte?"
        )
        
        return mensaje

# Singleton global
_abstention_service = None

def get_abstention_service() -> AbstentionService:
    """Obtiene la instancia singleton del servicio de abstención"""
    global _abstention_service
    
    if _abstention_service is None:
        _abstention_service = AbstentionService()
    
    return _abstention_service
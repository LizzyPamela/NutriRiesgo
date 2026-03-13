"""
Servicio de generación de embeddings usando OpenAI API
"""

from openai import OpenAI
from typing import List
import numpy as np
import os


EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536


class EmbeddingsService:
    """Servicio para generar embeddings de texto usando OpenAI"""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.dimension = EMBEDDING_DIMENSION
        print(f"OK: EmbeddingsService listo (modelo: {EMBEDDING_MODEL}, dim: {self.dimension})")

    def generar_embedding(self, texto: str) -> List[float]:
        if not texto or not texto.strip():
            raise ValueError("El texto no puede estar vacío")

        response = self.client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texto.strip()
        )
        return response.data[0].embedding

    def generar_embeddings_batch(self, textos: List[str]) -> List[List[float]]:
        if not textos:
            return []

        response = self.client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=textos
        )
        ordered = sorted(response.data, key=lambda x: x.index)
        return [e.embedding for e in ordered]

    def calcular_similitud(self, embedding1: List[float], embedding2: List[float]) -> float:
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(dot_product / (norm1 * norm2))


# Singleton global
_embeddings_service = None


def get_embeddings_service() -> EmbeddingsService:
    """Obtiene la instancia singleton del servicio de embeddings"""
    global _embeddings_service

    if _embeddings_service is None:
        _embeddings_service = EmbeddingsService()

    return _embeddings_service

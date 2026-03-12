"""
Servicio de generación de embeddings
"""

from sentence_transformers import SentenceTransformer
from typing import List
from functools import lru_cache
import numpy as np


class EmbeddingsService:
    """Servicio para generar embeddings de texto"""

    def __init__(self, model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        """
        Inicializa el servicio de embeddings

        Args:
            model_name: Nombre del modelo de sentence-transformers
        """
        print(f"Cargando modelo de embeddings: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.dimension = 384  # Dimensión del modelo
        print(f"OK: Modelo cargado (dimension: {self.dimension})")

    def generar_embedding(self, texto: str) -> List[float]:
        """
        Genera embedding para un texto (con cache LRU de 100 entradas).

        Args:
            texto: Texto a embedear

        Returns:
            Lista de 384 floats representando el embedding
        """
        if not texto or not texto.strip():
            raise ValueError("El texto no puede estar vacío")

        return list(_embedding_cached(self, texto.strip()))

    def generar_embeddings_batch(self, textos: List[str]) -> List[List[float]]:
        """
        Genera embeddings para múltiples textos (batch)

        Args:
            textos: Lista de textos

        Returns:
            Lista de embeddings
        """
        if not textos:
            return []

        embeddings = self.model.encode(
            textos,
            batch_size=32,
            show_progress_bar=False,
            convert_to_numpy=True
        )

        return embeddings.tolist()

    def calcular_similitud(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calcula similitud coseno entre dos embeddings

        Args:
            embedding1: Primer embedding
            embedding2: Segundo embedding

        Returns:
            Similitud entre 0 y 1
        """
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(dot_product / (norm1 * norm2))


@lru_cache(maxsize=100)
def _embedding_cached(service: EmbeddingsService, texto: str) -> tuple:
    """Cache LRU para embeddings. Devuelve tuple (hashable) para que lru_cache funcione."""
    embedding = service.model.encode(texto, convert_to_numpy=True)
    return tuple(embedding.tolist())


# Singleton global
_embeddings_service = None


def get_embeddings_service() -> EmbeddingsService:
    """Obtiene la instancia singleton del servicio de embeddings"""
    global _embeddings_service

    if _embeddings_service is None:
        _embeddings_service = EmbeddingsService()

    return _embeddings_service

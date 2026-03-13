"""
Script para generar embeddings de chunks y cargarlos en Supabase
Usa OpenAI text-embedding-3-small (1536 dims)
IMPORTANTE: Ejecutar localmente, no en Render.
"""

import os
import sys
import json
from pathlib import Path

root_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(root_dir))

from dotenv import load_dotenv
import psycopg2
from pgvector.psycopg2 import register_vector
from psycopg2.extras import execute_batch
from openai import OpenAI
from tqdm import tqdm

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CHUNKS_FILE = "data/processed/chunks_guias.json"
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536

print("=" * 70)
print("GENERACION E INDEXACION DE EMBEDDINGS (OpenAI)")
print("=" * 70)

# Inicializar cliente OpenAI
client = OpenAI(api_key=OPENAI_API_KEY)
print(f"\nOK: OpenAI client listo (modelo: {EMBEDDING_MODEL}, dim: {EMBEDDING_DIMENSION})")

# Leer chunks
print(f"\nCargando: {CHUNKS_FILE}")

if not os.path.exists(CHUNKS_FILE):
    print(f"ERROR: No se encuentra {CHUNKS_FILE}")
    print(f"   Ubicacion actual: {os.getcwd()}")
    sys.exit(1)

with open(CHUNKS_FILE, 'r', encoding='utf-8') as f:
    chunks = json.load(f)

if isinstance(chunks, dict) and 'chunks' in chunks:
    chunks = chunks['chunks']

print(f"OK: {len(chunks):,} chunks cargados")

# Conectar a BD
print(f"\nConectando a Supabase...")
try:
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    cur = conn.cursor()
    print("OK: Conexion establecida")
except Exception as e:
    print(f"ERROR de conexion: {str(e)}")
    sys.exit(1)

# Actualizar dimension de la columna si es necesario
print("\nActualizando dimension de embeddings en BD (384 -> 1536)...")
try:
    cur.execute("""
        ALTER TABLE knowledge_base
        ALTER COLUMN embedding TYPE vector(1536)
    """)
    conn.commit()
    print("OK: Columna actualizada a vector(1536)")
except Exception as e:
    conn.rollback()
    print(f"INFO: {str(e)} (puede que ya sea 1536)")

# Limpiar tabla
print("\nLimpiando tabla knowledge_base...")
cur.execute("DELETE FROM knowledge_base")
conn.commit()
print("OK: Tabla limpia")


def limpiar_texto(texto):
    if texto is None:
        return ''
    texto_limpio = str(texto).replace('\x00', '').replace('\r\n', '\n').replace('\r', '\n')
    return texto_limpio.strip()


def generar_embeddings_batch(textos, batch_size=100):
    """Genera embeddings en batches usando OpenAI API"""
    all_embeddings = []
    for i in tqdm(range(0, len(textos), batch_size), desc="Generando embeddings"):
        batch = textos[i:i + batch_size]
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=batch
        )
        ordered = sorted(response.data, key=lambda x: x.index)
        all_embeddings.extend([e.embedding for e in ordered])
    return all_embeddings


# Generar embeddings
print(f"\nGenerando embeddings para {len(chunks)} chunks...")
textos = [limpiar_texto(chunk.get('texto', '')) for chunk in chunks]
embeddings = generar_embeddings_batch(textos)
print(f"OK: {len(embeddings)} embeddings generados")

# Preparar datos
print(f"\nPreparando datos para insercion...")
valores = []
errores = 0

for i, chunk in enumerate(tqdm(chunks, desc="Preparando")):
    try:
        metadatos = chunk.get('metadatos', {})
        texto = limpiar_texto(chunk.get('texto', ''))

        if not texto:
            errores += 1
            continue

        valores.append((
            texto,
            embeddings[i],
            limpiar_texto(metadatos.get('tipo', 'guia_oficial')),
            limpiar_texto(metadatos.get('autoridad', 'OMS')),
            'alto',
            limpiar_texto(metadatos.get('seccion', '')),
            limpiar_texto(metadatos.get('fecha', '2023')),
            'v2'
        ))
    except Exception as e:
        print(f"\nError preparando chunk {i}: {str(e)}")
        errores += 1

print(f"OK: {len(valores):,} registros preparados")
if errores > 0:
    print(f"WARN: {errores} chunks con errores (saltados)")

# Insertar
print(f"\nInsertando en base de datos...")
query = """
    INSERT INTO knowledge_base
    (texto, embedding, tipo_doc, autoridad, nivel_evidencia,
     seccion, fecha_publicacion, version_kb)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
"""

try:
    execute_batch(cur, query, valores, page_size=50)
    conn.commit()
    print("OK: Insercion completada")
except Exception as e:
    print(f"ERROR en insercion: {str(e)}")
    conn.rollback()
    sys.exit(1)

# Verificar
cur.execute("SELECT COUNT(*) FROM knowledge_base")
total = cur.fetchone()[0]
print(f"\nOK: {total:,} chunks indexados en BD con dimension {EMBEDDING_DIMENSION}")

# Probar busqueda
print(f"\nProbando busqueda vectorial...")
test_response = client.embeddings.create(model=EMBEDDING_MODEL, input="frutas y verduras recomendadas")
test_embedding = test_response.data[0].embedding

cur.execute("""
    SELECT
        LEFT(texto, 100) as preview,
        autoridad,
        1 - (embedding <=> %s::vector) as similitud
    FROM knowledge_base
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> %s::vector
    LIMIT 3
""", (test_embedding, test_embedding))

print("   Top 3 resultados:")
for preview, autoridad, similitud in cur.fetchall():
    print(f"   Similitud: {similitud:.3f} | {autoridad} | {preview[:80]}...")

cur.close()
conn.close()

print("\n" + "=" * 70)
print("INDEXACION COMPLETADA")
print("=" * 70)
print(f"OK: {total:,} chunks indexados con embeddings OpenAI ({EMBEDDING_DIMENSION} dims)")
print("OK: Haz commit y push para re-deployar en Render")

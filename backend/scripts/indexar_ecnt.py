"""
Indexa los chunks ECNT en la tabla knowledge_base de Supabase.
A diferencia de generar_embeddings.py, este script AGREGA (no borra) los registros,
evitando destruir los chunks de guías generales ya indexados.

Uso (desde raíz del proyecto):
    python backend/scripts/indexar_ecnt.py
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

try:
    from tqdm import tqdm
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "tqdm"])
    from tqdm import tqdm

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "sentence-transformers"])
    from sentence_transformers import SentenceTransformer

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
CHUNKS_FILE = root_dir / "data/processed/chunks_ecnt.json"

print("=" * 70)
print("INDEXACION CHUNKS ECNT -> knowledge_base")
print("=" * 70)

# ── Verificar chunks ──────────────────────────────────────────────────────────
if not CHUNKS_FILE.exists():
    print(f"ERROR: No se encuentra {CHUNKS_FILE}")
    print("Ejecuta primero:  python scripts/process_ecnt.py")
    sys.exit(1)

with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
    chunks = json.load(f)

print(f"  {len(chunks):,} chunks ECNT cargados")

# ── Modelo de embeddings ──────────────────────────────────────────────────────
print("\nCargando modelo sentence-transformers...")
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
print("  Modelo cargado (384 dimensiones)")

# ── Conexión ──────────────────────────────────────────────────────────────────
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no configurada en .env")
    sys.exit(1)

print("\nConectando a Supabase...")
conn = psycopg2.connect(DATABASE_URL)
register_vector(conn)
cur = conn.cursor()
print("  Conexion establecida")

# ── Verificar si ya existen chunks ECNT (evitar duplicados) ───────────────────
cur.execute("SELECT COUNT(*) FROM knowledge_base WHERE version_kb = 'ecnt_v1'")
existing = cur.fetchone()[0]

if existing > 0:
    resp = input(f"\nYa existen {existing} chunks ECNT en la BD. Reindexar? [s/N]: ").strip().lower()
    if resp != "s":
        print("Cancelado.")
        cur.close(); conn.close()
        sys.exit(0)
    cur.execute("DELETE FROM knowledge_base WHERE version_kb = 'ecnt_v1'")
    conn.commit()
    print(f"  {existing} chunks ECNT anteriores eliminados")

# ── Generar embeddings ────────────────────────────────────────────────────────
print(f"\nGenerando embeddings para {len(chunks)} chunks...")
textos = [c.get("texto", "") for c in chunks]
embeddings = model.encode(
    textos,
    batch_size=32,
    show_progress_bar=True,
    convert_to_numpy=True,
)
print(f"  {len(embeddings)} embeddings generados")


def limpiar(texto: str) -> str:
    if not texto:
        return ""
    return str(texto).replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n").strip()


# ── Preparar datos ────────────────────────────────────────────────────────────
valores = []
for i, chunk in enumerate(tqdm(chunks, desc="Preparando")):
    meta = chunk.get("metadatos", {})
    texto = limpiar(chunk.get("texto", ""))
    if not texto:
        continue
    valores.append((
        texto,
        embeddings[i].tolist(),
        limpiar(meta.get("tipo", "guia_clinica")),
        limpiar(meta.get("autoridad", "desconocido")),
        "alto",                          # nivel_evidencia
        limpiar(meta.get("seccion", "")),
        limpiar(meta.get("fecha", "2024")),
        "ecnt_v1",                       # version_kb — identifica estos chunks
    ))

print(f"  {len(valores)} registros preparados")

# ── Insertar ──────────────────────────────────────────────────────────────────
print(f"\nInsertando en knowledge_base (batches de 50)...")
query = """
    INSERT INTO knowledge_base
    (texto, embedding, tipo_doc, autoridad, nivel_evidencia,
     seccion, fecha_publicacion, version_kb)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
"""
try:
    execute_batch(cur, query, valores, page_size=50)
    conn.commit()
    print("  Insercion completada")
except Exception as e:
    conn.rollback()
    print(f"ERROR en insercion: {e}")
    cur.close(); conn.close()
    sys.exit(1)

# ── Verificar ─────────────────────────────────────────────────────────────────
cur.execute("SELECT COUNT(*) FROM knowledge_base WHERE version_kb = 'ecnt_v1'")
total_ecnt = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM knowledge_base")
total_kb = cur.fetchone()[0]

print(f"\nChunks ECNT indexados : {total_ecnt:,}")
print(f"Total knowledge_base  : {total_kb:,}")

# ── Prueba de búsqueda ────────────────────────────────────────────────────────
print("\nPrueba de busqueda vectorial ECNT...")
q = "factores de riesgo diabetes tipo 2 obesidad"
q_emb = model.encode(q)
cur.execute("""
    SELECT LEFT(texto, 120) AS preview, autoridad,
           1 - (embedding <=> %s::vector) AS similitud
    FROM knowledge_base
    WHERE version_kb = 'ecnt_v1'
    ORDER BY embedding <=> %s::vector
    LIMIT 3
""", (q_emb.tolist(), q_emb.tolist()))

print(f"  Query: '{q}'")
for row in cur.fetchall():
    print(f"  [{row[2]:.3f}] {row[1]} — {row[0]}...")

cur.close()
conn.close()

print("\n" + "=" * 70)
print("INDEXACION ECNT COMPLETADA")
print("=" * 70)
print(f"  {total_ecnt} chunks ECNT listos en knowledge_base (version_kb='ecnt_v1')")
print("  El endpoint /proyecciones/{user_id} ya puede usar estos datos.")

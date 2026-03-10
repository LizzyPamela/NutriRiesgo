"""
Script para generar embeddings de chunks y cargarlos en Supabase
Optimizado para 649 chunks con batch processing
CORREGIDO: Limpieza de caracteres NUL y problemáticos
"""

import os
import sys
import json
from pathlib import Path

# Agregar directorio raíz al path
root_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(root_dir))

from dotenv import load_dotenv
import psycopg2
from pgvector.psycopg2 import register_vector
from psycopg2.extras import execute_batch
from tqdm import tqdm

# sentence-transformers may not be installed in fresh environments
try:
    from sentence_transformers import SentenceTransformer
except ModuleNotFoundError:
    import subprocess
    import sys
    print("❗ sentence_transformers no encontrado: instalando package...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "sentence-transformers"])
    from sentence_transformers import SentenceTransformer

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
CHUNKS_FILE = "data/processed/chunks_guias.json"

print("=" * 70)
print("🧠 GENERACIÓN E INDEXACIÓN DE EMBEDDINGS")
print("=" * 70)

# Cargar modelo de embeddings
print("\n📦 Cargando modelo sentence-transformers...")
print("   Modelo: paraphrase-multilingual-MiniLM-L12-v2")
print("   Dimensiones: 384")

try:
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    print("✅ Modelo cargado correctamente")
except Exception as e:
    print(f"❌ Error cargando modelo: {str(e)}")
    print("\n💡 Instalando dependencias...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "sentence-transformers", "-q"])
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    print("✅ Modelo cargado correctamente")

# Leer chunks
print(f"\n📂 Cargando: {CHUNKS_FILE}")

if not os.path.exists(CHUNKS_FILE):
    print(f"❌ ERROR: No se encuentra {CHUNKS_FILE}")
    print(f"   Ubicación actual: {os.getcwd()}")
    print(f"   Asegúrate de copiar chunks_guias.json a data/processed/")
    sys.exit(1)

with open(CHUNKS_FILE, 'r', encoding='utf-8') as f:
    chunks = json.load(f)

# Manejar estructura del JSON
if isinstance(chunks, dict) and 'chunks' in chunks:
    chunks = chunks['chunks']

print(f"✅ {len(chunks):,} chunks cargados")

# Conectar a BD
print(f"\n🔌 Conectando a Supabase...")
try:
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    cur = conn.cursor()
    print("✅ Conexión establecida")
except Exception as e:
    print(f"❌ Error de conexión: {str(e)}")
    sys.exit(1)

# Limpiar tabla knowledge_base (opcional)
print("\n🗑️  Limpiando tabla knowledge_base...")
cur.execute("DELETE FROM knowledge_base")
conn.commit()
print("✅ Tabla limpia")

# Generar embeddings en batch (más eficiente)
print(f"\n🔄 Generando embeddings (batch de 32)...")

textos = [chunk.get('texto', '') for chunk in chunks]
embeddings = model.encode(
    textos,
    batch_size=32,
    show_progress_bar=True,
    convert_to_numpy=True
)

print(f"✅ {len(embeddings)} embeddings generados")

# Función para limpiar texto
def limpiar_texto(texto):
    """Elimina caracteres problemáticos para PostgreSQL"""
    if texto is None:
        return ''
    # Convertir a string y eliminar caracteres problemáticos
    texto_limpio = str(texto)
    # Eliminar NUL bytes (0x00)
    texto_limpio = texto_limpio.replace('\x00', '')
    # Normalizar saltos de línea
    texto_limpio = texto_limpio.replace('\r\n', '\n').replace('\r', '\n')
    # Eliminar otros caracteres de control problemáticos (opcional)
    # texto_limpio = ''.join(char for char in texto_limpio if ord(char) >= 32 or char in '\n\t')
    return texto_limpio.strip()

# Preparar datos para inserción
print(f"\n💾 Preparando datos para inserción...")

valores = []
errores = 0

for i, chunk in enumerate(tqdm(chunks, desc="Preparando")):
    try:
        metadatos = chunk.get('metadatos', {})
        
        # Limpiar todos los campos de texto
        tipo_doc = limpiar_texto(metadatos.get('tipo', 'guia_oficial'))
        autoridad = limpiar_texto(metadatos.get('autoridad', 'OMS'))
        seccion = limpiar_texto(metadatos.get('seccion', ''))
        fecha = limpiar_texto(metadatos.get('fecha', '2023'))
        texto = limpiar_texto(chunk.get('texto', ''))
        
        # Validar que el texto no esté vacío
        if not texto:
            print(f"\n⚠️  Chunk {i} tiene texto vacío, saltando...")
            errores += 1
            continue
        
        valores.append((
            texto,
            embeddings[i].tolist(),
            tipo_doc,
            autoridad,
            'alto',  # nivel_evidencia por defecto
            seccion,
            fecha,
            'v1'  # version_kb
        ))
    except Exception as e:
        print(f"\n⚠️  Error preparando chunk {i}: {str(e)}")
        errores += 1
        continue

print(f"✅ {len(valores):,} registros preparados")
if errores > 0:
    print(f"⚠️  {errores} chunks con errores (saltados)")

# Insertar en batches
print(f"\n💾 Insertando en base de datos (batches de 50)...")

query = """
    INSERT INTO knowledge_base 
    (texto, embedding, tipo_doc, autoridad, nivel_evidencia, 
     seccion, fecha_publicacion, version_kb)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
"""

try:
    execute_batch(cur, query, valores, page_size=50)
    conn.commit()
    print("✅ Inserción completada")
except Exception as e:
    print(f"❌ Error en inserción: {str(e)}")
    import traceback
    traceback.print_exc()
    conn.rollback()
    
    # Intentar insertar uno por uno para identificar el problema
    print("\n🔍 Intentando identificar registros problemáticos...")
    conn.rollback()
    insertados = 0
    for i, valor in enumerate(tqdm(valores[:10], desc="Probando primeros 10")):
        try:
            cur.execute(query, valor)
            conn.commit()
            insertados += 1
        except Exception as e2:
            print(f"\n❌ Error en registro {i}: {str(e2)}")
            print(f"   Texto preview: {valor[0][:100]}...")
            print(f"   Autoridad: {valor[3]}")
            conn.rollback()
    
    if insertados > 0:
        print(f"\n✅ {insertados} registros insertados correctamente en prueba")
    sys.exit(1)

# Verificar
print(f"\n📊 Verificando datos insertados...")

cur.execute("SELECT COUNT(*) FROM knowledge_base")
total = cur.fetchone()[0]
print(f"   ✅ Total chunks en BD: {total:,}")

cur.execute("SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL")
con_embedding = cur.fetchone()[0]
print(f"   🧠 Chunks con embedding: {con_embedding:,}")

cur.execute("""
    SELECT autoridad, COUNT(*) 
    FROM knowledge_base 
    GROUP BY autoridad 
    ORDER BY COUNT(*) DESC
""")
print(f"\n   📊 Distribución por autoridad:")
for autoridad, count in cur.fetchall():
    print(f"      {autoridad}: {count:,} chunks")

# Probar búsqueda vectorial con un ejemplo
print(f"\n🔍 Probando búsqueda vectorial...")
query_text = "frutas y verduras recomendadas"
query_embedding = model.encode(query_text)

cur.execute("""
    SELECT 
        LEFT(texto, 100) as preview,
        autoridad,
        1 - (embedding <=> %s::vector) as similitud
    FROM knowledge_base
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> %s::vector
    LIMIT 3
""", (query_embedding.tolist(), query_embedding.tolist()))

print(f"   ✅ Búsqueda: '{query_text}'")
print(f"   📋 Top 3 resultados más similares:")
for preview, autoridad, similitud in cur.fetchall():
    print(f"\n      Similitud: {similitud:.3f}")
    print(f"      Autoridad: {autoridad}")
    print(f"      Preview: {preview}...")

cur.close()
conn.close()

print("\n" + "=" * 70)
print("🎉 INDEXACIÓN DE EMBEDDINGS COMPLETADA")
print("=" * 70)
print(f"\n✅ {total:,} chunks indexados con embeddings")
print(f"✅ Dimensión de embeddings: 384")
print(f"✅ Sistema RAG listo para funcionar")
print(f"\n💡 Siguiente paso: Probar el sistema completo")
print(f"   python backend\\scripts\\test_conexion.py")
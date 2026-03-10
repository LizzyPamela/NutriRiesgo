"""
Script para indexar alimentos en Supabase
Optimizado para 93K registros con batch inserts
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
from psycopg2.extras import execute_batch
from tqdm import tqdm

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
ALIMENTOS_FILE = "data/processed/alimentos.json"

print("=" * 70)
print("📊 INDEXACIÓN DE ALIMENTOS EN SUPABASE")
print("=" * 70)

# Leer JSON
print(f"\n📂 Cargando: {ALIMENTOS_FILE}")

if not os.path.exists(ALIMENTOS_FILE):
    print(f"❌ ERROR: No se encuentra {ALIMENTOS_FILE}")
    print(f"   Ubicación actual: {os.getcwd()}")
    print(f"   Asegúrate de copiar alimentos.json a data/processed/")
    sys.exit(1)

with open(ALIMENTOS_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Manejar estructura del JSON
if isinstance(data, dict) and 'alimentos' in data:
    alimentos = data['alimentos']
elif isinstance(data, list):
    alimentos = data
else:
    print("❌ Estructura de JSON no reconocida")
    sys.exit(1)

print(f"✅ {len(alimentos):,} alimentos cargados")

# Conectar a BD
print(f"\n🔌 Conectando a Supabase...")
try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    print("✅ Conexión establecida")
except Exception as e:
    print(f"❌ Error de conexión: {str(e)}")
    sys.exit(1)

# Limpiar tabla (opcional - comentar si no quieres borrar datos existentes)
print("\n🗑️  Limpiando tabla alimentos...")
cur.execute("DELETE FROM alimentos")
conn.commit()
print("✅ Tabla limpia")

# Preparar datos para batch insert
print(f"\n🔄 Preparando datos para inserción batch...")

valores = []
for alimento in tqdm(alimentos, desc="Preparando"):
    try:
        nutrientes = alimento.get('nutrientes_por_100g', {})
        
        # Extraer todos los campos posibles
        valores.append((
            alimento.get('id'),
            alimento.get('nombre'),
            alimento.get('categoria', 'sin_categoria'),
            alimento.get('fuente', 'USDA_FDC'),
            alimento.get('fdc_id'),
            alimento.get('fuente') == 'INCAP',  # es_alimento_hondureno
            
            # Macronutrientes
            nutrientes.get('energia_kcal'),
            nutrientes.get('proteina_g'),
            nutrientes.get('grasa_g'),
            nutrientes.get('grasa_saturada_g'),
            nutrientes.get('grasa_trans_g'),
            nutrientes.get('grasa_monoinsaturada_g'),
            nutrientes.get('grasa_poliinsaturada_g'),
            nutrientes.get('carbohidratos_g'),
            nutrientes.get('azucares_g'),
            nutrientes.get('fibra_g'),
            
            # Minerales
            nutrientes.get('calcio_mg'),
            nutrientes.get('hierro_mg'),
            nutrientes.get('sodio_mg'),
            nutrientes.get('potasio_mg'),
            nutrientes.get('magnesio_mg'),
            nutrientes.get('fosforo_mg'),
            nutrientes.get('zinc_mg'),
            
            # Vitaminas
            nutrientes.get('vitamina_a_mcg'),
            nutrientes.get('vitamina_c_mg'),
            nutrientes.get('vitamina_d_mcg'),
            nutrientes.get('vitamina_e_mg'),
            nutrientes.get('vitamina_b12_mcg'),
            nutrientes.get('folato_mcg')
        ))
    except Exception as e:
        print(f"\n⚠️  Error preparando {alimento.get('id', 'unknown')}: {str(e)}")
        continue

print(f"✅ {len(valores):,} registros preparados")

# Insertar en batches de 500 (más eficiente)
print(f"\n💾 Insertando en base de datos (batches de 500)...")

query = """
    INSERT INTO alimentos 
    (id, nombre, categoria, fuente, fdc_id, es_alimento_hondureno,
     energia_kcal, proteina_g, grasa_g, grasa_saturada_g, grasa_trans_g,
     grasa_monoinsaturada_g, grasa_poliinsaturada_g, carbohidratos_g,
     azucares_g, fibra_g, calcio_mg, hierro_mg, sodio_mg, potasio_mg,
     magnesio_mg, fosforo_mg, zinc_mg, vitamina_a_mcg, vitamina_c_mg,
     vitamina_d_mcg, vitamina_e_mg, vitamina_b12_mcg, folato_mcg)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (id) DO NOTHING
"""

try:
    execute_batch(cur, query, valores, page_size=500)
    conn.commit()
    print("✅ Inserción completada")
except Exception as e:
    print(f"❌ Error en inserción: {str(e)}")
    conn.rollback()
    sys.exit(1)

# Verificar
print(f"\n📊 Verificando datos insertados...")
cur.execute("SELECT COUNT(*) FROM alimentos")
total = cur.fetchone()[0]
print(f"   ✅ Total en BD: {total:,} alimentos")

cur.execute("SELECT COUNT(*) FROM alimentos WHERE es_alimento_hondureno = true")
hondurenos = cur.fetchone()[0]
print(f"   🇭🇳 Alimentos hondureños/INCAP: {hondurenos:,}")

cur.execute("""
    SELECT categoria, COUNT(*) 
    FROM alimentos 
    GROUP BY categoria 
    ORDER BY COUNT(*) DESC 
    LIMIT 10
""")
print(f"\n   📊 Top 10 categorías:")
for cat, count in cur.fetchall():
    print(f"      {cat}: {count:,}")

# Probar búsqueda
print(f"\n🔍 Probando búsqueda de texto completo...")
cur.execute("SELECT * FROM buscar_alimentos('chicken') LIMIT 5")
resultados = cur.fetchall()
print(f"   ✅ Búsqueda 'chicken': {len(resultados)} resultados")
for row in resultados[:3]:
    print(f"      - {row[1]}")

cur.close()
conn.close()

print("\n" + "=" * 70)
print("🎉 INDEXACIÓN DE ALIMENTOS COMPLETADA")
print("=" * 70)
print(f"\n✅ {total:,} alimentos indexados en Supabase")
print(f"✅ Siguiente paso: Generar embeddings para chunks")
print(f"\n💡 Comando:")
print(f"   python backend\\scripts\\generar_embeddings.py")
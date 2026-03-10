"""
Script para insertar datos de prueba en Supabase
"""

import os
import sys
from pathlib import Path

# Agregar directorio raíz al path
root_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(root_dir))

from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

print("=" * 60)
print("📊 INSERTANDO DATOS DE PRUEBA")
print("=" * 60)

# Datos de prueba: Alimentos hondureños y USDA
alimentos = [
    {
        'id': 'ALI00001',
        'nombre': 'Tortilla de maíz',
        'categoria': 'cereales',
        'fuente': 'INCAP',
        'es_hondureno': True,
        'energia_kcal': 218.0,
        'proteina_g': 5.7,
        'grasa_g': 1.1,
        'carbohidratos_g': 45.7,
        'fibra_g': 5.2,
        'calcio_mg': 180.0,
        'hierro_mg': 1.2,
        'sodio_mg': 5.0
    },
    {
        'id': 'ALI00002',
        'nombre': 'Frijoles negros cocidos',
        'categoria': 'leguminosas',
        'fuente': 'INCAP',
        'es_hondureno': True,
        'energia_kcal': 132.0,
        'proteina_g': 8.9,
        'grasa_g': 0.5,
        'carbohidratos_g': 23.7,
        'fibra_g': 8.7,
        'calcio_mg': 35.0,
        'hierro_mg': 2.1,
        'sodio_mg': 2.0
    },
    {
        'id': 'ALI00003',
        'nombre': 'Plátano maduro',
        'categoria': 'frutas',
        'fuente': 'INCAP',
        'es_hondureno': True,
        'energia_kcal': 122.0,
        'proteina_g': 1.3,
        'grasa_g': 0.4,
        'carbohidratos_g': 31.9,
        'fibra_g': 2.3,
        'calcio_mg': 5.0,
        'hierro_mg': 0.6,
        'sodio_mg': 1.0
    },
    {
        'id': 'ALI00004',
        'nombre': 'Mango',
        'categoria': 'frutas',
        'fuente': 'INCAP',
        'es_hondureno': True,
        'energia_kcal': 60.0,
        'proteina_g': 0.8,
        'grasa_g': 0.4,
        'carbohidratos_g': 15.0,
        'fibra_g': 1.6,
        'calcio_mg': 11.0,
        'hierro_mg': 0.2,
        'sodio_mg': 1.0
    },
    {
        'id': 'ALI00005',
        'nombre': 'Yuca cocida',
        'categoria': 'tuberculos',
        'fuente': 'INCAP',
        'es_hondureno': True,
        'energia_kcal': 159.0,
        'proteina_g': 1.4,
        'grasa_g': 0.3,
        'carbohidratos_g': 38.1,
        'fibra_g': 1.8,
        'calcio_mg': 16.0,
        'hierro_mg': 0.3,
        'sodio_mg': 14.0
    },
    {
        'id': 'ALI00006',
        'nombre': 'Pillsbury Golden Layer Buttermilk Biscuits, refrigerated dough',
        'categoria': 'panificados',
        'fuente': 'USDA_FDC',
        'es_hondureno': False,
        'fdc_id': 167512,
        'energia_kcal': 307.0,
        'proteina_g': 5.88,
        'grasa_g': 13.24,
        'carbohidratos_g': 41.18,
        'fibra_g': 1.2,
        'hierro_mg': 2.12,
        'sodio_mg': 1059.0
    },
    {
        'id': 'ALI00007',
        'nombre': 'Waffles, buttermilk, frozen, ready-to-heat',
        'categoria': 'panificados',
        'fuente': 'USDA_FDC',
        'es_hondureno': False,
        'fdc_id': 167516,
        'energia_kcal': 273.0,
        'proteina_g': 6.58,
        'grasa_g': 9.22,
        'carbohidratos_g': 41.05,
        'fibra_g': 2.2,
        'calcio_mg': 279.0,
        'hierro_mg': 6.04,
        'sodio_mg': 621.0,
        'vitamina_c_mg': 0.0,
        'zinc_mg': 0.48
    }
]

# Chunks de conocimiento
chunks = [
    {
        'texto': 'La OMS recomienda consumir al menos 400 gramos (5 porciones) de frutas y verduras al día para prevenir enfermedades crónicas como cardiopatías, cáncer, diabetes y obesidad. Las frutas y verduras son fuentes importantes de fibra dietética, vitaminas, minerales y fitoquímicos.',
        'tipo_doc': 'guia_oficial',
        'autoridad': 'OMS',
        'nivel_evidencia': 'alto',
        'seccion': 'Alimentación saludable - Frutas y verduras',
        'fecha': '2020'
    },
    {
        'texto': 'La OMS recomienda reducir la ingesta de azúcares libres a menos del 10% de la ingesta calórica total, e idealmente a menos del 5% (aproximadamente 25 gramos o 6 cucharaditas al día para un adulto). Los azúcares libres incluyen azúcares añadidos a alimentos y bebidas, así como los presentes naturalmente en miel, jarabes y jugos de frutas.',
        'tipo_doc': 'guia_oficial',
        'autoridad': 'OMS',
        'nivel_evidencia': 'alto',
        'seccion': 'Alimentación saludable - Azúcares',
        'fecha': '2020'
    },
    {
        'texto': 'La OMS recomienda que los adultos consuman menos de 5 gramos de sal (aproximadamente una cucharadita) al día. La mayor parte del sodio en la dieta proviene de alimentos procesados y comidas preparadas fuera del hogar. Reducir el consumo de sal ayuda a reducir la presión arterial y el riesgo de enfermedades cardiovasculares.',
        'tipo_doc': 'guia_oficial',
        'autoridad': 'OMS',
        'nivel_evidencia': 'alto',
        'seccion': 'Alimentación saludable - Sodio y sal',
        'fecha': '2020'
    },
    {
        'texto': 'Los frijoles son un alimento fundamental en la dieta centroamericana. Son una excelente fuente de proteína vegetal, fibra dietética, hierro y ácido fólico. El INCAP recomienda consumir frijoles diariamente como parte de una alimentación balanceada. La combinación de frijoles con tortilla de maíz proporciona proteínas de alta calidad biológica.',
        'tipo_doc': 'guia_oficial',
        'autoridad': 'INCAP',
        'nivel_evidencia': 'alto',
        'seccion': 'Guías alimentarias - Leguminosas',
        'fecha': '2012'
    },
    {
        'texto': 'La tortilla de maíz es un alimento básico en Honduras y Centroamérica. El proceso de nixtamalización (cocción con cal) aumenta significativamente la biodisponibilidad del calcio y mejora la calidad proteica del maíz. Una tortilla de tamaño regular (30g) proporciona aproximadamente 65 kcal, 1.7g de proteína y 54mg de calcio.',
        'tipo_doc': 'tabla_nutricional',
        'autoridad': 'INCAP',
        'nivel_evidencia': 'alto',
        'seccion': 'Composición de alimentos - Cereales',
        'fecha': '2012'
    }
]

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Insertar alimentos
    print("\n📊 Insertando alimentos...")
    for alimento in alimentos:
        try:
            cur.execute("""
                INSERT INTO alimentos 
                (id, nombre, categoria, fuente, fdc_id, es_alimento_hondureno,
                 energia_kcal, proteina_g, grasa_g, carbohidratos_g, fibra_g,
                 calcio_mg, hierro_mg, sodio_mg, vitamina_c_mg, zinc_mg)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                alimento['id'],
                alimento['nombre'],
                alimento['categoria'],
                alimento['fuente'],
                alimento.get('fdc_id'),
                alimento['es_hondureno'],
                alimento['energia_kcal'],
                alimento['proteina_g'],
                alimento['grasa_g'],
                alimento['carbohidratos_g'],
                alimento['fibra_g'],
                alimento.get('calcio_mg'),
                alimento.get('hierro_mg'),
                alimento.get('sodio_mg'),
                alimento.get('vitamina_c_mg'),
                alimento.get('zinc_mg')
            ))
            print(f"   ✅ {alimento['nombre']}")
        except Exception as e:
            print(f"   ❌ Error en {alimento['id']}: {str(e)}")
    
    conn.commit()
    
    # Insertar chunks de conocimiento
    print("\n📚 Insertando chunks de conocimiento...")
    for chunk in chunks:
        try:
            cur.execute("""
                INSERT INTO knowledge_base 
                (texto, tipo_doc, autoridad, nivel_evidencia, seccion, fecha_publicacion, version_kb)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                chunk['texto'],
                chunk['tipo_doc'],
                chunk['autoridad'],
                chunk['nivel_evidencia'],
                chunk['seccion'],
                chunk['fecha'],
                'v1'
            ))
            print(f"   ✅ {chunk['autoridad']} - {chunk['seccion'][:50]}...")
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    conn.commit()
    
    # Verificar
    print("\n📊 Verificando datos insertados...")
    cur.execute("SELECT COUNT(*) FROM alimentos")
    total_alimentos = cur.fetchone()[0]
    print(f"   ✅ Alimentos: {total_alimentos}")
    
    cur.execute("SELECT COUNT(*) FROM knowledge_base")
    total_chunks = cur.fetchone()[0]
    print(f"   ✅ Chunks de conocimiento: {total_chunks}")
    
    # Probar búsqueda
    print("\n🔍 Probando búsqueda de alimentos...")
    cur.execute("SELECT * FROM buscar_alimentos('tortilla') LIMIT 3")
    resultados = cur.fetchall()
    print(f"   ✅ Búsqueda 'tortilla': {len(resultados)} resultados")
    
    for row in resultados:
        print(f"      - {row[1]} ({row[2]})")
    
    cur.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("🎉 DATOS DE PRUEBA INSERTADOS EXITOSAMENTE")
    print("=" * 60)
    print("\n✅ Siguiente paso: Procesar documentos reales")
    print("   - PDFs de guías OMS/INCAP")
    print("   - CSVs de alimentos INCAP/USDA")
    
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
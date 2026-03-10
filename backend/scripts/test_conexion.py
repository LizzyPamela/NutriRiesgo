"""
Test de conexión a Supabase
"""

import os
import sys
from pathlib import Path

# Agregar directorio raíz al path
root_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(root_dir))

from dotenv import load_dotenv
import psycopg2
from pgvector.psycopg2 import register_vector

# Cargar .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

print("=" * 60)
print("🧪 TEST DE CONEXIÓN A SUPABASE")
print("=" * 60)
print(f"\n📍 URL: {os.getenv('SUPABASE_URL')}")
print(f"🔑 Anon Key (primeros 20 chars): {os.getenv('SUPABASE_ANON_KEY')[:20]}...")

try:
    print("\n🔌 Conectando a PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    cur = conn.cursor()
    
    print("✅ Conexión exitosa!")
    
    # Versión de PostgreSQL
    cur.execute("SELECT version();")
    version = cur.fetchone()[0]
    print(f"\n📊 PostgreSQL: {version.split(',')[0]}")
    
    # Verificar pgvector
    cur.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector';")
    result = cur.fetchone()
    if result:
        print(f"✅ pgvector versión: {result[0]}")
    else:
        print("❌ pgvector NO instalado")
    
    # Listar tablas
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tablas = [row[0] for row in cur.fetchall()]
    
    print(f"\n📋 Tablas encontradas: {len(tablas)}")
    for tabla in tablas:
        cur.execute(f"SELECT COUNT(*) FROM {tabla};")
        count = cur.fetchone()[0]
        icon = "📊" if count > 0 else "📭"
        print(f"   {icon} {tabla}: {count} registros")
    
    # Probar función
    print("\n🔍 Probando funciones SQL...")
    cur.execute("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' LIMIT 5;")
    funciones = [row[0] for row in cur.fetchall()]
    print(f"   ✅ {len(funciones)} funciones disponibles")
    
    cur.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("🎉 TODO FUNCIONANDO CORRECTAMENTE")
    print("=" * 60)
    print("\n✅ Siguiente paso: Insertar datos de prueba")
    
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    print("\n🔍 Posibles causas:")
    print("   1. Verificar DATABASE_URL en .env")
    print("   2. Verificar que el schema SQL se haya ejecutado")
    print("   3. Verificar SERVICE_ROLE_KEY en .env")
    print("   4. Verificar conexión a internet")
    sys.exit(1)
"""
Aplicación FastAPI principal - NutriRiesgo-UNAH
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from config import settings, validate_config
from api import chat, alimentos, perfil, comidas, health

# ============================================================================
# LIFESPAN - Inicialización y limpieza
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Maneja el ciclo de vida de la aplicación"""
    # Startup
    print("=" * 70)
    print(f"🚀 Iniciando {settings.APP_NAME} v{settings.APP_VERSION}")
    print("=" * 70)
    
    # Validar configuración
    try:
        validate_config()
    except ValueError as e:
        print(f"❌ Error de configuración: {str(e)}")
        raise
    
    # Inicializar servicios (lazy loading - se cargan al primer uso)
    print("✅ Servicios configurados para carga lazy")
    
    print("\n🎯 API lista para recibir peticiones")
    print("📚 Documentación: http://localhost:8000/docs")
    print("=" * 70)
    
    yield
    
    # Shutdown
    print("\n🛑 Cerrando aplicación...")
    
    # Cerrar conexiones a BD
    from utils.database import close_connection_pool
    close_connection_pool()
    
    print("✅ Aplicación cerrada correctamente")

# ============================================================================
# APLICACIÓN FASTAPI
# ============================================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    Sistema de Orientación Nutricional y Prevención de Riesgo Cardiovascular
    para estudiantes de UNAH Comayagua.
    
    **Características:**
    * 🤖 Chat RAG con GPT-4
    * 🥗 Base de 92K+ alimentos (USDA + INCAP)
    * 📚 649 chunks de conocimiento (OMS, INCAP, Honduras)
    * ⚕️ Sistema de abstención y derivación
    * 📊 Diario alimentario
    * 🎯 Evaluación de riesgo cardiovascular
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================================================
# MIDDLEWARE - CORS
# ============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev
        "http://localhost:5173",  # Vite dev
        "https://nutririesgo-unah.vercel.app",  # Producción (cuando depliegues)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# ROUTERS - Registrar endpoints
# ============================================================================

app.include_router(
    health.router,
    prefix="/health",
    tags=["Health"]
)

app.include_router(
    chat.router,
    prefix="/chat",
    tags=["Chat RAG"]
)

app.include_router(
    alimentos.router,
    prefix="/alimentos",
    tags=["Alimentos"]
)

app.include_router(
    perfil.router,
    prefix="/perfil",
    tags=["Perfil de Usuario"]
)

app.include_router(
    comidas.router,
    prefix="/comidas",
    tags=["Diario de Comidas"]
)

# ============================================================================
# ENDPOINTS RAÍZ
# ============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Endpoint raíz - Información de la API"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "chat": "/chat/consulta",
            "alimentos": "/alimentos/buscar",
            "perfil": "/perfil/{user_id}",
            "comidas": "/comidas/registrar"
        }
    }

# ============================================================================
# EJECUTAR SERVIDOR
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
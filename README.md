# NutriRiesgo-UNAH

Plataforma de orientación nutricional con IA para Honduras y Centroamérica.
Combina una base de conocimiento de guías clínicas (RAG) con una base de datos de 92 000+ alimentos para ofrecer consultas nutricionales contextualizadas.

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.13 · FastAPI · Uvicorn |
| IA / RAG | OpenAI GPT-4 · Sentence Transformers (`paraphrase-multilingual-MiniLM-L12-v2`) |
| Base de datos | PostgreSQL + pgvector (vía Supabase) |
| Autenticación | Supabase Auth |
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 |
| Estado | Zustand |
| Íconos | Lucide React |

---

## Requisitos previos

- Python 3.11+
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) con extensión `pgvector` activa
- API Key de OpenAI (GPT-4)

---

## Variables de entorno

### Backend — `backend/.env`

Crea el archivo copiando el siguiente template:

```env
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-jwt>
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt>

# PostgreSQL (Supabase pooler — Transaction mode)
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

### Frontend — `frontend/.env.local`

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-jwt>
```

> Los valores de Supabase se encuentran en **Project Settings → API** dentro del dashboard de Supabase.

---

## Instalación y arranque

### 1. Clonar el repositorio

```bash
git clone https://github.com/<org>/NutriRiesgo.git
cd NutriRiesgo
```

### 2. Backend

```bash
# Crear y activar entorno virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Instalar dependencias
pip install -r backend/requirements.txt

# Configurar variables de entorno
cp backend/.env.example backend/.env   # editar con tus credenciales

# Iniciar servidor
cd backend
uvicorn main:app --reload --port 8000
```

El servidor queda disponible en `http://localhost:8000`.
Documentación interactiva: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local   # editar con tus credenciales

# Iniciar en modo desarrollo
npm run dev
```

La app queda disponible en `http://localhost:5173`.

---

## Scripts de datos (primera vez)

Estos scripts generan los archivos en `data/processed/` que el backend necesita para funcionar.
Solo es necesario ejecutarlos una vez, o cuando se actualicen las fuentes de datos.

```bash
# Desde la raíz del proyecto, con el venv activado

# 1. Procesar PDFs de guías clínicas → chunks_guias.json (649 chunks)
python scripts/process_pdfs.py

# 2. Construir base de alimentos → alimentos.json (92 891 alimentos)
#    Fuentes: USDA FDC CSVs + INCAP PDF + alimentos hondureños manuales
python scripts/build_alimentos.py
```

**Archivos generados:**

| Archivo | Descripción | Tamaño aprox. |
|---|---|---|
| `data/processed/chunks_guias.json` | 649 fragmentos de 10 guías clínicas (OPS/OMS, INCAP, MSP-HN) | ~1 MB |
| `data/processed/alimentos.json` | 92 891 alimentos con nutrientes por 100 g | ~46 MB |

### Indexar embeddings en Supabase

Con el backend corriendo y los archivos generados:

```bash
cd backend

# Generar e insertar embeddings de alimentos en pgvector
python scripts/indexar_alimentos.py

# Generar e insertar embeddings de chunks de guías
python scripts/generar_embeddings.py
```

---

## Estructura del proyecto

```text
NutriRiesgo/
├── backend/
│   ├── main.py                  # Entrada FastAPI, CORS, routers
│   ├── config.py                # Pydantic Settings (variables de entorno)
│   ├── dependencies.py          # Auth y rate limiting
│   ├── requirements.txt
│   ├── api/
│   │   ├── health.py            # GET /health
│   │   ├── chat.py              # POST /chat/consulta  (RAG)
│   │   ├── alimentos.py         # GET /alimentos/buscar
│   │   ├── comidas.py           # CRUD /comidas
│   │   └── perfil.py            # CRUD /perfil
│   ├── services/
│   │   ├── rag_service.py       # Pipeline RAG completo
│   │   ├── openai_service.py    # Integración GPT-4
│   │   ├── embeddings_service.py # Sentence Transformers
│   │   └── abstention_service.py # Sistema de abstención médica
│   ├── models/                  # Schemas Pydantic
│   ├── utils/
│   │   ├── database.py          # Pool PostgreSQL + pgvector
│   │   └── validators.py
│   └── scripts/                 # Scripts de setup one-time
│       ├── generar_embeddings.py
│       ├── indexar_alimentos.py
│       ├── insertar_datos_prueba.py
│       └── test_conexion.py
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Chat.tsx
│   │   │   ├── DiarioComidas.tsx
│   │   │   ├── Estadisticas.tsx
│   │   │   ├── Perfil.tsx
│   │   │   └── BusquedaAlimentos.tsx
│   │   ├── components/
│   │   │   └── Layout.tsx       # Sidebar + shell
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── services/
│   │   │   └── api.ts           # Cliente Axios → backend
│   │   ├── lib/
│   │   │   └── supabase.ts      # Cliente Supabase
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── vite.config.ts           # Proxy /api → localhost:8000
│   └── .env.local
│
├── scripts/                     # Procesamiento de datos
│   ├── process_pdfs.py
│   └── build_alimentos.py
│
└── data/
    ├── raw/                     # PDFs + USDA CSVs (no versionados)
    └── processed/               # Salidas generadas (no versionadas)
```

---

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servidor y DB |
| `POST` | `/chat/consulta` | Consulta nutricional con RAG |
| `GET` | `/alimentos/buscar?q=<query>` | Búsqueda en base de alimentos |
| `GET` | `/perfil/{user_id}` | Obtener perfil de usuario |
| `PUT` | `/perfil/{user_id}` | Actualizar perfil |
| `GET` | `/comidas/{user_id}` | Listar comidas registradas |
| `POST` | `/comidas` | Registrar nueva comida |
| `DELETE` | `/comidas/{id}` | Eliminar comida |

Documentación completa disponible en `/docs` (Swagger UI) con el backend corriendo.

---

## Rutas del frontend

| Ruta | Página | Acceso |
|---|---|---|
| `/` | Landing | Público |
| `/login` | Login / Registro | Público |
| `/dashboard` | Dashboard | Autenticado |
| `/chat` | Chat con IA | Autenticado |
| `/diario` | Diario de comidas | Autenticado |
| `/estadisticas` | Estadísticas | Autenticado |
| `/perfil` | Perfil de usuario | Autenticado |
| `/alimentos` | Búsqueda de alimentos | Autenticado |

---

## Verificar que todo funciona

```bash
# 1. Health check del backend
curl http://localhost:8000/health

# 2. Buscar un alimento
curl "http://localhost:8000/alimentos/buscar?q=arroz"

# 3. Consulta de chat (RAG)
curl -X POST http://localhost:8000/chat/consulta \
  -H "Content-Type: application/json" \
  -d '{"mensaje": "¿Cuántas calorías tiene el frijol rojo?", "user_id": "test"}'
```

---

## Fuentes de datos

| Fuente | Descripción | Alimentos |
|---|---|---|
| USDA FoodData Central | Alimentos no-branded (sr_legacy, foundation, survey_fndds, etc.) | 91 251 |
| INCAP Tabla de Composición | Alimentos centroamericanos | 1 448 |
| Manual Honduras | Alimentos y bebidas tradicionales hondureños | 192 |
| **Total** | | **92 891** |

Guías clínicas indexadas: 10 PDFs de OPS/OMS, INCAP y Ministerio de Salud de Honduras.

---

## Notas de desarrollo

- El proxy de Vite (`/api → http://localhost:8000`) evita problemas de CORS en desarrollo.
- CORS del backend acepta `localhost:3000`, `localhost:5173` y el dominio de producción en Vercel.
- El sistema de abstención médica rechaza respuestas con baja confianza o keywords médicas de alto riesgo.
- Los embeddings usan el modelo multilingüe `paraphrase-multilingual-MiniLM-L12-v2` (384 dimensiones) para soporte en español.
- La terminal de Windows usa cp1252 — evitar caracteres especiales en scripts Python si se ejecutan en CMD nativo.

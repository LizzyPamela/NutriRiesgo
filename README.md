# NutriColleague — UNAH

Plataforma educativa de evaluación nutricional y riesgo de enfermedades crónicas no transmisibles (ECNT) para estudiantes de la Universidad Nacional Autónoma de Honduras (UNAH).
Combina una base de conocimiento de guías clínicas (RAG) con una base de datos de 92 891 alimentos para ofrecer consultas nutricionales contextualizadas y evaluación de riesgo personalizada.

> **Aviso importante:** Este sistema es **EDUCATIVO**. No diagnostica enfermedades ni reemplaza la consulta médica profesional. Si presentas síntomas o resultados preocupantes, consulta a un médico o nutricionista.

---

## Cómo usar la aplicación

### 1. Registro e inicio de sesión

- Regístrate con tu correo institucional UNAH o personal
- Confirma tu cuenta desde el enlace enviado a tu correo
- Inicia sesión en la pantalla de acceso

### 2. Completa tu perfil

- Ingresa tus datos antropométricos: edad, sexo, peso, altura, perímetro de cintura
- Indica tu nivel de actividad física y si eres fumador/a
- Registra antecedentes familiares (diabetes, hipertensión, cardiopatía, obesidad)
- El sistema calcula automáticamente tu IMC y puntuación de riesgo ECNT basada en criterios OPS/OMS

### 3. Chat nutricional inteligente

- Escribe consultas en lenguaje natural: *"¿Cuántas calorías debo consumir al día?"*
- El sistema busca en guías oficiales OMS/OPS/INCAP antes de generar la respuesta
- Las respuestas citan las guías en que se basan
- El chat se abstiene automáticamente ante preguntas fuera de su alcance (diagnósticos, medicamentos)

### 4. Diario alimentario

- Registra tus comidas por tiempo: desayuno, almuerzo, cena, merienda
- Busca alimentos en la base de datos (92 891 alimentos: USDA FDC + INCAP + Honduras)
- Ve el resumen diario de calorías, proteínas, carbohidratos y grasas
- Compara tu ingesta con tus metas nutricionales calculadas por perfil

### 5. Búsqueda de alimentos

- Busca cualquier alimento por nombre
- Filtra por categoría o por alimentos hondureños/centroamericanos
- Consulta la tabla nutricional completa por 100 g

### 6. Exámenes médicos

- Registra resultados de laboratorio: glucosa, presión arterial, colesterol, triglicéridos, entre otros
- El sistema interpreta si el valor está en rango normal, elevado o crítico
- Visualiza el historial de tus exámenes a lo largo del tiempo

### 7. Proyecciones de riesgo ECNT

- Ve proyecciones de riesgo para enfermedades crónicas no transmisibles: diabetes tipo 2, hipertensión, enfermedad cardiovascular, hígado graso
- Las proyecciones se basan en tu perfil, IMC, actividad física y antecedentes familiares
- Cada proyección incluye la evidencia científica citada

### 8. Recomendaciones personalizadas

- Recibe recomendaciones semanales adaptadas a tu perfil de riesgo
- Sugerencias de alimentación, actividad física y hábitos saludables

---

## Módulos del sistema

| Módulo | Ruta | Acceso |
|---|---|---|
| Landing | `/` | Público |
| Login / Registro | `/login` | Público |
| Dashboard | `/dashboard` | Autenticado |
| Chat nutricional IA | `/chat` | Autenticado |
| Diario de comidas | `/diario` | Autenticado |
| Búsqueda de alimentos | `/alimentos` | Autenticado |
| Perfil antropométrico | `/perfil` | Autenticado |
| Exámenes médicos | `/examenes` | Autenticado |
| Proyecciones ECNT | `/proyecciones` | Autenticado |
| Recomendaciones | `/recomendaciones` | Autenticado |
| Estadísticas | `/estadisticas` | Autenticado |
| Panel de auditoría | `/admin` | Solo administradores |

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.13 · FastAPI · Uvicorn |
| IA / RAG | OpenAI GPT-4o-mini · OpenAI `text-embedding-3-small` (embeddings 1536 dims) |
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
- API Key de OpenAI (GPT-4o-mini + text-embedding-3-small)

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
│   │   ├── alimentos.py         # GET /alimentos/buscar, POST /alimentos/recomendar
│   │   ├── comidas.py           # CRUD /comidas
│   │   ├── perfil.py            # CRUD /perfil
│   │   ├── examenes.py          # CRUD /examenes (historial médico)
│   │   ├── proyecciones.py      # GET /proyecciones (riesgo ECNT)
│   │   └── admin.py             # GET /admin (panel auditoría — solo admins)
│   ├── services/
│   │   ├── rag_service.py       # Pipeline RAG completo
│   │   ├── openai_service.py    # Integración GPT-4o-mini
│   │   ├── embeddings_service.py # OpenAI text-embedding-3-small (1536 dims)
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

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Estado del servidor y DB |
| `POST` | `/chat/consulta` | Opcional | Consulta nutricional con RAG |
| `GET` | `/chat/conversaciones/{user_id}` | Sí | Historial del usuario |
| `GET` | `/chat/estadisticas` | Admin | Métricas del sistema |
| `GET` | `/alimentos/buscar` | No | Búsqueda en base de alimentos |
| `GET` | `/alimentos/{id}` | No | Detalle de un alimento |
| `GET` | `/perfil/{user_id}` | Sí | Obtener perfil propio |
| `POST` | `/perfil/{user_id}` | Sí | Crear/actualizar perfil |
| `DELETE` | `/perfil/{user_id}` | Sí | Eliminar perfil |
| `DELETE` | `/perfil/{user_id}/cuenta` | Sí | Eliminar cuenta completa |
| `GET` | `/comidas/{user_id}` | Sí | Diario alimentario |
| `POST` | `/comidas/registrar` | Sí | Registrar comida |
| `DELETE` | `/comidas/{registro_id}` | Sí | Eliminar registro |
| `POST` | `/alimentos/recomendar` | No | Búsqueda semántica RAG en guías nutricionales |
| `GET` | `/proyecciones/{user_id}` | Sí | Proyecciones ECNT |
| `POST` | `/examenes/{user_id}` | Sí | Guardar resultado de examen médico |
| `GET` | `/examenes/{user_id}` | Sí | Historial de exámenes del usuario |
| `DELETE` | `/examenes/{user_id}/{examen_id}/{fecha}` | Sí | Eliminar resultado de examen |
| `GET` | `/admin/resumen` | Admin | Panel de auditoría |

Documentación completa en `/docs` (Swagger UI) con el backend corriendo.

---

## Seguridad

- **Autenticación JWT**: cada request al backend valida el token contra Supabase Auth (ES256/RS256)
- **Protección IDOR**: cada usuario solo accede a sus propios datos; intentar acceder a datos ajenos devuelve 403
- **Panel admin**: restringido a emails en `ADMIN_EMAILS`; validado en backend, no solo en frontend
- **Whitelist de columnas**: el endpoint de perfil valida que solo se actualicen campos permitidos (previene SQL injection por nombre de columna)
- **Variables sensibles**: nunca expuestas al frontend; solo `VITE_*` públicas en el bundle

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
- Los embeddings usan el modelo `text-embedding-3-small` de OpenAI (1536 dimensiones), integrado con la misma infraestructura que GPT-4 para simplificar el despliegue.
- La terminal de Windows usa cp1252 — evitar caracteres especiales en scripts Python si se ejecutan en CMD nativo.

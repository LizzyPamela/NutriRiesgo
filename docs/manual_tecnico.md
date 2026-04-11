# Manual Técnico — NutriColleague
**Sistema RAG de Evaluación Nutricional y Riesgo de ECNT**
Universidad Nacional Autónoma de Honduras (UNAH)

**Autora:** Lizzy P. Mejía
**Versión:** 1.0
**Fecha:** Abril 2026
**Licencia:** Uso Académico con Atribución — ver [LICENSE](../LICENSE)

---

## Tabla de Contenidos

1. [Descripción del sistema](#1-descripción-del-sistema)
2. [Arquitectura general](#2-arquitectura-general)
3. [Tecnologías utilizadas](#3-tecnologías-utilizadas)
4. [Requisitos del sistema](#4-requisitos-del-sistema)
5. [Estructura de base de datos](#5-estructura-de-base-de-datos)
6. [Pipeline RAG](#6-pipeline-rag)
7. [Sistema de abstención médica](#7-sistema-de-abstención-médica)
8. [Algoritmo de riesgo ECNT](#8-algoritmo-de-riesgo-ecnt)
9. [Módulo de recomendaciones](#9-módulo-de-recomendaciones)
10. [API REST](#10-api-rest)
11. [Seguridad](#11-seguridad)
12. [Despliegue en producción](#12-despliegue-en-producción)
13. [Scripts de procesamiento de datos](#13-scripts-de-procesamiento-de-datos)
14. [Vistas analíticas](#14-vistas-analíticas)
15. [Limitaciones conocidas](#15-limitaciones-conocidas)

---

## 1. Descripción del sistema

NutriColleague es una plataforma educativa web orientada a estudiantes de la UNAH que integra:

- **Chat nutricional inteligente** basado en Retrieval-Augmented Generation (RAG), que recupera fragmentos de guías clínicas oficiales (OPS/OMS, INCAP, SESAL Honduras) antes de generar cada respuesta.
- **Evaluación de riesgo de ECNT** (Enfermedades Crónicas No Transmisibles): diabetes tipo 2, hipertensión, enfermedad cardiovascular e hígado graso, calculadas a partir del perfil antropométrico del usuario.
- **Diario alimentario** con base de datos de 92 891 alimentos (USDA FDC + INCAP + alimentos hondureños).
- **Registro de exámenes médicos** con interpretación automática de rangos de referencia.
- **Recomendaciones personalizadas** generadas en el cliente a partir del perfil y la dieta registrada.

> El sistema es estrictamente **educativo y preventivo**. No emite diagnósticos clínicos ni prescribe tratamientos.

---

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                    │
│   React 19 + TypeScript + Vite + Tailwind CSS v4        │
│   Estado global: Zustand  │  HTTP: Axios                │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTPS / REST
┌─────────────────▼───────────────────────────────────────┐
│                  BACKEND (FastAPI)                       │
│   Python 3.13 · Uvicorn · Pydantic                     │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ RAGService │  │AbstentionSvc │  │ OpenAIService   │ │
│  │ (pipeline) │  │ (filtros)    │  │ gpt-4o-mini     │ │
│  └─────┬──────┘  └──────────────┘  └────────┬────────┘ │
│        │                                     │          │
│  ┌─────▼──────────────────────────────────────▼──────┐ │
│  │         EmbeddingsService (text-embedding-3-small)│ │
│  └───────────────────────────┬───────────────────────┘ │
└──────────────────────────────┼──────────────────────────┘
                               │ PostgreSQL + pgvector
┌──────────────────────────────▼──────────────────────────┐
│                   SUPABASE                               │
│   PostgreSQL 15 + pgvector  │  Supabase Auth (JWT)     │
│   Row Level Security (RLS)  │  Storage (assets)        │
└─────────────────────────────────────────────────────────┘
                               │ OpenAI API
┌──────────────────────────────▼──────────────────────────┐
│            OPENAI API                                    │
│   gpt-4o-mini (chat)  │  text-embedding-3-small (RAG)  │
└─────────────────────────────────────────────────────────┘
```

### Flujo general de una consulta de chat

```
Usuario escribe consulta
        │
        ▼
[AbstentionService] ── keyword médica? ──► Respuesta de abstención
        │ No
        ▼
[EmbeddingsService] ── genera vector 1536-dim (text-embedding-3-small)
        │
        ▼
[pgvector / knowledge_base] ── búsqueda coseno, top_k=4, similitud≥0.25
        │
        ▼
[OpenAIService] ── prompt = system_prompt + chunks + perfil + consulta
        │
        ▼
[RLScheck + guardar conversación]
        │
        ▼
Respuesta al usuario con citas de autoridad
```

---

## 3. Tecnologías utilizadas

| Capa | Tecnología | Versión | Función |
|---|---|---|---|
| Frontend | React | 19 | UI principal |
| Frontend | TypeScript | 5.x | Tipado estático |
| Frontend | Vite | 6.x | Bundler + dev server |
| Frontend | Tailwind CSS | 4 | Estilos utilitarios |
| Frontend | Zustand | 5.x | Estado global |
| Frontend | Axios | 1.x | Cliente HTTP |
| Frontend | Lucide React | — | Iconografía |
| Backend | Python | 3.13 | Lenguaje principal |
| Backend | FastAPI | 0.115.x | Framework REST |
| Backend | Uvicorn | 0.34.x | Servidor ASGI |
| Backend | Pydantic | 2.x | Validación de datos |
| IA / RAG | OpenAI GPT-4o-mini | — | Generación de respuestas |
| IA / RAG | text-embedding-3-small | — | Embeddings semánticos (1536 dims) |
| Base de datos | PostgreSQL | 15 (Supabase) | Almacenamiento principal |
| Base de datos | pgvector | 0.8.x | Búsqueda vectorial (coseno) |
| Auth | Supabase Auth | — | JWT, ES256/RS256 |
| Datos | USDA FoodData Central | 2025 | 91 251 alimentos |
| Datos | INCAP-Tablas.pdf | — | 1 448 alimentos centroamericanos |
| Procesamiento | PyMuPDF (fitz) | — | Extracción de texto de PDFs |
| Procesamiento | tiktoken | cl100k_base | Conteo de tokens para chunking |
| Procesamiento | pandas / numpy | — | Procesamiento de CSVs USDA |

---

## 4. Requisitos del sistema

### Entorno de desarrollo

| Requisito | Versión mínima |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| RAM | 4 GB (8 GB recomendado por el CSV de 27M filas) |
| Disco | 2 GB libres (data/raw + data/processed) |

### Servicios externos requeridos

| Servicio | Uso | Variables |
|---|---|---|
| Supabase | Base de datos + Auth + pgvector | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` |
| OpenAI API | Embeddings + Chat | `OPENAI_API_KEY` |

---

## 5. Estructura de base de datos

La base de datos corre sobre **PostgreSQL 15 con extensión pgvector** en Supabase. El schema completo se encuentra en `supabase/db_schema_v3.sql`.

### 5.1 Diagrama de tablas

```
auth.users (Supabase Auth)
    │
    ├── perfiles_usuarios        [1:1] Datos antropométricos + riesgo cardiovascular
    ├── contexto_estudiantil     [1:1] Situación académica y tipo de vivienda
    ├── registros_comidas        [1:N] Diario alimentario por tiempo de comida
    ├── recomendaciones_guardadas[1:N] Recomendaciones diarias persistidas
    ├── proyecciones_ecnt        [1:N] Proyecciones de riesgo por enfermedad
    ├── examenes_resultados      [1:N] Resultados de laboratorio
    └── conversaciones           [1:N] Historial de chat RAG

alimentos                        Base nutricional unificada (INCAP + USDA + Honduras)
knowledge_base                   Fragmentos RAG con embeddings semánticos
logs_sistema                     Registro de eventos y errores
```

### 5.2 Descripción de tablas

#### `alimentos`
Base nutricional unificada. Fuentes: INCAP, USDA FDC, manual Honduras.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | TEXT PK | Identificador único (ej. `ALI0001`) |
| `fdc_id` | INTEGER UNIQUE | ID en USDA FoodData Central |
| `nombre` | TEXT NOT NULL | Nombre del alimento |
| `categoria` | TEXT NOT NULL | Categoría nutricional |
| `fuente` | TEXT | `INCAP`, `USDA_FDC` o `manual_honduras` |
| `es_alimento_hondureno` | BOOLEAN | Marcador de alimento regional |
| `energia_kcal` | DECIMAL | Energía por 100 g |
| `proteina_g` | DECIMAL | Proteína por 100 g |
| `grasa_g` … `fibra_g` | DECIMAL | Macronutrientes por 100 g |
| `calcio_mg` … `zinc_mg` | DECIMAL | Minerales por 100 g |
| `vitamina_a_mcg` … `folato_mcg` | DECIMAL | Vitaminas por 100 g |
| `completitud_datos` | DECIMAL(3,2) | Fracción de nutrientes con dato (auto-calculado por trigger) |
| `nombre_tsv` | tsvector GENERATED | Índice Full-Text Search (español) |

**Índices:** GIN en `nombre_tsv` y `sinonimos`; B-tree en `categoria`, `fuente`, `es_alimento_hondureno`.

**Trigger:** `calcular_completitud_alimento_trigger` — antes de INSERT/UPDATE, cuenta los 20 campos nutricionales presentes y asigna `completitud_datos = campos_completos / 20`.

---

#### `knowledge_base`
Fragmentos de guías clínicas indexados para búsqueda semántica RAG.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador del fragmento |
| `texto` | TEXT NOT NULL | Contenido del fragmento (~200-500 tokens) |
| `embedding` | vector(1536) | Vector semántico (text-embedding-3-small) |
| `tipo_doc` | TEXT | `guia_oficial`, `tabla_nutricional`, `articulo_cientifico` |
| `autoridad` | TEXT | `OMS`, `INCAP`, `USDA`, `AHA`, `Secretaria_Salud_HN`, etc. |
| `nivel_evidencia` | TEXT | `alto`, `medio`, `bajo` |
| `fecha_publicacion` | TEXT | Año de publicación del documento fuente |
| `seccion` | TEXT | Sección del documento de origen |
| `texto_tsv` | tsvector GENERATED | Índice Full-Text Search |

**Índice vectorial:** `hnsw` con `vector_cosine_ops` para búsqueda aproximada de vecinos.

> **Nota sobre dimensiones:** El servicio de embeddings del backend (`embeddings_service.py`) usa `text-embedding-3-small` que genera vectores de **1536 dimensiones**. El archivo `db_schema_v3.sql` declara `vector(384)` como valor heredado de una versión anterior con `paraphrase-multilingual-MiniLM-L12-v2`. En producción, la columna debe estar declarada como `vector(1536)`.

---

#### `perfiles_usuarios`
Datos antropométricos y de riesgo cardiovascular por usuario. Relacionada 1:1 con `auth.users`.

| Columna | Tipo | Descripción |
|---|---|---|
| `user_id` | UUID PK FK | Referencia a `auth.users` |
| `edad` | INTEGER | 18–120 años |
| `sexo` | TEXT | `M` o `F` |
| `peso_kg` | DECIMAL(5,2) | Peso en kilogramos |
| `altura_cm` | DECIMAL(5,2) | Altura en centímetros |
| `perimetro_cintura_cm` | DECIMAL(5,2) | Perímetro de cintura |
| `imc` | DECIMAL(4,2) GENERATED | `peso_kg / (altura_cm/100)²` |
| `antecedentes_familiares` | JSONB | `{diabetes, hipertension, cardiopatia, obesidad}` |
| `actividad_fisica` | TEXT | `sedentario`, `ligero`, `moderado`, `intenso` |
| `fumador` | BOOLEAN | Condición de tabaquismo |
| `riesgo_prevent` | DECIMAL(4,3) | Score PREVENT de riesgo cardiovascular (0–1) |
| `categoria_riesgo` | TEXT | `bajo`, `moderado`, `alto`, `muy_alto` (auto por trigger) |
| `requiere_derivacion` | BOOLEAN | Se activa si IMC ≥ 35 o riesgo ≥ 20% |
| `motivo_derivacion` | TEXT | Razón de derivación automática |

**Trigger:** `calcular_categoria_riesgo_trigger` — calcula `categoria_riesgo` y activa `requiere_derivacion` según umbrales (ver §8).

**Trigger:** `on_auth_user_created` — al registrar un nuevo usuario en `auth.users`, inserta automáticamente su fila en `perfiles_usuarios` a partir de `raw_user_meta_data` del JWT de registro.

---

#### `contexto_estudiantil`
Perfil socioeconómico del estudiante. Se completa al confirmar el correo electrónico.

| Columna | Tipo | Descripción |
|---|---|---|
| `user_id` | UUID PK FK | Referencia a `auth.users` |
| `situacion_academica` | TEXT | `estudiando`, `vacaciones`, `trabaja`, `practica_profesional` |
| `tipo_vivienda` | TEXT | `familia_nucleo`, `alquila`, `familia_extensa` |

**Trigger:** `on_user_confirmed_contexto` — se activa al actualizar `email_confirmed_at` (confirmación de email), no al insertar.

---

#### `registros_comidas`
Diario alimentario. Cada fila representa un tiempo de comida en una fecha.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador del registro |
| `user_id` | UUID FK | Usuario propietario |
| `fecha` | DATE | Fecha del registro |
| `tiempo_comida` | TEXT | `desayuno`, `almuerzo`, `cena`, `merienda` |
| `alimentos` | JSONB | Array de `{alimento_id, nombre, cantidad_g, nutrientes}` |
| `total_calorias` | DECIMAL | Suma de calorías del tiempo de comida |
| `total_proteina_g` | DECIMAL | Suma de proteína |
| `total_carbohidratos_g` | DECIMAL | Suma de carbohidratos |
| `total_grasas_g` | DECIMAL | Suma de grasas |

---

#### `recomendaciones_guardadas`
Snapshot diario de las recomendaciones generadas en el cliente. Restricción UNIQUE en `(user_id, fecha)`.

| Columna | Tipo | Descripción |
|---|---|---|
| `recomendaciones` | JSONB | Array de objetos `{id, titulo, descripcion, nivel, categoria}` |
| `imc` / `peso_kg` / `cintura_cm` | NUMERIC | Contexto antropométrico al momento del guardado |
| `calorias_promedio` / `pct_*` | NUMERIC | Contexto dietético al momento del guardado |
| `total_alertas` / `total_precauciones` / ... | INTEGER | Contadores por nivel de alerta |

---

#### `proyecciones_ecnt`
Proyecciones calculadas por el backend para diabetes, hipertensión, cardiopatía e hígado graso.

| Columna | Tipo | Descripción |
|---|---|---|
| `enfermedad` | TEXT | Nombre de la enfermedad proyectada |
| `score_total` | NUMERIC | Score combinado (perfil + dieta) |
| `score_perfil` | NUMERIC | Contribución del perfil antropométrico |
| `score_dieta` | NUMERIC | Contribución del patrón dietético |
| `nivel_riesgo` | TEXT | Clasificación final del riesgo |
| `tendencia_dieta` | TEXT | Dirección de la tendencia dietética |
| `factores` | JSONB | Factores individuales que contribuyen al score |

---

#### `examenes_resultados`
Resultados de laboratorio registrados manualmente por el usuario.

| Columna | Tipo | Descripción |
|---|---|---|
| `user_id` | TEXT | `auth.uid()::text` (por compatibilidad con RLS) |
| `examen_id` | TEXT | Identificador del tipo de examen (ej. `glucosa`, `presion_sistolica`) |
| `valor` | FLOAT | Valor numérico del resultado |
| `fecha` | DATE | Fecha del resultado |
| `interpretacion` | TEXT | `normal`, `elevado`, `critico` |

---

#### `conversaciones`
Historial completo de chat RAG con trazabilidad de fuentes y métricas de rendimiento.

| Columna | Tipo | Descripción |
|---|---|---|
| `consulta` | TEXT | Texto de la consulta del usuario |
| `respuesta` | TEXT | Respuesta generada |
| `chunks_recuperados` | JSONB | Fragmentos de knowledge_base usados |
| `num_chunks_usados` | INTEGER | Cantidad de chunks |
| `tipo_consulta` | VARCHAR(50) | `alimentos`, `riesgo_cardiovascular`, `nutricional`, `general` |
| `nivel_confianza` | VARCHAR(20) | `alto`, `medio`, `bajo` |
| `confianza_respuesta` | DECIMAL(3,2) | Score numérico de confianza |
| `abstension` | BOOLEAN | Si el sistema se abstuvo de responder |
| `motivo_abstension` | TEXT | Razón de abstención si aplica |
| `derivacion` | BOOLEAN | Si se recomendó derivación a profesional |
| `util` | BOOLEAN | Feedback del usuario (útil/no útil) |
| `tiempo_respuesta_ms` | INTEGER | Latencia total del pipeline |
| `tokens_prompt` / `tokens_respuesta` | INTEGER | Tokens consumidos |
| `costo_usd` | DECIMAL(10,6) | Costo estimado de la llamada a OpenAI |

---

#### `logs_sistema`
Eventos y errores del sistema con niveles estándar (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`).

---

### 5.3 Funciones de base de datos

| Función | Descripción |
|---|---|
| `buscar_conocimiento_semantico(embedding, limite, filtro_tipo, filtro_autoridad, nivel_evidencia_min)` | Búsqueda vectorial coseno en `knowledge_base` con filtros opcionales |
| `buscar_alimentos(termino, filtro_categoria, solo_hondurenos)` | Búsqueda FTS en `alimentos` con ranking por relevancia |
| `obtener_alimento_completo(alimento_id)` | Devuelve perfil nutricional completo como JSONB |
| `calcular_totales_comida(registro_id)` | Suma nutrientes de todos los alimentos de un registro |
| `obtener_conversaciones_usuario(uid, limite, offset)` | Historial paginado de chat |
| `estadisticas_sistema(fecha_inicio, fecha_fin)` | Métricas operativas del sistema en ventana temporal |
| `verificar_embeddings()` | Cobertura de embeddings en knowledge_base |

---

## 6. Pipeline RAG

El pipeline RAG está implementado en `backend/services/rag_service.py` como clase `RAGService` (singleton). Orquesta tres servicios: `EmbeddingsService`, `AbstentionService` y `OpenAIService`.

### 6.1 Pasos del pipeline (13 etapas)

```
Paso 1  — Verificación de abstención
          AbstentionService.debe_abstenerse(consulta)
          Si True → retorna respuesta de abstención, NO continúa.

Paso 2  — Obtener perfil del usuario (opcional)
          Solo si user_id presente y incluir_contexto_perfil=True.
          Consulta perfiles_usuarios en BD.

Paso 3  — Verificar derivación por perfil
          AbstentionService.requiere_derivacion(consulta, imc, riesgo_prevent)
          Umbrales: IMC ≥ 35 o riesgo_prevent ≥ 0.20

Paso 4  — Generar embedding de la consulta
          EmbeddingsService.generar_embedding(consulta)
          Modelo: text-embedding-3-small | Dimensiones: 1536

Paso 5  — Búsqueda vectorial en knowledge_base
          buscar_conocimiento_semantico(embedding, limite=4, nivel_evidencia_min='medio')
          Índice HNSW, distancia coseno.

Paso 6  — Filtrar por similitud mínima
          Se descartan chunks con similitud < 0.25

Paso 7  — Preparar chunks para el prompt
          Se extraen: texto, autoridad, sección, similitud

Paso 8  — Generación de respuesta con OpenAI
          OpenAIService.generar_respuesta(consulta, chunks, perfil)
          Modelo: gpt-4o-mini | Temperature: 0.3 | Max tokens: 800

Paso 9  — Calcular nivel de confianza
          similitud_promedio ≥ 0.70 → alto
          similitud_promedio ≥ 0.50 → medio
          similitud_promedio < 0.50 → bajo

Paso 10 — Clasificar tipo de consulta
          Palabras clave → alimentos | riesgo_cardiovascular | nutricional | general

Paso 11 — Agregar aviso de derivación (si aplica)
          Se adjunta mensaje al final de la respuesta.

Paso 12 — Guardar conversación en BD (async, timeout 5s)
          Se ejecuta en thread separado para no bloquear el event loop.

Paso 13 — Retornar respuesta completa al cliente
```

### 6.2 System prompt del modelo

El sistema se presenta como **NutriBot, asistente de orientación nutricional de la UNAH**. Reglas clave del prompt:

1. Usar el contexto recuperado como fuente principal, citando la autoridad.
2. Si el contexto no cubre la pregunta, usar conocimiento general con advertencia explícita.
3. Nunca dar diagnósticos, prescripciones ni interpretar resultados de laboratorio.
4. Máximo 3-4 párrafos. Priorizar alimentos accesibles en Honduras.
5. Tono directo y amigable, sin tecnicismos innecesarios.

### 6.3 Costo estimado por consulta

| Modelo | Costo estimado (800 tokens totales) |
|---|---|
| gpt-4o-mini | ~$0.000225 USD |
| gpt-4o | ~$0.003500 USD |

Fórmula: `costo = (tokens * 0.7 * precio_input + tokens * 0.3 * precio_output) / 1000`

---

## 7. Sistema de abstención médica

Implementado en `backend/services/abstention_service.py`. Protege al sistema de emitir respuestas sobre diagnósticos, prescripciones o emergencias médicas.

### 7.1 Detección por palabras clave

El servicio mantiene una lista de 35 keywords médicas agrupadas en categorías:

| Categoría | Ejemplos |
|---|---|
| Tratamientos | `tratamiento`, `medicamento`, `pastilla`, `dosis`, `cirugía` |
| Diagnósticos | `diagnóstico`, `diagnosticar`, `padezco`, `síntoma`, `enfermo` |
| Condiciones graves | `cáncer`, `infarto`, `derrame`, `diabetes tipo 1`, `insuficiencia` |
| Emergencias | `emergencia`, `urgencia`, `grave`, `crítico` |
| Poblaciones vulnerables | `embarazada`, `lactancia`, `bebé`, `recién nacido` |
| Profesionales | `doctor`, `médico`, `nutriólogo`, `cardiólogo` |

### 7.2 Detección por patrones regex

```python
r"qué medicina.*tomar"
r"qué medicamento.*para"
r"cómo se cura"
r"cómo tratar"
r"tengo.*qué hago"
r"me diagnosticaron"
r"estoy enferm[oa]"
```

### 7.3 Detección de solicitudes de diagnóstico y prescripción

Patrones adicionales para detectar: `qué tengo`, `qué me pasa`, `qué enfermedad`, `receta para`, `cuánto.*dosis`.

### 7.4 Umbrales de derivación automática

| Condición | Umbral | Acción |
|---|---|---|
| IMC | ≥ 35 (obesidad severa) | `requiere_derivacion = true` |
| IMC | ≥ 40 (obesidad mórbida) | `requiere_derivacion = true` |
| riesgo_prevent | ≥ 0.20 (20%) | `requiere_derivacion = true` |
| Consulta con síntomas | keywords: `dolor`, `síntoma`, `malestar` | `requiere_derivacion = true` |

La derivación no bloquea la respuesta — agrega un aviso al final con referencias a servicios de salud de la UNAH.

---

## 8. Algoritmo de riesgo ECNT

### 8.1 Categorización de riesgo cardiovascular

Calculado por el trigger `calcular_categoria_riesgo_trigger` al guardar el perfil:

| riesgo_prevent | Categoría | Acción adicional |
|---|---|---|
| < 0.05 (< 5%) | `bajo` | — |
| 0.05 – 0.09 (5–9%) | `moderado` | — |
| 0.10 – 0.19 (10–19%) | `alto` | — |
| ≥ 0.20 (≥ 20%) | `muy_alto` | Derivación automática |

El campo `riesgo_prevent` corresponde al **score PREVENT** (Predicting Risk of cardiovascular disease EVENTs), adoptado por la AHA en 2023, que incorpora edad, sexo, presión sistólica, colesterol, glucosa, tabaquismo e IMC.

### 8.2 IMC calculado

Columna generada en la base de datos:
```sql
imc DECIMAL(4,2) GENERATED ALWAYS AS
    (peso_kg / ((altura_cm / 100) * (altura_cm / 100))) STORED
```

### 8.3 Proyecciones de ECNT

Las proyecciones para cada enfermedad se calculan en el backend (`api/proyecciones.py`) combinando dos componentes:

- **score_perfil**: basado en IMC, edad, sexo, antecedentes familiares, actividad física y tabaquismo.
- **score_dieta**: basado en el promedio de calorías, porcentaje de carbohidratos, proteína y grasas de los últimos 7 días.

El `score_total = score_perfil + score_dieta` determina el `nivel_riesgo` y la `tendencia_dieta`. Los factores individuales se guardan en el campo JSONB `factores` para trazabilidad.

---

## 9. Módulo de recomendaciones

Las recomendaciones se generan **íntegramente en el frontend** (`frontend/src/pages/Recomendaciones.tsx`) mediante un algoritmo determinístico. No realizan llamadas al backend.

### 9.1 Algoritmo de recomendaciones (frontend)

El algoritmo evalúa el perfil del usuario y su dieta de los últimos 7 días y produce objetos con estructura:

```typescript
{
  id: string,
  titulo: string,
  descripcion: string,
  nivel: 'alerta' | 'precaucion' | 'info' | 'ok',
  categoria: string
}
```

### 9.2 Persistencia

Las recomendaciones generadas se persisten diariamente en la tabla `recomendaciones_guardadas` mediante un `UPSERT` en Supabase con clave única `(user_id, fecha)`. Esto permite consultar el historial de recomendaciones de días anteriores sin regenerarlas.

---

## 10. API REST

El backend expone la API bajo el prefijo `/api/v1`. Documentación interactiva disponible en `/docs` (Swagger UI) con el servidor en ejecución.

### 10.1 Endpoints por módulo

#### Health
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | No | Estado del servidor y conexión a BD |

#### Chat (RAG)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/chat/consulta` | Opcional | Consulta nutricional con pipeline RAG |
| `GET` | `/chat/conversaciones/{user_id}` | Sí | Historial de conversaciones del usuario |
| `GET` | `/chat/estadisticas` | Admin | Métricas del sistema de chat |

#### Alimentos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/alimentos/buscar` | No | Búsqueda FTS + filtros |
| `GET` | `/alimentos/{id}` | No | Detalle nutricional completo |
| `POST` | `/alimentos/recomendar` | No | Búsqueda semántica RAG en guías |

#### Perfil
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/perfil/{user_id}` | Sí | Obtener perfil propio |
| `POST` | `/perfil/{user_id}` | Sí | Crear / actualizar perfil |
| `DELETE` | `/perfil/{user_id}` | Sí | Eliminar perfil |
| `DELETE` | `/perfil/{user_id}/cuenta` | Sí | Eliminar cuenta completa |

#### Comidas
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/comidas/{user_id}` | Sí | Diario alimentario del usuario |
| `POST` | `/comidas/registrar` | Sí | Registrar comida |
| `DELETE` | `/comidas/{registro_id}` | Sí | Eliminar registro de comida |

#### Exámenes
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/examenes/{user_id}` | Sí | Guardar resultado de examen médico |
| `GET` | `/examenes/{user_id}` | Sí | Historial de exámenes |
| `DELETE` | `/examenes/{user_id}/{examen_id}/{fecha}` | Sí | Eliminar resultado |

#### Proyecciones
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/proyecciones/{user_id}` | Sí | Proyecciones ECNT del usuario |

#### Administración
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/admin/resumen` | Admin | Panel de auditoría y estadísticas |

### 10.2 Rate limiting

El endpoint `/chat/consulta` implementa rate limiting en memoria: **máximo 30 requests por minuto por `user_id`**, usando un diccionario de timestamps por usuario (`{ user_id: [timestamps] }`). Se retorna HTTP 429 al exceder el límite.

---

## 11. Seguridad

### 11.1 Autenticación

Supabase Auth emite tokens JWT firmados con ES256/RS256. El backend valida cada token en `dependencies.py` consultando el endpoint de verificación de Supabase. Los tokens tienen expiración corta; el frontend gestiona el refresco automático.

### 11.2 Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Políticas aplicadas:

| Tabla | Lectura | Escritura |
|---|---|---|
| `alimentos` | Pública (sin auth) | Solo service role |
| `knowledge_base` | Pública | Solo service role |
| `perfiles_usuarios` | Solo propio (`auth.uid() = user_id`) | Solo propio |
| `registros_comidas` | Solo propio | Solo propio |
| `conversaciones` | Solo propio | Solo propio |
| `proyecciones_ecnt` | Solo propio | Backend (service role) |
| `logs_sistema` | Denegado a usuarios | Service role |

### 11.3 Protección IDOR

Cada endpoint del backend valida que el `user_id` en la ruta corresponda al `uid` del token JWT. Intentar acceder a datos de otro usuario retorna HTTP 403.

### 11.4 Whitelist de columnas en perfil

El endpoint `POST /perfil/{user_id}` valida que los campos enviados pertenezcan a una lista explícita de columnas permitidas, previniendo SQL injection por nombre de columna dinámica.

### 11.5 Variables sensibles

Las variables `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL` nunca se exponen al frontend. Solo variables con prefijo `VITE_` se incluyen en el bundle de Vite.

---

## 12. Despliegue en producción

### 12.1 Topología recomendada

```
Internet
   │
   ├── Vercel (frontend React)
   │     └── Build: npm run build → dist/
   │
   └── Render / Railway (backend FastAPI)
         └── Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
               │
               └── Supabase (PostgreSQL + Auth)
                     └── pgvector activo
```

### 12.2 Variables de entorno por entorno

#### Backend (producción)
```env
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon-jwt>
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt>
DATABASE_URL=postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_TOKENS=800
ADMIN_EMAILS=admin@unah.hn,...
```

#### Frontend (producción)
```env
VITE_API_URL=https://nutririesgo-backend.onrender.com
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-jwt>
```

### 12.3 CORS

El backend configura CORS en `main.py` aceptando:
- `http://localhost:3000`, `http://localhost:5173` (desarrollo)
- Dominio de producción en Vercel

### 12.4 Proxy de desarrollo

`vite.config.ts` redirige las peticiones `/api/*` a `http://localhost:8000`, eliminando errores de CORS en desarrollo local.

---

## 13. Scripts de procesamiento de datos

Los scripts en `scripts/` generan los archivos de `data/processed/` que el backend indexa. Solo se ejecutan una vez al setup inicial o al actualizar fuentes.

### 13.1 `process_pdfs.py` — Chunking de guías clínicas

**Entrada:** 10 PDFs en `data/raw/`
**Salida:** `data/processed/chunks_guias.json` — 649 fragmentos

**Proceso:**
1. Extracción de texto con PyMuPDF (`fitz`).
2. División en fragmentos de 200–500 tokens usando `tiktoken` (codificación `cl100k_base`).
3. Asignación de metadatos: `tipo`, `autoridad`, `fecha`, `sección`.

> El PDF `Recomendaciones dietéticas diarias del INCAP.pdf` es una imagen escaneada (0 capa de texto) y se maneja con una excepción controlada.

**Schema de cada chunk:**
```json
{
  "id": "CHUNK0001",
  "texto": "...",
  "metadatos": {
    "tipo": "guia_clinica",
    "autoridad": "OPS/OMS",
    "fecha": "2023",
    "seccion": "Alimentación saludable"
  }
}
```

### 13.2 `build_alimentos.py` — Base nutricional unificada

**Entrada:** CSVs USDA FDC + `INCAP-Tablas.pdf` + datos manuales Honduras
**Salida:** `data/processed/alimentos.json` — 92 891 alimentos (46 MB)

| Fuente | Método de extracción | Alimentos |
|---|---|---|
| USDA FDC | Lectura de `food_nutrient.csv` (27M filas) en chunks de 500K filas; filtro por `fdc_id` y `nutrient_id` | 91 251 |
| INCAP | Parser posicional por coordenada X en `INCAP-Tablas.pdf` (página 26 en adelante) | 1 448 |
| Manual Honduras | Lista estática de alimentos y bebidas tradicionales hondureñas | 192 |

**Nutrientes USDA extraídos (IDs):**

| Nutriente | ID USDA |
|---|---|
| Energía (kcal) | 1008 |
| Proteína (g) | 1003 |
| Grasa total (g) | 1004 |
| Carbohidratos (g) | 1005 |
| Fibra (g) | 1079 |
| Calcio (mg) | 1087 |
| Hierro (mg) | 1089 |
| Sodio (mg) | 1093 |
| Vitamina C (mg) | 1162 |
| Zinc (mg) | 1095 |

### 13.3 Scripts de indexación (backend)

Una vez generados los archivos JSON, se ejecutan desde `backend/scripts/`:

```bash
# Indexar embeddings de knowledge_base en pgvector
python scripts/generar_embeddings.py

# Indexar alimentos en la tabla alimentos
python scripts/indexar_alimentos.py
```

---

## 14. Vistas analíticas

El schema incluye 5 vistas para monitoreo y análisis académico:

| Vista | Descripción |
|---|---|
| `vista_resumen_alimentos` | Estadísticas por categoría: total, calorías/proteínas promedio, completitud |
| `vista_resumen_conocimiento` | Chunks por tipo de documento, autoridad y nivel de evidencia |
| `vista_distribucion_riesgo` | Distribución de usuarios por categoría de riesgo cardiovascular |
| `vista_metricas_chat` | Consultas diarias, abstenciones, derivaciones, latencia y costo |
| `vista_consumo_semanal` | Ingesta nutricional semanal por usuario y tiempo de comida |

Estas vistas son accesibles desde el panel de auditoría (`/admin`) y desde consultas directas en Supabase con credenciales de administrador.

---

## 15. Limitaciones conocidas

| Limitación | Descripción |
|---|---|
| **Rate limiting en memoria** | El límite de 30 req/min por usuario se almacena en un dict de Python. Se pierde al reiniciar el servidor. Para producción se recomienda Redis. |
| **Embeddings en schema** | `db_schema_v3.sql` declara `vector(384)` (versión heredada). La columna en producción debe ser `vector(1536)`. |
| **Recomendaciones sin IA** | El módulo de recomendaciones usa reglas determinísticas en el frontend, no el modelo RAG. |
| **Score PREVENT simplificado** | El cálculo de `riesgo_prevent` en el perfil es una aproximación. La fórmula PREVENT completa requiere resultados de laboratorio que el usuario puede no tener. |
| **Sin soporte multiusuario concurrente extensivo** | El backend no usa workers múltiples por defecto. Para carga alta se necesita configurar `--workers N` en Uvicorn o usar Gunicorn. |
| **Datos USDA en inglés** | Los nombres de alimentos USDA están en inglés. La búsqueda FTS está configurada para español; alimentos USDA solo son recuperables si el usuario escribe en inglés o si se indexan por sinonimia. |
| **Población objetivo limitada** | El sistema está calibrado para estudiantes adultos (18+) de la UNAH. No está validado para menores de edad, mujeres embarazadas ni personas con condiciones crónicas diagnosticadas. |

---

*Manual Técnico — NutriColleague v1.0 | Copyright (c) 2026 Lizzy P. Mejía — Todos los derechos reservados.*
*Ver [LICENSE](../LICENSE) para condiciones de uso.*

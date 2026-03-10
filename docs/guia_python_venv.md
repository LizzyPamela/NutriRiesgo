# Guía Python: Entornos Virtuales, Paquetes y Ejecución de Scripts

## ¿Qué es un entorno virtual (venv)?

Un entorno virtual es una instalación de Python aislada del sistema. Sirve para que cada proyecto tenga sus propias dependencias sin afectar a otros proyectos ni a la instalación global de Python.

---

## 1. Crear un entorno virtual

Desde la **raíz del proyecto**:

```cmd
python -m venv venv
```

Esto crea una carpeta `venv/` con su propio Python y pip.

> **Nota:** El nombre `venv` es convención. Puede llamarse como quieras, pero `venv` es lo estándar.

---

## 2. Activar el entorno virtual

Debes activar el venv **cada vez que abras una terminal nueva**.

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
venv\Scripts\activate.bat
```

**Mac / Linux:**
```bash
source venv/bin/activate
```

Cuando está activo, verás el nombre del venv al inicio del prompt:
```
(venv) PS C:\Users\Lizzy.Mejia\Documents\GitHub\NutriRiesgo>
```

---

## 3. Desactivar el entorno virtual

```cmd
deactivate
```

---

## 4. Instalar paquetes

### Dentro del venv (recomendado para proyectos)

Primero activa el venv, luego:

```cmd
pip install nombre-paquete
```

Ejemplos:
```cmd
pip install python-dotenv
pip install psycopg2-binary
pip install openai
```

### Instalar desde requirements.txt

Si el proyecto ya tiene un `requirements.txt`:

```cmd
pip install -r backend\requirements.txt
```

### Globalmente (sin venv activo)

Si no hay venv activo, pip instala en Python global del sistema:

```cmd
python -m pip install nombre-paquete
```

> **Advertencia:** Instalar globalmente puede causar conflictos entre proyectos. Siempre prefiere usar un venv.

---

## 5. Ver paquetes instalados

```cmd
pip list
```

Ver solo los paquetes del proyecto (sin los de stdlib):
```cmd
pip freeze
```

---

## 6. Guardar dependencias en requirements.txt

```cmd
pip freeze > requirements.txt
```

O si el archivo está en una subcarpeta:
```cmd
pip freeze > backend\requirements.txt
```

---

## 7. Ejecutar scripts Python

### Desde la raíz del proyecto (recomendado)

Siempre ejecuta scripts desde la carpeta raíz para que las rutas relativas funcionen correctamente:

```cmd
cd C:\Users\Lizzy.Mejia\Documents\GitHub\NutriRiesgo
python backend\scripts\mi_script.py
```

### Desde otra carpeta (puede romper rutas relativas)

```cmd
cd backend\scripts
python mi_script.py   # las rutas relativas como "data/processed/..." pueden fallar
```

> **Regla:** Si el script usa rutas como `data/processed/archivo.json`, ejecútalo siempre desde la raíz del proyecto.

---

## 8. Flujo completo de trabajo (día a día)

```cmd
# 1. Abrir terminal en la raíz del proyecto
cd C:\Users\Lizzy.Mejia\Documents\GitHub\NutriRiesgo

# 2. Activar el venv
.\venv\Scripts\Activate.ps1

# 3. (Primera vez o tras agregar paquetes) Instalar dependencias
pip install -r backend\requirements.txt

# 4. Ejecutar el script
python backend\scripts\mi_script.py
```

---

## 9. Solución de problemas comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `ModuleNotFoundError: No module named 'dotenv'` | Paquete no instalado en el venv activo | Activar venv y correr `pip install -r backend\requirements.txt` |
| `The system cannot find the path specified` al activar | La carpeta `venv` no existe | Crear con `python -m venv venv` |
| Rutas relativas fallan (`data/processed/...` no encontrado) | Script ejecutado desde directorio incorrecto | Ejecutar desde la raíz del proyecto |
| `python` no reconocido | Python no está en el PATH del sistema | Reinstalar Python marcando "Add to PATH" |

---

## 10. Estructura recomendada del proyecto

```
NutriRiesgo/
├── venv/                   # Entorno virtual (NO se sube a git)
├── backend/
│   ├── requirements.txt    # Dependencias del proyecto
│   └── scripts/
│       └── mi_script.py
├── data/
│   └── processed/
└── .gitignore              # Debe incluir "venv/"
```

Asegúrate de que `.gitignore` contenga:
```
venv/
__pycache__/
*.pyc
.env
```

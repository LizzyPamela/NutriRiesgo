"""
Extrae y segmenta los PDFs de Enfermedades Crónicas No Transmisibles (ECNT)
en data/raw/ecnt/ y guarda en data/processed/chunks_ecnt.json

Metadato adicional: campo 'ecnt' identifica la enfermedad
(diabetes | hta | cardiovascular | obesidad)
para filtrado semántico en el endpoint de proyecciones.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

try:
    import fitz
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pymupdf"])
    import fitz

try:
    import tiktoken
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "tiktoken"])
    import tiktoken

ECNT_DIR = Path("data/raw/ecnt")
OUT_FILE  = Path("data/processed/chunks_ecnt.json")
OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

TARGET_MIN = 200
TARGET_MAX = 500
ENC = tiktoken.get_encoding("cl100k_base")

# Metadatos por PDF — incluye campo 'ecnt' para filtrado de proyecciones.
# El campo 'autoridad' usa SOLO los valores permitidos por el check constraint
# de la tabla knowledge_base: OPS/OMS, OMS, INCAP, INCAP/OPS, Honduras,
# Honduras/DOE, Honduras/CHEPES.
# La fuente original se preserva en el campo 'seccion'.
PDF_META = {
    "CUB_D1_Guía HTA CUBA.pdf": {
        "tipo": "guia_clinica", "autoridad": "OPS/OMS", "fecha": "2024",
        "seccion": "Guia HTA Cuba (Cuba/MINSAP)", "ecnt": "hta",
    },
    "Diabetes mellitus tipo II.pdf": {
        "tipo": "guia_clinica", "autoridad": "Honduras", "fecha": "2024",
        "seccion": "Diabetes mellitus tipo 2 (Honduras/SESAL)", "ecnt": "diabetes",
    },
    "Final_GPC_ESC_2024_PA_elevada_e_hipertensión.pdf": {
        "tipo": "guia_clinica", "autoridad": "OPS/OMS", "fecha": "2024",
        "seccion": "Guia ESC presion arterial elevada e hipertension (ESC/Europa)", "ecnt": "hta",
    },
    "HIPERTENSION ARTERIAL.pdf": {
        "tipo": "guia_clinica", "autoridad": "Honduras", "fecha": "2023",
        "seccion": "Hipertension arterial Honduras", "ecnt": "hta",
    },
    "PRY_D1_Guia_tratamiento_Diabetes.pdf": {
        "tipo": "guia_clinica", "autoridad": "OPS/OMS", "fecha": "2024",
        "seccion": "Guia tratamiento diabetes (Paraguay/MSP)", "ecnt": "diabetes",
    },
    "Protocolo-de-Atencion-Clinica-para-la-Prevencion-Diagnostico-y-Tratamiento-de-Hipertension-Arteriasl-Esencial-en-el-Primer-Nivel-de-Atencion.pdf": {
        "tipo": "guia_clinica", "autoridad": "Honduras", "fecha": "2023",
        "seccion": "Protocolo HTA Primer Nivel Atencion (Honduras/SESAL)", "ecnt": "hta",
    },
    "lichtenstein-et-al-2021-2021-dietary-guidance-to-improve-cardiovascular-health-a-scientific-statement-from-the-american.pdf": {
        "tipo": "guia_clinica", "autoridad": "OPS/OMS", "fecha": "2021",
        "seccion": "Guia alimentaria salud cardiovascular (AHA/ACC 2021)", "ecnt": "cardiovascular",
    },
    "seedo_guia_giro_final_20240619.pdf": {
        "tipo": "guia_clinica", "autoridad": "OPS/OMS", "fecha": "2024",
        "seccion": "Guia obesidad SEEDO 2024 (SEEDO/España)", "ecnt": "obesidad",
    },
}


def count_tokens(text: str) -> int:
    return len(ENC.encode(text))


def clean_text(text: str) -> str:
    text = re.sub(r"^\s*\d{1,4}\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"-\n(?=[a-zA-Z\u00e0-\u00fc])", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def split_paragraphs(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip() and len(p.strip()) > 20]


def chunk_paragraphs(paragraphs: list[str], meta: dict) -> list[dict]:
    chunks: list[dict] = []
    buffer: list[str] = []
    buffer_tokens = 0

    def flush(buf: list[str]) -> None:
        text = "\n\n".join(buf)
        chunks.append({"texto": text, "metadatos": dict(meta), "tokens": count_tokens(text)})

    for para in paragraphs:
        pt = count_tokens(para)
        if pt > TARGET_MAX:
            for sent in re.split(r"(?<=[.!?])\s+", para):
                st = count_tokens(sent)
                if buffer_tokens + st > TARGET_MAX and buffer_tokens >= TARGET_MIN:
                    flush(buffer)
                    buffer, buffer_tokens = [], 0
                buffer.append(sent)
                buffer_tokens += st
            continue
        if buffer_tokens + pt > TARGET_MAX and buffer_tokens >= TARGET_MIN:
            flush(buffer)
            buffer, buffer_tokens = [], 0
        buffer.append(para)
        buffer_tokens += pt

    if buffer:
        flush(buffer)

    return chunks


def extract_pdf(path: Path) -> str:
    doc = fitz.open(str(path))
    pages = [p.get_text("text") for p in doc if p.get_text("text").strip()]
    doc.close()
    if not pages:
        return f"[PDF escaneado sin capa de texto: {path.name}]"
    return "\n\n".join(pages)


def main() -> None:
    if not ECNT_DIR.exists():
        print(f"ERROR: No se encuentra el directorio {ECNT_DIR}")
        sys.exit(1)

    all_chunks: list[dict] = []
    pdfs = sorted(p for p in ECNT_DIR.iterdir() if p.suffix.lower() == ".pdf")

    if not pdfs:
        print(f"No se encontraron PDFs en {ECNT_DIR}")
        sys.exit(1)

    print(f"Procesando {len(pdfs)} PDFs ECNT...\n")

    for pdf_path in pdfs:
        # Normalizar NFC para manejar nombres con acentos descompuestos (NFD)
        nombre_nfc = unicodedata.normalize("NFC", pdf_path.name)
        meta = PDF_META.get(
            nombre_nfc,
            {
                "tipo": "guia_clinica", "autoridad": "OPS/OMS",
                "fecha": "2024", "seccion": pdf_path.stem, "ecnt": "general",
            },
        )
        safe_name = pdf_path.name.encode("ascii", "replace").decode("ascii")
        print(f"  {safe_name[:60]:<60}", end=" ", flush=True)
        try:
            raw = extract_pdf(pdf_path)
            file_chunks = chunk_paragraphs(split_paragraphs(clean_text(raw)), meta)
            all_chunks.extend(file_chunks)
            tokens = sum(c["tokens"] for c in file_chunks)
            print(f"{len(file_chunks):>4} chunks | {tokens:>7,} tokens | ECNT: {meta['ecnt']}")
        except Exception as e:
            print(f"ERROR: {e}")

    # Asignar IDs correlativos con prefijo ECNT
    output = [
        {"id": f"ECNT{i:04d}", "texto": c["texto"], "metadatos": c["metadatos"]}
        for i, c in enumerate(all_chunks, 1)
    ]

    OUT_FILE.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nTotal: {len(output)} chunks ECNT -> {OUT_FILE}")
    print("\nDistribucion por ECNT:")
    from collections import Counter
    dist = Counter(c["metadatos"]["ecnt"] for c in output)
    for ecnt, n in sorted(dist.items()):
        print(f"  {ecnt:<20} {n:>4} chunks")


if __name__ == "__main__":
    main()

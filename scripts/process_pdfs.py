"""
Extrae texto de los PDFs en data/raw/ y los segmenta en chunks de 200-500 tokens.
Guarda resultado en data/processed/chunks_guias.json
"""
import json
import re
import sys
from pathlib import Path
import fitz  # pymupdf
import tiktoken

RAW_DIR  = Path("data-guias")
OUT_FILE = Path("data/processed/chunks_guias.json")
OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

TARGET_MIN = 200
TARGET_MAX = 500
ENC = tiktoken.get_encoding("cl100k_base")

PDF_META = {
    "2ncd-roadmap.pdf":                        {"tipo": "guia_clinica",        "autoridad": "OPS/OMS",         "fecha": "2023", "seccion": "Enfermedades no transmisibles - Hoja de ruta"},
    "DOE-IAE-2012.pdf":                        {"tipo": "politica_alimentaria", "autoridad": "Honduras/DOE",    "fecha": "2012", "seccion": "Inseguridad Alimentaria y Energetica"},
    "Guias Alimentarias de Centroamerica.pdf": {"tipo": "guia_alimentaria",    "autoridad": "INCAP/OPS",       "fecha": "2012", "seccion": "Guias alimentarias Centroamerica"},
    "Guidelines-for-assessment-and-management-of-cardiovascular-risk-EN.pdf": {"tipo": "guia_clinica", "autoridad": "OMS", "fecha": "2023", "seccion": "Riesgo cardiovascular"},
    "HON-Politica-SAN-LargoPlazo.pdf":         {"tipo": "politica_alimentaria", "autoridad": "Honduras",        "fecha": "2010", "seccion": "Politica SAN Honduras largo plazo"},
    "INCAP-Tablas.pdf":                        {"tipo": "tabla_nutricional",   "autoridad": "INCAP",           "fecha": "2012", "seccion": "Tablas de composicion de alimentos"},
    "Políticas_Seguridad_Alimentaria_Nutricional Honduras_CHEPES.pdf": {"tipo": "politica_alimentaria", "autoridad": "Honduras/CHEPES", "fecha": "2010", "seccion": "Politicas SAN Honduras"},
    "Recomendaciones dietéticas diarias del INCAP.pdf": {"tipo": "guia_nutricional", "autoridad": "INCAP", "fecha": "2012", "seccion": "Recomendaciones dieteticas diarias"},
    "agenda-item-7-ncd-implementation-roadmap.pdf": {"tipo": "guia_clinica",  "autoridad": "OPS/OMS",         "fecha": "2022", "seccion": "ENT - Implementacion hoja de ruta"},
    "healthy-diet-fact-sheet-oms.pdf":         {"tipo": "guia_alimentaria",    "autoridad": "OMS",             "fecha": "2020", "seccion": "Dieta saludable OMS"},
}

def count_tokens(text):
    return len(ENC.encode(text))

def clean_text(text):
    text = re.sub(r"^\s*\d{1,4}\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"-\n(?=[a-zA-Z\u00e0-\u00fc])", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()

def split_paragraphs(text):
    return [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip() and len(p.strip()) > 20]

def chunk_paragraphs(paragraphs, meta):
    chunks, buffer, buffer_tokens = [], [], 0

    def flush(buf):
        text = "\n\n".join(buf)
        chunks.append({"texto": text, "metadatos": dict(meta), "tokens": count_tokens(text)})

    for para in paragraphs:
        pt = count_tokens(para)
        if pt > TARGET_MAX:
            for sent in re.split(r"(?<=[.!?])\s+", para):
                st = count_tokens(sent)
                if buffer_tokens + st > TARGET_MAX and buffer_tokens >= TARGET_MIN:
                    flush(buffer); buffer, buffer_tokens = [], 0
                buffer.append(sent); buffer_tokens += st
            continue
        if buffer_tokens + pt > TARGET_MAX and buffer_tokens >= TARGET_MIN:
            flush(buffer); buffer, buffer_tokens = [], 0
        buffer.append(para); buffer_tokens += pt
    if buffer:
        flush(buffer)
    return chunks

def extract_pdf(path):
    doc = fitz.open(str(path))
    pages = [p.get_text("text") for p in doc if p.get_text("text").strip()]
    doc.close()
    if not pages:
        return f"[PDF escaneado sin capa de texto: {path.name}]"
    return "\n\n".join(pages)

def main():
    all_chunks = []
    for pdf_path in sorted(p for p in RAW_DIR.iterdir() if p.suffix.lower() == ".pdf"):
        meta = PDF_META.get(pdf_path.name, {"tipo": "documento", "autoridad": "desconocido", "fecha": "desconocida", "seccion": pdf_path.stem})
        print(f"  {pdf_path.name} ...", end=" ", flush=True)
        try:
            clean = clean_text(extract_pdf(pdf_path))
            file_chunks = chunk_paragraphs(split_paragraphs(clean), meta)
            all_chunks.extend(file_chunks)
            print(f"{len(file_chunks)} chunks | {sum(c['tokens'] for c in file_chunks):,} tokens")
        except Exception as e:
            print(f"ERROR: {e}")

    output = [{"id": f"CHUNK{i:04d}", "texto": c["texto"], "metadatos": c["metadatos"]} for i, c in enumerate(all_chunks, 1)]
    OUT_FILE.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nTotal: {len(output)} chunks -> {OUT_FILE}")

if __name__ == "__main__":
    main()

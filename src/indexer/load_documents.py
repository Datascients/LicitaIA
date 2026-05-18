"""
Paso 02 — Pipeline de indexación de documentos en Pinecone.
Ejecutar: python -m src.indexer.load_documents
"""
import os
import re
import json
import time
import unicodedata
from pathlib import Path
from datetime import date

from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

DOCS_DIR = Path(__file__).parent.parent.parent / "docs"
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "licitaia-docs")
CHUNK_SIZE = 512        # tokens approx; we use char-based heuristic (~4 chars/token)
CHUNK_OVERLAP = 64
BATCH_SIZE = 100
MIN_SIMILARITY = 0.72

# Namespace por tipo de documento
NAMESPACE_MAP = {
    "bases_generales": "bases-generales",
    "requisitos_pyme": "requisitos-pyme",
    "bases_tecnicas": "bases-concurso-{concurso_id}",
    "registro_proveedores": "registro-proveedores",
    "politica_inhabilitaciones": "inhabilitaciones",
}

# Metadatos por archivo fuente
FILE_METADATA = {
    "Reglamento de la Ley 19886.pdf": {
        "tipo_documento": "ley",
        "fuente": "ley_19886",
        "fecha_vigencia": "2027-12-31",
        "seccion": "requisitos_generales",
    },
    "Bases Tipo Adquisición de Vehículos Motorizados.pdf": {
        "tipo_documento": "bases_tecnicas",
        "fuente": "bases_tecnicas_concurso_001.txt",
        "concurso_id": "001",
        "fecha_vigencia": "2027-12-31",
        "seccion": "bases_especificas",
    },
    "Manual-de-Compras-DCCP.pdf": {
        "tipo_documento": "instructivo",
        "fuente": "chileproveedores",
        "fecha_vigencia": "2027-12-31",
        "seccion": "registro_proveedores",
    },
    "politica_inhabilitaciones.txt": {
        "tipo_documento": "politica",
        "fuente": "ley_19886_art4",
        "fecha_vigencia": "2027-12-31",
        "seccion": "inhabilitaciones",
    },
}


def chunk_by_clause(text: str) -> list[dict]:
    """
    Divide el texto por cláusula/artículo legal.
    Nunca corta una cláusula a la mitad.
    Aplica overlap capturando el encabezado de la cláusula previa.
    """
    patterns = [
        r"(?=(?:Artículo|Art\.|Cláusula|CLÁUSULA|Sección|SECCIÓN|Capítulo|CAPÍTULO)\s+\d+[\w°]*)",
        r"(?=\n[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{4,}\n)",
        r"(?=\n\d+\.\d+[\s\-])",
    ]
    combined = "|".join(patterns)
    sections = re.split(combined, text)
    sections = [s.strip() for s in sections if s.strip()]

    chunks = []
    char_limit = CHUNK_SIZE * 4  # ~4 chars per token
    overlap_chars = CHUNK_OVERLAP * 4

    for i, section in enumerate(sections):
        if len(section) <= char_limit:
            chunk_text = section
            if i > 0 and len(sections[i - 1]) > 0:
                prev_header = sections[i - 1][:overlap_chars]
                chunk_text = prev_header + "\n\n" + chunk_text
            header = _extract_header(section)
            chunks.append({"text": chunk_text, "articulo": header, "chunk_index": len(chunks)})
        else:
            # Sección muy larga: subdividir respetando párrafos
            paragraphs = section.split("\n\n")
            current = ""
            for para in paragraphs:
                if len(current) + len(para) > char_limit and current:
                    header = _extract_header(current)
                    chunks.append({"text": current.strip(), "articulo": header, "chunk_index": len(chunks)})
                    current = para
                else:
                    current = current + "\n\n" + para if current else para
            if current.strip():
                header = _extract_header(current)
                chunks.append({"text": current.strip(), "articulo": header, "chunk_index": len(chunks)})

    return chunks


def _extract_header(text: str) -> str:
    first_line = text.strip().split("\n")[0][:80]
    return first_line


def read_document(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(p for p in pages if p.strip())
    return f"[Formato no soportado: {path.name}]"


def get_namespace(meta: dict) -> str:
    tipo = meta.get("tipo_documento", "")
    if tipo == "ley" and "ley_19886" in meta.get("fuente", ""):
        return "bases-generales"
    if tipo == "ley" and "ley_20416" in meta.get("fuente", ""):
        return "requisitos-pyme"
    if tipo == "bases_tecnicas":
        return f"bases-concurso-{meta.get('concurso_id', '000')}"
    if tipo == "instructivo":
        return "registro-proveedores"
    if tipo == "politica":
        return "inhabilitaciones"
    return "bases-generales"


def embed_batch(client: OpenAI, texts: list[str]) -> list[list[float]]:
    resp = client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [r.embedding for r in resp.data]


def load_documents():
    openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])

    if INDEX_NAME not in pc.list_indexes().names():
        pc.create_index(
            name=INDEX_NAME,
            dimension=1536,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        time.sleep(10)

    index = pc.Index(INDEX_NAME)
    today = date.today().isoformat()
    total_chunks = 0

    for file_path in sorted(DOCS_DIR.iterdir()):
        if file_path.name == "README.md" or file_path.suffix not in {".pdf", ".docx", ".txt"}:
            continue

        file_meta = FILE_METADATA.get(file_path.name, {
            "tipo_documento": "instructivo",
            "fuente": file_path.name,
            "fecha_vigencia": "2027-12-31",
            "seccion": "general",
        })

        text = read_document(file_path)
        chunks = chunk_by_clause(text)
        namespace = get_namespace(file_meta)

        print(f"\n[DOC] {file_path.name} -> {len(chunks)} chunks -> ns:{namespace}")

        texts = [c["text"] for c in chunks]
        vectors = []

        for i in range(0, len(texts), BATCH_SIZE):
            batch_texts = texts[i : i + BATCH_SIZE]
            embeddings = embed_batch(openai_client, batch_texts)
            for j, emb in enumerate(embeddings):
                idx = i + j
                chunk = chunks[idx]
                meta = {
                    **file_meta,
                    "articulo": chunk["articulo"],
                    "fecha_indexacion": today,
                    "text": chunk["text"][:1000],  # Pinecone metadata limit
                }
                stem_ascii = unicodedata.normalize("NFKD", file_path.stem).encode("ascii", "ignore").decode("ascii")
                stem_ascii = re.sub(r"[^A-Za-z0-9_\-]", "_", stem_ascii)
                vid = f"{stem_ascii}__chunk_{chunk['chunk_index']}"
                vectors.append({"id": vid, "values": emb, "metadata": meta})

        # Subir en batches de 100
        for i in range(0, len(vectors), BATCH_SIZE):
            index.upsert(vectors=vectors[i : i + BATCH_SIZE], namespace=namespace)

        total_chunks += len(chunks)
        print(f"   OK {len(chunks)} chunks subidos")

    print(f"\nIndexacion completada. Total chunks: {total_chunks}")


if __name__ == "__main__":
    load_documents()

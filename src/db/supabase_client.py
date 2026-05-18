import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client


# ── Empresas ───────────────────────────────────────────────────────────────

def get_empresa(empresa_id: str) -> dict | None:
    resp = get_client().table("empresas").select("*").eq("id", empresa_id).single().execute()
    return resp.data


def get_empresa_by_rut(rut: str) -> dict | None:
    resp = get_client().table("empresas").select("*").eq("rut", rut).single().execute()
    return resp.data


def upsert_empresa(data: dict) -> dict:
    resp = get_client().table("empresas").upsert(data).execute()
    return resp.data[0]


# ── Concursos ──────────────────────────────────────────────────────────────

def get_concurso(concurso_id: str) -> dict | None:
    resp = get_client().table("concursos").select("*").eq("id", concurso_id).single().execute()
    return resp.data


def list_concursos_activos() -> list[dict]:
    resp = (
        get_client()
        .table("concursos")
        .select("*")
        .eq("estado", "activo")
        .order("fecha_cierre", desc=False)
        .execute()
    )
    return resp.data or []


# ── Postulaciones ──────────────────────────────────────────────────────────

def get_or_create_postulacion(empresa_id: str, concurso_id: str) -> dict:
    resp = (
        get_client()
        .table("postulaciones")
        .select("*")
        .eq("empresa_id", empresa_id)
        .eq("concurso_id", concurso_id)
        .execute()
    )
    if resp.data:
        return resp.data[0]
    new = (
        get_client()
        .table("postulaciones")
        .insert({"empresa_id": empresa_id, "concurso_id": concurso_id, "estado": "guardado"})
        .execute()
    )
    return new.data[0]


# ── Checklists ─────────────────────────────────────────────────────────────

def get_checklist(postulacion_id: str) -> list[dict]:
    resp = (
        get_client()
        .table("checklists")
        .select("*")
        .eq("postulacion_id", postulacion_id)
        .execute()
    )
    return resp.data or []


def upsert_checklist_item(item: dict) -> dict:
    resp = get_client().table("checklists").upsert(item).execute()
    return resp.data[0]


# ── Interactions ───────────────────────────────────────────────────────────

def log_interaction(data: dict) -> dict:
    resp = get_client().table("interactions").insert(data).execute()
    return resp.data[0]


# ── Feedbacks admin ────────────────────────────────────────────────────────

def create_feedback(data: dict) -> dict:
    resp = get_client().table("feedbacks_admin").insert(data).execute()
    return resp.data[0]


def list_feedbacks_empresa(empresa_id: str) -> list[dict]:
    resp = (
        get_client()
        .table("feedbacks_admin")
        .select("*")
        .eq("empresa_id", empresa_id)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []

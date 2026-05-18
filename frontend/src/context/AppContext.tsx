import { createContext, useContext, useState, useRef, type ReactNode } from 'react';

type Role = 'pyme' | 'admin' | null;

export interface UserProfile {
  email: string;
  nombre?: string;
  cargo?: string;
}

export interface EmpresaForm {
  id: string;
  rut: string;
  razonSocial: string;
  giro: string;
  inicioActividades: string;
  ventasUf: number;
  numTrabajadores: number;
  clasificacionPyme: 'micro' | 'pequena' | 'mediana' | 'no_aplica';
  tieneDeudaPrevisional: boolean;
  tieneDeudaTributaria: boolean;
  tieneDenunciaLaboral: boolean;
  tieneLitigioProveedor: boolean;
  inscritaChileProveedores: boolean;
  certificaciones: string[];
  repLegal: string;
  cargoRepLegal: string;
  estadoPrimerFiltro: 'califica' | 'no_califica' | 'pendiente';
  scoreCompletitud: number;
  fechaRegistro?: string;
}

export interface AdminMensaje {
  id: string;
  empresaId: string;
  tipo: 'informativo' | 'alerta' | 'urgente';
  texto: string;
  fecha: string;
  leido: boolean;
}

interface AppContextType {
  role: Role;
  user: UserProfile | null;
  empresa: EmpresaForm | null;
  allEmpresas: EmpresaForm[];
  mensajesEmpresa: AdminMensaje[];
  login: (role: NonNullable<Role>, user: UserProfile) => void;
  logout: () => void;
  updateEmpresa: (empresa: EmpresaForm) => void;
  enviarMensaje: (empresaId: string, tipo: AdminMensaje['tipo'], texto: string) => void;
  marcarLeido: (mensajeId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const storageKey = (email: string) => `licitaia_empresa_${email}`;
const REGISTRY_KEY = 'licitaia_registro';
const MENSAJES_KEY = 'licitaia_mensajes';

function loadEmpresaFromStorage(email: string): EmpresaForm | null {
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? (JSON.parse(raw) as EmpresaForm) : null;
  } catch {
    return null;
  }
}

function loadRegistry(): EmpresaForm[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    const registry: EmpresaForm[] = raw ? (JSON.parse(raw) as EmpresaForm[]) : [];
    const seenIds = new Set(registry.map(e => e.id));

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('licitaia_empresa_')) continue;
      try {
        const emp = JSON.parse(localStorage.getItem(key)!) as EmpresaForm;
        if (emp?.id && !seenIds.has(emp.id)) {
          registry.push(emp);
          seenIds.add(emp.id);
        }
      } catch { /* clave corrupta, ignorar */ }
    }

    return registry;
  } catch {
    return [];
  }
}

function saveToRegistry(emp: EmpresaForm): EmpresaForm[] {
  const raw = localStorage.getItem(REGISTRY_KEY);
  const registry: EmpresaForm[] = raw ? (JSON.parse(raw) as EmpresaForm[]) : [];
  const idx = registry.findIndex(e => e.id === emp.id);
  if (idx >= 0) registry[idx] = emp;
  else registry.push(emp);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  return loadRegistry();
}

function loadAllMensajes(): AdminMensaje[] {
  try {
    const raw = localStorage.getItem(MENSAJES_KEY);
    return raw ? (JSON.parse(raw) as AdminMensaje[]) : [];
  } catch {
    return [];
  }
}

function getMensajesEmpresa(empresaId: string): AdminMensaje[] {
  return loadAllMensajes().filter(m => m.empresaId === empresaId);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaForm | null>(null);
  const [allEmpresas, setAllEmpresas] = useState<EmpresaForm[]>(() => loadRegistry());
  const [mensajesEmpresa, setMensajesEmpresa] = useState<AdminMensaje[]>([]);
  const emailRef = useRef<string | null>(null);
  const empresaIdRef = useRef<string | null>(null);

  const login = (r: NonNullable<Role>, u: UserProfile) => {
    setRole(r);
    setUser(u);
    emailRef.current = u.email;
    const saved = loadEmpresaFromStorage(u.email);
    setEmpresa(saved);
    empresaIdRef.current = saved?.id ?? null;
    if (saved?.id) setMensajesEmpresa(getMensajesEmpresa(saved.id));
    setAllEmpresas(loadRegistry());
  };

  const logout = () => {
    setRole(null);
    setUser(null);
    setEmpresa(null);
    setMensajesEmpresa([]);
    emailRef.current = null;
    empresaIdRef.current = null;
  };

  const updateEmpresa = (emp: EmpresaForm) => {
    const empWithDate = emp.fechaRegistro ? emp : { ...emp, fechaRegistro: new Date().toISOString() };
    setEmpresa(empWithDate);
    empresaIdRef.current = empWithDate.id;
    if (emailRef.current) {
      localStorage.setItem(storageKey(emailRef.current), JSON.stringify(empWithDate));
    }
    setAllEmpresas(saveToRegistry(empWithDate));
    setMensajesEmpresa(getMensajesEmpresa(empWithDate.id));
  };

  const enviarMensaje = (empresaId: string, tipo: AdminMensaje['tipo'], texto: string) => {
    const todos = loadAllMensajes();
    const nuevo: AdminMensaje = {
      id: crypto.randomUUID(),
      empresaId,
      tipo,
      texto,
      fecha: new Date().toISOString(),
      leido: false,
    };
    todos.push(nuevo);
    localStorage.setItem(MENSAJES_KEY, JSON.stringify(todos));
    // Si el admin le envía a la empresa que actualmente está logueada, actualizar estado
    if (empresaIdRef.current === empresaId) {
      setMensajesEmpresa(getMensajesEmpresa(empresaId));
    }
  };

  const marcarLeido = (mensajeId: string) => {
    const todos = loadAllMensajes().map(m => m.id === mensajeId ? { ...m, leido: true } : m);
    localStorage.setItem(MENSAJES_KEY, JSON.stringify(todos));
    if (empresaIdRef.current) {
      setMensajesEmpresa(getMensajesEmpresa(empresaIdRef.current));
    }
  };

  return (
    <AppContext.Provider value={{ role, user, empresa, allEmpresas, mensajesEmpresa, login, logout, updateEmpresa, enviarMensaje, marcarLeido }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}

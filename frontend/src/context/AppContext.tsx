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

interface AppContextType {
  role: Role;
  user: UserProfile | null;
  empresa: EmpresaForm | null;
  allEmpresas: EmpresaForm[];
  login: (role: NonNullable<Role>, user: UserProfile) => void;
  logout: () => void;
  updateEmpresa: (empresa: EmpresaForm) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const storageKey = (email: string) => `licitaia_empresa_${email}`;
const REGISTRY_KEY = 'licitaia_registro';

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

    // Migrar empresas antiguas almacenadas por email individual
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
  // Cargar sin migración para evitar loop (ya estamos dentro de una escritura)
  const raw = localStorage.getItem(REGISTRY_KEY);
  const registry: EmpresaForm[] = raw ? (JSON.parse(raw) as EmpresaForm[]) : [];
  const idx = registry.findIndex(e => e.id === emp.id);
  if (idx >= 0) registry[idx] = emp;
  else registry.push(emp);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  return loadRegistry(); // devolver con migración para mantener estado completo
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaForm | null>(null);
  const [allEmpresas, setAllEmpresas] = useState<EmpresaForm[]>(() => loadRegistry());
  const emailRef = useRef<string | null>(null);

  const login = (r: NonNullable<Role>, u: UserProfile) => {
    setRole(r);
    setUser(u);
    emailRef.current = u.email;
    const saved = loadEmpresaFromStorage(u.email);
    setEmpresa(saved);
    // loadRegistry ya escanea y migra todas las claves licitaia_empresa_*
    setAllEmpresas(loadRegistry());
  };

  const logout = () => {
    setRole(null);
    setUser(null);
    setEmpresa(null);
    emailRef.current = null;
  };

  const updateEmpresa = (emp: EmpresaForm) => {
    const empWithDate = emp.fechaRegistro ? emp : { ...emp, fechaRegistro: new Date().toISOString() };
    setEmpresa(empWithDate);
    if (emailRef.current) {
      localStorage.setItem(storageKey(emailRef.current), JSON.stringify(empWithDate));
    }
    setAllEmpresas(saveToRegistry(empWithDate));
  };

  return (
    <AppContext.Provider value={{ role, user, empresa, allEmpresas, login, logout, updateEmpresa }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}

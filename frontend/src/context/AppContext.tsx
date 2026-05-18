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
}

interface AppContextType {
  role: Role;
  user: UserProfile | null;
  empresa: EmpresaForm | null;
  login: (role: NonNullable<Role>, user: UserProfile) => void;
  logout: () => void;
  updateEmpresa: (empresa: EmpresaForm) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const storageKey = (email: string) => `licitaia_empresa_${email}`;

function loadEmpresaFromStorage(email: string): EmpresaForm | null {
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? (JSON.parse(raw) as EmpresaForm) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaForm | null>(null);
  const emailRef = useRef<string | null>(null);

  const login = (r: NonNullable<Role>, u: UserProfile) => {
    setRole(r);
    setUser(u);
    emailRef.current = u.email;
    const saved = loadEmpresaFromStorage(u.email);
    setEmpresa(saved);
  };

  const logout = () => {
    setRole(null);
    setUser(null);
    setEmpresa(null);
    emailRef.current = null;
  };

  const updateEmpresa = (emp: EmpresaForm) => {
    setEmpresa(emp);
    if (emailRef.current) {
      localStorage.setItem(storageKey(emailRef.current), JSON.stringify(emp));
    }
  };

  return (
    <AppContext.Provider value={{ role, user, empresa, login, logout, updateEmpresa }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}

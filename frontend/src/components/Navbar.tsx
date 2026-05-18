import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, ShieldCheck, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const { role, user, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-navy text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center">
            <Building2 size={16} />
          </div>
          <span className="font-display font-semibold text-base tracking-tight">LicitaIA</span>
        </Link>

        <div className="flex items-center gap-1">
          {role === 'pyme' && (
            <>
              <NavLink to="/dashboard" active={isActive('/dashboard')}>
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/mi-empresa" active={isActive('/mi-empresa')}>
                <Building2 size={15} />
                <span>Mi empresa</span>
              </NavLink>
            </>
          )}
          {role === 'admin' && (
            <NavLink to="/admin" active={isActive('/admin')}>
              <ShieldCheck size={15} />
              <span>Panel Admin</span>
            </NavLink>
          )}

          <div className="relative ml-2">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                {user?.nombre?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="hidden sm:block text-xs max-w-28 truncate">{user?.nombre ?? user?.email}</span>
              <ChevronDown size={13} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden text-gray-700">
                <div className="px-3 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-900 truncate">{user?.nombre}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-red-50 text-red-600 transition-colors"
                >
                  <LogOut size={14} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
        active ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
      }`}
    >
      {children}
    </Link>
  );
}

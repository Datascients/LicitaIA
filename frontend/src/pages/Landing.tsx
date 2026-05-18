import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, CheckCircle, Zap, Shield, Users, AlertCircle, X, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { concursos, diasRestantes } from '../data/mockData';
import SemaforoTag from '../components/SemaforoTag';

type AuthMode = 'none' | 'login' | 'register' | 'admin';

export default function Landing() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>('none');
  const [form, setForm] = useState({ email: '', password: '', nombre: '', cargo: '', adminUser: '', adminPass: '' });
  const [error, setError] = useState('');

  const handlePymeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Completa todos los campos'); return; }
    login('pyme', { email: form.email, nombre: form.nombre || form.email.split('@')[0] });
    navigate('/dashboard');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.nombre) { setError('Completa todos los campos'); return; }
    login('pyme', { email: form.email, nombre: form.nombre, cargo: form.cargo });
    navigate('/ficha');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.adminUser === 'Admin' && form.adminPass === '1234') {
      login('admin', { email: 'admin@licitaia.cl', nombre: 'Administrador' });
      navigate('/admin');
    } else {
      setError('Credenciales incorrectas');
    }
  };

  const openAuth = (mode: AuthMode) => { setAuthMode(mode); setError(''); };
  const closeAuth = () => { setAuthMode('none'); setError(''); };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-navy text-white px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <span className="font-display font-semibold text-lg">LicitaIA</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => openAuth('login')} className="text-sm px-4 py-2 border border-white/30 rounded-lg hover:bg-white/10 transition-colors">
              Iniciar sesión
            </button>
            <button onClick={() => openAuth('register')} className="text-sm px-4 py-2 bg-burgundy hover:bg-burgundy-light rounded-lg transition-colors font-medium">
              Registrarme gratis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-navy via-navy-light to-[#1d3a6b] text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-sm px-4 py-1.5 rounded-full mb-6 border border-white/20">
            <Zap size={13} className="text-amber-300" />
            <span>Inteligencia Artificial para licitaciones públicas chilenas</span>
          </div>
          <h1 className="text-5xl font-display font-bold mb-5 leading-tight">
            ¿Califica tu PYME para<br />postular a licitaciones?
          </h1>
          <p className="text-lg text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed">
            Analiza las bases de Mercado Público en segundos. Sabe exactamente qué documentos te faltan, si tienes inhabilidades y cuánto tiempo tienes para postular.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => openAuth('register')} className="flex items-center gap-2 bg-white text-navy font-semibold px-7 py-3 rounded-xl hover:bg-gray-50 transition-colors text-base shadow-lg">
              Comenzar ahora <ArrowRight size={18} />
            </button>
            <button onClick={() => openAuth('login')} className="flex items-center gap-2 border border-white/30 text-white px-7 py-3 rounded-xl hover:bg-white/10 transition-colors text-base">
              Ya tengo cuenta
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 mt-12 text-sm text-white/60">
            <div className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-400" /> 100% gratuito</div>
            <div className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-400" /> Sin tarjeta</div>
            <div className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-400" /> Respuestas verificadas</div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="bg-navy/5 border-y border-navy/10 py-4">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-center gap-10 text-center flex-wrap">
          {[
            { value: '3', label: 'Concursos activos ahora' },
            { value: '47', label: 'Consultas respondidas hoy' },
            { value: '98%', label: 'Tasa de respuesta verificada' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-2xl font-display font-bold text-navy">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Concursos vigentes */}
      <section className="py-16 px-6 bg-cream">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-navy mb-1">Licitaciones vigentes</h2>
              <p className="text-gray-500">Concursos activos en Mercado Público ordenados por urgencia</p>
            </div>
            <button onClick={() => openAuth('register')} className="text-sm text-navy font-medium flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[...concursos].sort((a, b) => {
              const orden = { red: 0, yellow: 1, green: 2, black: 3 };
              return orden[a.semaforo] - orden[b.semaforo];
            }).map(c => {
              const dias = diasRestantes(c.fechaCierre);
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-3">
                    <SemaforoTag color={c.semaforo} fechaCierre={c.fechaCierre} />
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg font-medium">{c.montoUf.toLocaleString()} UF</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1.5">{c.nombre}</h3>
                  <p className="text-xs text-gray-400 mb-3">{c.organismo}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">{c.descripcion}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <span className="text-xs text-gray-400">{c.pymesPostuladas} PYMEs interesadas</span>
                    <button
                      onClick={() => openAuth('register')}
                      className="text-xs text-navy font-medium flex items-center gap-1 group-hover:underline"
                    >
                      {dias < 0 ? 'Ver detalle' : 'Evaluar elegibilidad'} <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-navy text-center mb-12">¿Cómo funciona LicitaIA?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Users size={28} className="text-navy" />,
                step: '01',
                title: 'Registra tu empresa',
                desc: 'Completa tu ficha empresarial con datos básicos, clasificación PYME y estado de habilidad. Solo toma 5 minutos.',
              },
              {
                icon: <Zap size={28} className="text-navy" />,
                step: '02',
                title: 'IA analiza tu perfil',
                desc: 'Nuestro agente revisa cada requisito del concurso y cruza con tu perfil. Sabe exactamente si calificas y qué te falta.',
              },
              {
                icon: <Shield size={28} className="text-navy" />,
                step: '03',
                title: 'Respuestas verificadas',
                desc: 'Cada respuesta cita la cláusula exacta de las bases. LicitaBot nunca inventa información ni fechas.',
              },
            ].map((f, i) => (
              <div key={i} className="text-center">
                <div className="relative inline-flex mb-5">
                  <div className="w-14 h-14 bg-navy/8 rounded-2xl flex items-center justify-center">{f.icon}</div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-navy text-white text-xs font-bold rounded-full flex items-center justify-center">{f.step}</span>
                </div>
                <h3 className="font-display font-semibold text-navy text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-navy text-white py-14 px-6 text-center">
        <h2 className="font-display text-3xl font-bold mb-3">¿Listo para postular con confianza?</h2>
        <p className="text-white/70 mb-7">Únete a las PYMEs chilenas que ya usan IA para ganar licitaciones</p>
        <button onClick={() => openAuth('register')} className="bg-white text-navy font-semibold px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
          Crear cuenta gratis <ArrowRight size={18} />
        </button>
        <div className="mt-6">
          <button onClick={() => openAuth('admin')} className="text-white/30 text-xs hover:text-white/60 transition-colors flex items-center gap-1 mx-auto">
            <Lock size={10} /> Acceso administrador
          </button>
        </div>
      </section>

      {/* Auth Modal */}
      {authMode !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeAuth}>
          <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-navy px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 size={20} />
                <span className="font-display font-semibold">LicitaIA</span>
              </div>
              <button onClick={closeAuth} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {authMode === 'admin' ? (
                <>
                  <h2 className="font-display text-xl font-semibold text-navy mb-1">Acceso Administrador</h2>
                  <p className="text-gray-400 text-sm mb-5">Panel de gestión de plataforma</p>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                      <label className="label">Usuario</label>
                      <input className="input-field" placeholder="Admin" value={form.adminUser} onChange={e => setForm(p => ({ ...p, adminUser: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Contraseña</label>
                      <input type="password" className="input-field" placeholder="••••" value={form.adminPass} onChange={e => setForm(p => ({ ...p, adminPass: e.target.value }))} />
                    </div>
                    {error && <ErrorMsg msg={error} />}
                    <button type="submit" className="btn-primary w-full justify-center py-3">Ingresar al panel</button>
                  </form>
                  <p className="text-center text-xs text-gray-300 mt-3">
                    <button onClick={() => openAuth('login')} className="hover:underline">← Volver al login PYME</button>
                  </p>
                </>
              ) : authMode === 'login' ? (
                <>
                  <h2 className="font-display text-xl font-semibold text-navy mb-1">Bienvenido de vuelta</h2>
                  <p className="text-gray-400 text-sm mb-5">Ingresa a tu cuenta para continuar</p>
                  <form onSubmit={handlePymeLogin} className="space-y-4">
                    <div>
                      <label className="label">Correo electrónico</label>
                      <input type="email" className="input-field" placeholder="correo@empresa.cl" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Contraseña</label>
                      <input type="password" className="input-field" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    {error && <ErrorMsg msg={error} />}
                    <button type="submit" className="btn-primary w-full justify-center py-3">Iniciar sesión</button>
                  </form>
                  <p className="text-center text-sm text-gray-400 mt-4">
                    ¿No tienes cuenta?{' '}
                    <button onClick={() => openAuth('register')} className="text-navy font-medium hover:underline">Regístrate gratis</button>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-display text-xl font-semibold text-navy mb-1">Crea tu cuenta</h2>
                  <p className="text-gray-400 text-sm mb-5">Empieza a analizar licitaciones hoy</p>
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Nombre</label>
                        <input className="input-field" placeholder="María González" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">Cargo</label>
                        <input className="input-field" placeholder="Gerente" value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Correo electrónico</label>
                      <input type="email" className="input-field" placeholder="correo@empresa.cl" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Contraseña</label>
                      <input type="password" className="input-field" placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    {error && <ErrorMsg msg={error} />}
                    <button type="submit" className="btn-primary w-full justify-center py-3 mt-1">Crear cuenta y completar ficha</button>
                  </form>
                  <p className="text-center text-sm text-gray-400 mt-4">
                    ¿Ya tienes cuenta?{' '}
                    <button onClick={() => openAuth('login')} className="text-navy font-medium hover:underline">Inicia sesión</button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
      <AlertCircle size={15} className="flex-shrink-0" />
      {msg}
    </div>
  );
}

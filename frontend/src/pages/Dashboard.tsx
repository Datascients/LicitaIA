import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CheckCircle2, XCircle, Bell, ArrowRight, TrendingUp, FileText, AlertTriangle, Info } from 'lucide-react';
import SemaforoTag from '../components/SemaforoTag';
import { concursos, empresasMock, postulacionesMock, ETAPAS, diasRestantes } from '../data/mockData';

const ETAPA_LABELS = ETAPAS;

export default function Dashboard() {
  const { empresa, user, mensajesEmpresa, marcarLeido } = useApp();
  const navigate = useNavigate();

  // Marcar como leídos los mensajes no leídos al entrar al dashboard
  useEffect(() => {
    mensajesEmpresa.filter(m => !m.leido).forEach(m => marcarLeido(m.id));
  }, [mensajesEmpresa.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const empresaActiva = empresa ?? {
    razonSocial: empresasMock[0].razonSocial,
    estadoPrimerFiltro: empresasMock[0].estadoPrimerFiltro as 'califica' | 'no_califica' | 'pendiente',
    scoreCompletitud: empresasMock[0].scoreCompletitud,
    feedbackAdmin: empresasMock[0].feedbackAdmin,
  };

  const califica = empresaActiva.estadoPrimerFiltro === 'califica';
  const pendiente = empresaActiva.estadoPrimerFiltro === 'pendiente';
  const concursosOrdenados = [...concursos].sort((a, b) => {
    const orden = { red: 0, yellow: 1, green: 2, black: 3 };
    return orden[a.semaforo] - orden[b.semaforo];
  });
  const postulaciones = postulacionesMock;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Welcome bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">
              Hola, {user?.nombre?.split(' ')[0] ?? 'usuario'} 👋
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {empresa ? `${empresa.razonSocial} · ${empresa.rut}` : 'Completa tu ficha para activar el análisis IA'}
            </p>
          </div>
          {!empresa && (
            <button onClick={() => navigate('/ficha')} className="btn-primary text-sm flex items-center gap-2">
              Completar ficha <ArrowRight size={15} />
            </button>
          )}
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Estado primer filtro IA"
            icon={califica ? <CheckCircle2 size={20} className="text-emerald-500" /> : pendiente ? null : <XCircle size={20} className="text-red-500" />}
            value={califica ? 'Califica ✅' : pendiente ? 'Pendiente ⏳' : 'Tiene impedimentos ❌'}
            color={califica ? 'border-l-emerald-400' : pendiente ? 'border-l-amber-400' : 'border-l-red-400'}
          />
          <KpiCard
            label="Completitud de ficha"
            value={`${empresaActiva.scoreCompletitud}%`}
            sub={empresaActiva.scoreCompletitud < 70 ? 'Faltan datos importantes' : 'Perfil casi completo'}
            color="border-l-blue-400"
          />
          <KpiCard
            label="Postulaciones activas"
            value={String(postulaciones.length)}
            sub="Concursos en progreso"
            color="border-l-purple-400"
          />
          <KpiCard
            label="Concursos urgentes"
            value={String(concursos.filter(c => c.semaforo === 'red').length)}
            sub="Cierran en < 3 días"
            color="border-l-red-400"
          />
        </div>

        {/* Mensajes del administrador */}
        {mensajesEmpresa.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-navy flex items-center gap-2">
              <Bell size={18} /> Mensajes del administrador
              {mensajesEmpresa.filter(m => !m.leido).length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {mensajesEmpresa.filter(m => !m.leido).length} nuevo{mensajesEmpresa.filter(m => !m.leido).length > 1 ? 's' : ''}
                </span>
              )}
            </h2>
            {[...mensajesEmpresa].reverse().map(msg => {
              const esUrgente = msg.tipo === 'urgente';
              const esAlerta = msg.tipo === 'alerta';
              const bgColor = esUrgente ? 'bg-red-50 border-red-200' : esAlerta ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
              const textColor = esUrgente ? 'text-red-800' : esAlerta ? 'text-amber-800' : 'text-blue-800';
              const subColor = esUrgente ? 'text-red-700' : esAlerta ? 'text-amber-700' : 'text-blue-700';
              const icon = esUrgente
                ? <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                : esAlerta
                ? <Bell size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                : <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />;
              return (
                <div key={msg.id} className={`border rounded-2xl px-5 py-4 flex items-start gap-3 ${bgColor} ${!msg.leido ? 'ring-2 ring-offset-1 ring-current/20' : 'opacity-80'}`}>
                  {icon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-sm font-semibold ${textColor}`}>
                        {esUrgente ? '🚨 Urgente' : esAlerta ? '⚠️ Alerta' : 'ℹ️ Informativo'}
                        {!msg.leido && <span className="ml-2 text-xs font-bold uppercase tracking-wide">Nuevo</span>}
                      </p>
                      <span className={`text-xs ${subColor} opacity-70 flex-shrink-0`}>
                        {new Date(msg.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-sm ${subColor}`}>{msg.texto}</p>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Licitaciones disponibles */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-navy">Concursos disponibles</h2>
            <span className="text-xs text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-100">
              Ordenados por urgencia
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {concursosOrdenados.map(c => {
              const post = postulaciones.find(p => p.concursoId === c.id);
              const dias = diasRestantes(c.fechaCierre);
              return (
                <div key={c.id} className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                  c.semaforo === 'red' ? 'border-red-100 hover:border-red-200' : 'border-gray-100 hover:border-navy/20'
                }`} onClick={() => navigate('/mi-empresa')}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <SemaforoTag color={c.semaforo} fechaCierre={c.fechaCierre} />
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{c.montoUf.toLocaleString()} UF</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1.5">{c.nombre}</h3>
                    <p className="text-xs text-gray-400 mb-4">{c.organismo}</p>

                    {post ? (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">Etapa actual: {ETAPA_LABELS[post.etapaActual]}</span>
                          <span className="text-xs font-bold text-navy">{post.etapaActual + 1}/{ETAPAS.length}</span>
                        </div>
                        <div className="flex gap-1">
                          {ETAPAS.map((_, i) => (
                            <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= post.etapaActual ? 'bg-navy' : 'bg-gray-100'}`} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className={`flex items-center justify-between pt-3 border-t border-gray-50 text-xs ${c.semaforo === 'red' ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                        <span>{dias < 0 ? 'Concurso vencido' : `Cierra en ${dias} días`}</span>
                        <span className="flex items-center gap-1 group-hover:underline">
                          Ver detalles <ArrowRight size={11} />
                        </span>
                      </div>
                    )}
                  </div>

                  {c.semaforo === 'red' && (
                    <div className="bg-red-50 rounded-b-2xl px-5 py-2.5 text-xs text-red-600 font-medium flex items-center gap-2 border-t border-red-100">
                      🚨 Cierre urgente — actúa ahora
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="font-display text-xl font-semibold text-navy mb-4">Acciones rápidas</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <ActionCard
              icon={<TrendingUp size={22} className="text-navy" />}
              title="Actualizar checklist"
              desc="Re-ejecuta el análisis IA con datos actuales"
              onClick={() => navigate('/mi-empresa')}
            />
            <ActionCard
              icon={<FileText size={22} className="text-navy" />}
              title="Ver mi perfil completo"
              desc="Edita datos, revisa postulaciones y documentos"
              onClick={() => navigate('/mi-empresa')}
            />
            <ActionCard
              icon={<Bell size={22} className="text-navy" />}
              title="Consultar a LicitaBot"
              desc="Pregunta sobre las bases de cualquier concurso"
              onClick={() => {/* chatbot opens automatically */}}
              hint="Usa el chat flotante →"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon?: React.ReactNode; color: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">{label}</p>
          <p className="font-bold text-gray-900 text-base leading-tight">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {icon && <div className="flex-shrink-0">{icon}</div>}
      </div>
    </div>
  );
}

function ActionCard({ icon, title, desc, onClick, hint }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; hint?: string }) {
  return (
    <button onClick={onClick} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md hover:border-navy/20 transition-all group">
      <div className="w-10 h-10 bg-navy/8 rounded-xl flex items-center justify-center mb-3 group-hover:bg-navy/12 transition-colors">
        {icon}
      </div>
      <p className="font-semibold text-gray-900 text-sm mb-1">{title}</p>
      <p className="text-xs text-gray-400">{hint ?? desc}</p>
    </button>
  );
}

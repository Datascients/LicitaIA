import { useState } from 'react';
import { Users, BarChart3, FileText, CheckCircle2, XCircle, AlertCircle, Send, Search, Clock, TrendingUp, Building2, ChevronRight } from 'lucide-react';
import SemaforoTag from '../components/SemaforoTag';
import ChecklistRow from '../components/ChecklistRow';
import { concursos, empresasMock, type MockEmpresa } from '../data/mockData';

type Tab = 'dashboard' | 'pymes' | 'concursos' | 'metricas';

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [empresaSel, setEmpresaSel] = useState<MockEmpresa | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackTipo, setFeedbackTipo] = useState<'informativo' | 'alerta' | 'urgente'>('informativo');
  const [feedbackEnviado, setFeedbackEnviado] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const empresasFiltradas = empresasMock.filter(e => {
    const matchBusq = e.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) || e.rut.includes(busqueda);
    const matchFiltro = filtroEstado === 'todos' || e.estadoPrimerFiltro === filtroEstado;
    return matchBusq && matchFiltro;
  });

  const metricas = {
    total: empresasMock.length,
    califican: empresasMock.filter(e => e.estadoPrimerFiltro === 'califica').length,
    noCalifican: empresasMock.filter(e => e.estadoPrimerFiltro === 'no_califica').length,
    postulaciones: 4,
    consultasHoy: 47,
    tasa: Math.round((empresasMock.filter(e => e.estadoPrimerFiltro === 'califica').length / empresasMock.length) * 100),
  };

  const enviarFeedback = () => {
    if (!feedback.trim()) return;
    setFeedbackEnviado(true);
    setFeedback('');
    setTimeout(() => setFeedbackEnviado(false), 3000);
  };

  const TABS = [
    { key: 'dashboard' as Tab, icon: <BarChart3 size={15} />, label: 'Dashboard' },
    { key: 'pymes' as Tab, icon: <Users size={15} />, label: 'Gestión PYMEs' },
    { key: 'concursos' as Tab, icon: <FileText size={15} />, label: 'Concursos' },
    { key: 'metricas' as Tab, icon: <TrendingUp size={15} />, label: 'Métricas' },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">Panel Administrador</h1>
            <p className="text-gray-400 text-sm mt-0.5">Gestión de plataforma LicitaIA</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-700 font-medium">Sistema activo</span>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-navy text-white shadow-sm' : 'text-gray-500 hover:text-navy'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'PYMEs registradas', value: metricas.total, icon: <Users size={20} />, color: 'text-navy', bg: 'bg-blue-50' },
                { label: 'Califican al postular', value: metricas.califican, icon: <CheckCircle2 size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Con impedimentos', value: metricas.noCalifican, icon: <AlertCircle size={20} />, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'Consultas LicitaBot hoy', value: metricas.consultasHoy, icon: <BarChart3 size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((m, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className={`w-10 h-10 ${m.bg} rounded-xl flex items-center justify-center mb-3 ${m.color}`}>{m.icon}</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{m.value}</div>
                  <div className="text-xs text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Últimas registradas */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Clock size={16} className="text-navy" /> Últimos registros</h3>
                <div className="space-y-3">
                  {empresasMock.map(e => (
                    <div key={e.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors" onClick={() => { setEmpresaSel(e); setTab('pymes'); }}>
                      <div className="w-8 h-8 bg-navy/8 text-navy rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {e.razonSocial[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.razonSocial}</p>
                        <p className="text-xs text-gray-400">{e.rut}</p>
                      </div>
                      {e.estadoPrimerFiltro === 'califica'
                        ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✅ Califica</span>
                        : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">❌ No califica</span>}
                      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Concursos overview */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><FileText size={16} className="text-navy" /> Estado de concursos</h3>
                <div className="space-y-3">
                  {concursos.map(c => (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate leading-snug">{c.nombre}</p>
                        <SemaforoTag color={c.semaforo} fechaCierre={c.fechaCierre} size="sm" />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{c.pymesPostuladas} PYMEs</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PYMES TAB */}
        {tab === 'pymes' && (
          <div className="grid lg:grid-cols-5 gap-5">
            {/* Lista */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o RUT..."
                    className="input-field pl-9"
                  />
                </div>
                <select
                  value={filtroEstado}
                  onChange={e => setFiltroEstado(e.target.value)}
                  className="input-field w-44"
                >
                  <option value="todos">Todos</option>
                  <option value="califica">Califica</option>
                  <option value="no_califica">No califica</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium">Empresa</th>
                      <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Clasificación</th>
                      <th className="text-left py-3 px-4 font-medium">Filtro IA</th>
                      <th className="text-left py-3 px-4 font-medium">Ficha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empresasFiltradas.map(e => (
                      <tr
                        key={e.id}
                        onClick={() => setEmpresaSel(empresaSel?.id === e.id ? null : e)}
                        className={`border-b border-gray-50 cursor-pointer transition-colors last:border-0 ${empresaSel?.id === e.id ? 'bg-navy/5' : 'hover:bg-gray-50'}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-navy/8 text-navy text-xs font-bold rounded-lg flex items-center justify-center flex-shrink-0">
                              {e.razonSocial[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-xs leading-snug">{e.razonSocial}</p>
                              <p className="text-gray-400 text-xs">{e.rut}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                            {e.clasificacionPyme === 'pequena' ? 'Pequeña' : e.clasificacionPyme}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {e.estadoPrimerFiltro === 'califica'
                            ? <span className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={13} />Califica</span>
                            : <span className="flex items-center gap-1 text-xs text-red-600"><XCircle size={13} />No califica</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <div className="w-14 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-navy h-1.5 rounded-full" style={{ width: `${e.scoreCompletitud}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{e.scoreCompletitud}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {empresasFiltradas.length === 0 && (
                  <div className="py-10 text-center text-gray-400 text-sm">Sin resultados para la búsqueda</div>
                )}
              </div>
            </div>

            {/* Panel detalle */}
            <div className="lg:col-span-2">
              {empresaSel ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-20 overflow-hidden">
                  <div className="bg-navy p-5 text-white">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-lg font-bold font-display">
                        {empresaSel.razonSocial[0]}
                      </div>
                      <div>
                        <h3 className="font-display font-semibold leading-tight">{empresaSel.razonSocial}</h3>
                        <p className="text-xs text-white/60">{empresaSel.rut}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {empresaSel.estadoPrimerFiltro === 'califica'
                        ? <span className="text-xs bg-emerald-500/20 text-emerald-200 px-2.5 py-1 rounded-full border border-emerald-500/30">✅ Califica para postular</span>
                        : <span className="text-xs bg-red-500/20 text-red-200 px-2.5 py-1 rounded-full border border-red-500/30">❌ Tiene impedimentos</span>}
                    </div>
                  </div>

                  <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Datos empresa</p>
                      {[
                        ['Giro', empresaSel.giro],
                        ['Ventas anuales', `${empresaSel.ventasUf.toLocaleString()} UF`],
                        ['Trabajadores', String(empresaSel.numTrabajadores)],
                        ['Rep. legal', empresaSel.repLegal],
                        ['Cargo', empresaSel.cargoRepLegal],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-gray-400">{k}</span>
                          <span className="font-medium text-gray-800 text-right max-w-32 truncate">{v}</span>
                        </div>
                      ))}
                    </div>

                    {empresaSel.checklistItems && (
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Checklist CONCURSO-001</p>
                        <div className="space-y-1.5">
                          {empresaSel.checklistItems.map((item, i) => (
                            <ChecklistRow key={i} item={item} />
                          ))}
                        </div>
                      </div>
                    )}

                    {empresaSel.feedbackAdmin && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                        <p className="font-medium mb-0.5">Feedback pendiente:</p>
                        {empresaSel.feedbackAdmin}
                      </div>
                    )}
                  </div>

                  {/* Enviar feedback */}
                  <div className="p-5 border-t border-gray-100 space-y-3">
                    <p className="text-xs font-medium text-gray-700">Enviar mensaje a empresa</p>
                    <div className="flex gap-1.5">
                      {(['informativo', 'alerta', 'urgente'] as const).map(t => (
                        <button key={t} onClick={() => setFeedbackTipo(t)} className={`text-xs px-2.5 py-1 rounded-full border transition-all ${feedbackTipo === t ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-500 hover:border-navy/40'}`}>
                          {t === 'informativo' ? 'ℹ️ Info' : t === 'alerta' ? '⚠️ Alerta' : '🚨 Urgente'}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder={`Escribe un mensaje ${feedbackTipo} para ${empresaSel.razonSocial}...`}
                      className="input-field resize-none h-20 text-xs"
                    />
                    <button
                      onClick={enviarFeedback}
                      disabled={!feedback.trim()}
                      className="w-full btn-primary justify-center text-sm py-2.5 disabled:opacity-40"
                    >
                      <Send size={14} className="mr-2" /> Enviar feedback
                    </button>
                    {feedbackEnviado && (
                      <p className="text-center text-xs text-emerald-600 flex items-center justify-center gap-1">
                        <CheckCircle2 size={13} /> Mensaje enviado correctamente
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center text-gray-300">
                  <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Selecciona una empresa para ver su detalle</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONCURSOS TAB */}
        {tab === 'concursos' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{concursos.length} concursos activos · ordenados por urgencia</p>
              <button className="btn-primary text-sm flex items-center gap-2 py-2.5">
                <FileText size={14} /> Agregar concurso
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[...concursos].sort((a, b) => a.fechaCierre.getTime() - b.fechaCierre.getTime()).map(c => (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <SemaforoTag color={c.semaforo} fechaCierre={c.fechaCierre} />
                    <span className="text-xs text-gray-400">{c.montoUf.toLocaleString()} UF</span>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 leading-snug mb-1.5">{c.nombre}</h3>
                  <p className="text-xs text-gray-400 mb-3">{c.organismo}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">{c.descripcion}</p>
                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{c.pymesPostuladas} PYMEs interesadas</span>
                    <span className="text-xs text-navy font-medium">Ver bases</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MÉTRICAS TAB */}
        {tab === 'metricas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {[
                { label: 'Tasa calificación primer filtro', value: `${metricas.tasa}%`, desc: `${metricas.califican} de ${metricas.total} PYMEs califican`, color: 'bg-emerald-50 text-emerald-700' },
                { label: 'Postulaciones activas', value: String(metricas.postulaciones), desc: 'En alguna etapa del proceso', color: 'bg-blue-50 text-blue-700' },
                { label: 'Consultas LicitaBot hoy', value: String(metricas.consultasHoy), desc: 'Promedio diario: 32 consultas', color: 'bg-purple-50 text-purple-700' },
                { label: 'PYMEs registradas', value: String(metricas.total), desc: 'Crecimiento mes: +2 nuevas', color: 'bg-navy/8 text-navy' },
                { label: 'Con deuda previsional', value: '1', desc: '33% del total registrado', color: 'bg-red-50 text-red-700' },
                { label: 'Checklists completados', value: '2', desc: '50% completaron el proceso', color: 'bg-amber-50 text-amber-700' },
              ].map((m, i) => (
                <div key={i} className={`${m.color} rounded-2xl p-5`}>
                  <div className="text-3xl font-bold mb-1">{m.value}</div>
                  <div className="font-semibold text-sm mb-0.5">{m.label}</div>
                  <div className="text-xs opacity-70">{m.desc}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Distribución por estado de habilidad</h3>
              <div className="space-y-3">
                {[
                  { label: 'Califica para postular', count: metricas.califican, total: metricas.total, color: 'bg-emerald-500' },
                  { label: 'No califica (tiene impedimentos)', count: metricas.noCalifican, total: metricas.total, color: 'bg-red-500' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-800">{item.count}/{item.total}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className={`${item.color} h-3 rounded-full transition-all`} style={{ width: `${Math.round((item.count / item.total) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

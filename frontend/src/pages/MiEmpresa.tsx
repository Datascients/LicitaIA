import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CheckCircle2, XCircle, AlertCircle, Pencil, Building2, Users, TrendingUp, FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { concursos, postulacionesMock, ETAPAS, empresasMock } from '../data/mockData';
import SemaforoTag from '../components/SemaforoTag';
import ChecklistRow from '../components/ChecklistRow';

type Tab = 'perfil' | 'postulaciones' | 'documentos';

export default function MiEmpresa() {
  const { empresa } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('perfil');
  const [checklistAbierto, setChecklistAbierto] = useState<string | null>(null);

  // If no empresa data yet, send to onboarding
  if (!empresa) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-navy/8 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 size={28} className="text-navy" />
          </div>
          <h2 className="font-display text-xl font-bold text-navy">Aún no tienes ficha empresa</h2>
          <p className="text-gray-400 text-sm">Completa tu ficha para que la IA pueda evaluar si calificas para cada concurso.</p>
          <button onClick={() => navigate('/ficha')} className="btn-primary w-full justify-center py-3">
            Completar ficha ahora
          </button>
        </div>
      </div>
    );
  }

  const checklistMock = empresasMock[0].checklistItems ?? [];
  const score = empresa.scoreCompletitud;
  const califica = empresa.estadoPrimerFiltro === 'califica';
  const postulaciones = postulacionesMock;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-navy rounded-xl flex items-center justify-center text-white text-xl font-display font-bold flex-shrink-0">
                {empresa.razonSocial?.[0] ?? '?'}
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-navy leading-tight">
                  {empresa.razonSocial || 'Mi empresa'}
                </h1>
                <div className="flex items-center gap-3 flex-wrap mt-1">
                  <span className="text-sm text-gray-400">{empresa.rut}</span>
                  <span className="text-gray-200">·</span>
                  <span className="text-sm text-gray-400 capitalize">{empresa.giro || 'Sin giro registrado'}</span>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs bg-navy/8 text-navy px-2.5 py-1 rounded-full font-medium capitalize">
                    {empresa.clasificacionPyme === 'pequena' ? 'Pequeña empresa' : empresa.clasificacionPyme === 'micro' ? 'Microempresa' : empresa.clasificacionPyme === 'mediana' ? 'Mediana empresa' : 'No PYME'}
                  </span>
                  {califica ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Califica para postular
                    </span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                      <XCircle size={12} /> Tiene impedimentos
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <button onClick={() => navigate('/ficha')} className="btn-secondary flex items-center gap-2 text-sm py-2">
                <Pencil size={14} /> Editar perfil
              </button>
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-1">Completitud del perfil</div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${score}%`, background: score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444' }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700">{score}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm w-fit">
          {([
            ['perfil', <Building2 size={14} />, 'Datos empresa'],
            ['postulaciones', <TrendingUp size={14} />, 'Mis postulaciones'],
            ['documentos', <FileText size={14} />, 'Documentos'],
          ] as const).map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key ? 'bg-navy text-white shadow-sm' : 'text-gray-500 hover:text-navy'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Tab: Perfil */}
        {tab === 'perfil' && (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Building2 size={16} className="text-navy" /> Datos generales</h3>
              <DataRow label="RUT" value={empresa.rut || '—'} />
              <DataRow label="Razón social" value={empresa.razonSocial || '—'} />
              <DataRow label="Giro" value={empresa.giro || '—'} />
              <DataRow label="Inicio actividades" value={empresa.inicioActividades || '—'} />
              <DataRow label="Representante legal" value={empresa.repLegal || '—'} />
              <DataRow label="Cargo" value={empresa.cargoRepLegal || '—'} />
            </div>

            <div className="space-y-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Users size={16} className="text-navy" /> Clasificación PYME</h3>
                <DataRow label="Ventas anuales" value={empresa.ventasUf ? `${empresa.ventasUf.toLocaleString()} UF` : '—'} />
                <DataRow label="Trabajadores" value={empresa.numTrabajadores ? String(empresa.numTrabajadores) : '—'} />
                <DataRow
                  label="Clasificación"
                  value={empresa.clasificacionPyme === 'pequena' ? 'Pequeña empresa' : empresa.clasificacionPyme === 'micro' ? 'Microempresa' : empresa.clasificacionPyme === 'mediana' ? 'Mediana empresa' : 'No aplica'}
                />
                {empresa.certificaciones.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Certificaciones</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {empresa.certificaciones.map(c => (
                        <span key={c} className="text-xs bg-navy/8 text-navy px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                <h3 className="font-semibold text-gray-800">Estado de habilidad</h3>
                <HabilidadRow label="Deuda previsional" value={empresa.tieneDeudaPrevisional} inverted />
                <HabilidadRow label="Deuda tributaria" value={empresa.tieneDeudaTributaria} inverted />
                <HabilidadRow label="Denuncia laboral" value={empresa.tieneDenunciaLaboral} inverted />
                <HabilidadRow label="Litigio con el Estado" value={empresa.tieneLitigioProveedor} inverted />
                <HabilidadRow label="Inscrito ChileProveedores" value={empresa.inscritaChileProveedores} />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Postulaciones */}
        {tab === 'postulaciones' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-navy">Mis postulaciones activas</h2>
              <span className="text-sm text-gray-400">{postulaciones.length} en progreso</span>
            </div>

            {postulaciones.map(post => {
              const concurso = concursos.find(c => c.id === post.concursoId);
              if (!concurso) return null;
              const checklist = checklistMock;
              const abierto = checklistAbierto === post.id;
              const cumple = checklist.filter(i => i.estado === 'cumple').length;
              const total = checklist.length;

              return (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <SemaforoTag color={concurso.semaforo} fechaCierre={concurso.fechaCierre} />
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            post.estado === 'en_progreso' ? 'bg-blue-100 text-blue-700' :
                            post.estado === 'guardado' ? 'bg-gray-100 text-gray-600' :
                            post.estado === 'enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {post.estado === 'en_progreso' ? '⚡ En progreso' : post.estado === 'guardado' ? '📌 Guardado' : post.estado === 'enviado' ? '✅ Enviado' : post.estado}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 leading-snug">{concurso.nombre}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">{concurso.organismo} · {concurso.montoUf.toLocaleString()} UF</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-navy">{Math.round((cumple / total) * 100)}%</div>
                        <div className="text-xs text-gray-400">checklist completo</div>
                      </div>
                    </div>

                    {/* Etapas */}
                    <div className="mt-4 flex items-center gap-1">
                      {ETAPAS.map((etapa, i) => (
                        <div key={i} title={etapa} className="flex items-center flex-1 last:flex-none">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                            i < post.etapaActual ? 'bg-emerald-500 text-white' :
                            i === post.etapaActual ? 'bg-navy text-white ring-2 ring-navy/20' :
                            'bg-gray-100 text-gray-300'
                          }`}>
                            {i < post.etapaActual ? <CheckCircle2 size={12} /> : i + 1}
                          </div>
                          {i < ETAPAS.length - 1 && (
                            <div className={`flex-1 h-0.5 transition-colors mx-0.5 ${i < post.etapaActual ? 'bg-emerald-400' : 'bg-gray-100'}`} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      {ETAPAS.map((e, i) => (
                        <span key={i} className={`text-xs leading-tight text-center ${i === post.etapaActual ? 'text-navy font-medium' : 'text-gray-300'}`} style={{ width: `${100 / ETAPAS.length}%` }}>
                          {i === post.etapaActual ? e : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Checklist toggle */}
                  <button
                    onClick={() => setChecklistAbierto(abierto ? null : post.id)}
                    className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-emerald-600">✓ {cumple}</span>
                      <span className="text-red-500">✗ {checklist.filter(i => i.estado === 'no_cumple').length}</span>
                      <span className="text-amber-500">⚠ {checklist.filter(i => i.estado === 'pendiente').length}</span>
                      <span className="text-gray-400">— Requisitos del checklist</span>
                    </span>
                    {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {abierto && (
                    <div className="px-5 py-4 space-y-2 border-t border-gray-100">
                      {checklist.map((item, i) => <ChecklistRow key={i} item={item} />)}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-navy/40 hover:text-navy transition-all flex items-center justify-center gap-2"
            >
              <ExternalLink size={15} /> Ver todos los concursos disponibles
            </button>
          </div>
        )}

        {/* Tab: Documentos */}
        {tab === 'documentos' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-4">📁</div>
            <h3 className="font-display text-lg font-semibold text-navy mb-2">Gestión de documentos</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              Sube tus documentos legales y certificaciones para adjuntarlos directamente a cada postulación.
            </p>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 hover:border-navy/40 cursor-pointer transition-colors">
              <p className="text-sm text-gray-400">Arrastra archivos aquí o haz click para subir</p>
              <p className="text-xs text-gray-300 mt-1">PDF, DOCX — máx. 10MB por archivo</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              {['Certificado ChileProveedores', 'Certificado SUSESO', 'Declaración jurada', 'Carta del fabricante'].map(doc => (
                <div key={doc} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm text-gray-400">
                  <FileText size={14} />
                  <span>{doc}</span>
                  <span className="ml-auto text-xs text-gray-300">Pendiente</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right">{value}</span>
    </div>
  );
}

function HabilidadRow({ label, value, inverted = false }: { label: string; value: boolean; inverted?: boolean }) {
  const isOk = inverted ? !value : value;
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-medium flex items-center gap-1 ${isOk ? 'text-emerald-600' : 'text-red-500'}`}>
        {isOk ? <><CheckCircle2 size={13} /> Sí</> : <><AlertCircle size={13} /> No</>}
      </span>
    </div>
  );
}

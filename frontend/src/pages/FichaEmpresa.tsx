import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, ChevronRight, ChevronLeft, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { validarRut, clasificarPyme } from '../data/mockData';
import type { EmpresaForm } from '../context/AppContext';

const PASOS = ['Datos básicos', 'Clasificación PYME', 'Estado de habilidad', 'Representante legal'] as const;

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

function primerPasoIncompleto(emp: import('../context/AppContext').EmpresaForm | null): number {
  if (!emp) return 0;
  if (!emp.rut || !emp.razonSocial) return 0;
  if (!emp.ventasUf) return 1;
  if (!emp.repLegal) return 3;
  return 0;
}

export default function FichaEmpresa() {
  const navigate = useNavigate();
  const { empresa: empresaGuardada, updateEmpresa } = useApp();
  const isEditing = !!empresaGuardada;

  const [paso, setPaso] = useState(() => primerPasoIncompleto(empresaGuardada));
  const [analizando, setAnalizando] = useState(false);
  const [resultado, setResultado] = useState<null | 'califica' | 'no_califica'>(null);
  const [rutError, setRutError] = useState('');

  const [datos, setDatos] = useState({
    rut: empresaGuardada?.rut ?? '',
    razonSocial: empresaGuardada?.razonSocial ?? '',
    giro: empresaGuardada?.giro ?? '',
    inicioActividades: empresaGuardada?.inicioActividades ?? '',
    ventasUf: String(empresaGuardada?.ventasUf ?? ''),
    numTrabajadores: String(empresaGuardada?.numTrabajadores ?? ''),
    tieneDeudaPrevisional: empresaGuardada?.tieneDeudaPrevisional ?? false,
    tieneDeudaTributaria: empresaGuardada?.tieneDeudaTributaria ?? false,
    tieneDenunciaLaboral: empresaGuardada?.tieneDenunciaLaboral ?? false,
    tieneLitigioProveedor: empresaGuardada?.tieneLitigioProveedor ?? false,
    inscritaChileProveedores: empresaGuardada?.inscritaChileProveedores ?? false,
    certificaciones: empresaGuardada?.certificaciones ?? ([] as string[]),
    repLegal: empresaGuardada?.repLegal ?? '',
    cargoRepLegal: empresaGuardada?.cargoRepLegal ?? '',
  });

  const ventasNum = parseFloat(datos.ventasUf) || 0;
  const clasificacion = ventasNum > 0 ? clasificarPyme(ventasNum) : null;

  const handleRutBlur = () => {
    if (datos.rut && !validarRut(datos.rut)) setRutError('RUT inválido — verifica el dígito verificador');
    else setRutError('');
  };

  const toggleCert = (cert: string) => {
    setDatos(p => ({
      ...p,
      certificaciones: p.certificaciones.includes(cert)
        ? p.certificaciones.filter(c => c !== cert)
        : [...p.certificaciones, cert],
    }));
  };

  const calcularScore = (): number => {
    let score = 0;
    if (datos.rut && !rutError) score += 15;
    if (datos.razonSocial) score += 15;
    if (datos.giro) score += 10;
    if (datos.ventasUf) score += 15;
    if (datos.numTrabajadores) score += 10;
    if (datos.inscritaChileProveedores) score += 15;
    if (datos.repLegal) score += 10;
    if (datos.cargoRepLegal) score += 10;
    return score;
  };

  const completar = () => {
    setAnalizando(true);
    setTimeout(() => {
      const califica = !datos.tieneDeudaPrevisional && !datos.tieneDeudaTributaria && datos.inscritaChileProveedores;
      const empresaData: EmpresaForm = {
        id: empresaGuardada?.id ?? crypto.randomUUID(),
        rut: datos.rut,
        razonSocial: datos.razonSocial,
        giro: datos.giro,
        inicioActividades: datos.inicioActividades,
        ventasUf: ventasNum,
        numTrabajadores: parseInt(datos.numTrabajadores) || 0,
        clasificacionPyme: clasificacion?.tipo ?? 'no_aplica',
        tieneDeudaPrevisional: datos.tieneDeudaPrevisional,
        tieneDeudaTributaria: datos.tieneDeudaTributaria,
        tieneDenunciaLaboral: datos.tieneDenunciaLaboral,
        tieneLitigioProveedor: datos.tieneLitigioProveedor,
        inscritaChileProveedores: datos.inscritaChileProveedores,
        certificaciones: datos.certificaciones,
        repLegal: datos.repLegal,
        cargoRepLegal: datos.cargoRepLegal,
        estadoPrimerFiltro: califica ? 'califica' : 'no_califica',
        scoreCompletitud: calcularScore(),
      };
      updateEmpresa(empresaData);

      // Persistir en Supabase vía backend (fire & forget)
      fetch(`${API_URL}/empresa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: datos.rut,
          razon_social: datos.razonSocial,
          giro: datos.giro || undefined,
          ventas_uf_anual: ventasNum || undefined,
          num_trabajadores: parseInt(datos.numTrabajadores) || undefined,
          tiene_deuda_previsional: datos.tieneDeudaPrevisional,
          tiene_deuda_tributaria: datos.tieneDeudaTributaria,
          tiene_denuncia_laboral: datos.tieneDenunciaLaboral,
          tiene_litigio_proveedor: datos.tieneLitigioProveedor,
          inscrita_chileproveedores: datos.inscritaChileProveedores,
          certificaciones: datos.certificaciones,
        }),
      }).catch(() => {});

      setAnalizando(false);
      setResultado(califica ? 'califica' : 'no_califica');
    }, 2200);
  };

  if (analizando) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm mx-auto px-6">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 bg-navy/10 rounded-full animate-ping" />
          <div className="relative w-20 h-20 bg-navy/10 rounded-full flex items-center justify-center">
            <Loader2 size={32} className="text-navy animate-spin" />
          </div>
        </div>
        <h2 className="font-display text-2xl text-navy font-bold">IA analizando tu perfil...</h2>
        <p className="text-gray-400 text-sm">Revisando requisitos legales, estado de habilidad y clasificación PYME</p>
        <div className="space-y-2 text-left mt-4">
          {['Verificando ChileProveedores...', 'Cruzando deudas previsionales...', 'Evaluando clasificación PYME...'].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
              <CheckCircle2 size={13} className="text-emerald-500" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (resultado) return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center space-y-5">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${resultado === 'califica' ? 'bg-emerald-100' : 'bg-red-100'}`}>
          {resultado === 'califica'
            ? <CheckCircle2 size={32} className="text-emerald-600" />
            : <AlertCircle size={32} className="text-red-500" />}
        </div>
        <div>
          <h2 className="font-display text-2xl text-navy font-bold mb-2">
            {resultado === 'califica' ? '¡Tu empresa califica!' : 'Hay impedimentos activos'}
          </h2>
          <p className="text-gray-500 text-sm">
            {resultado === 'califica'
              ? 'No se detectaron inhabilidades. Tu perfil está listo para postular a concursos.'
              : 'Detectamos inhabilidades que debes resolver. Revisa el detalle en tu perfil.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/mi-empresa')} className="btn-secondary py-2.5 text-sm justify-center">
            Ver mi empresa
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-primary py-2.5 text-sm justify-center">
            Ir al dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-2xl text-navy font-bold">
            {isEditing ? (
              <span className="flex items-center gap-2"><Pencil size={20} /> Actualizar ficha empresa</span>
            ) : 'Completa tu ficha empresa'}
          </h1>
          {isEditing && (
            <button onClick={() => navigate('/mi-empresa')} className="text-sm text-gray-400 hover:text-navy transition-colors">
              Cancelar
            </button>
          )}
        </div>
        <p className="text-gray-400 text-sm mb-8">
          {isEditing ? 'Edita los datos de tu empresa y vuelve a ejecutar el análisis IA' : 'La IA usará esta información para evaluar si calificas para cada concurso'}
        </p>

        {/* Steps */}
        <div className="flex items-center mb-8 gap-1">
          {PASOS.map((_, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => i < paso && setPaso(i)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                  i < paso ? 'bg-emerald-500 text-white cursor-pointer' : i === paso ? 'bg-navy text-white ring-4 ring-navy/20' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {i < paso ? <CheckCircle2 size={14} /> : i + 1}
              </button>
              {i < PASOS.length - 1 && (
                <div className={`flex-1 h-1 mx-1 rounded-full transition-colors ${i < paso ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-6 h-6 bg-navy/10 text-navy text-xs font-bold rounded-full flex items-center justify-center">{paso + 1}</span>
            <h2 className="font-display text-lg font-semibold text-navy">{PASOS[paso]}</h2>
          </div>

          {paso === 0 && (
            <div className="space-y-4">
              <div>
                <label className="label">RUT empresa <span className="text-red-400">*</span></label>
                <input
                  className={`input-field ${rutError ? 'border-red-400 bg-red-50' : ''}`}
                  placeholder="76.543.210-K"
                  value={datos.rut}
                  onChange={e => setDatos(p => ({ ...p, rut: e.target.value }))}
                  onBlur={handleRutBlur}
                />
                {rutError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{rutError}</p>}
                {datos.rut && !rutError && validarRut(datos.rut) && (
                  <p className="text-emerald-600 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> RUT válido</p>
                )}
              </div>
              <div>
                <label className="label">Razón social <span className="text-red-400">*</span></label>
                <input className="input-field" placeholder="TecnoServ Limitada" value={datos.razonSocial} onChange={e => setDatos(p => ({ ...p, razonSocial: e.target.value }))} />
              </div>
              <div>
                <label className="label">Giro comercial</label>
                <input className="input-field" placeholder="Servicios de tecnología y consultoría" value={datos.giro} onChange={e => setDatos(p => ({ ...p, giro: e.target.value }))} />
              </div>
              <div>
                <label className="label">Fecha inicio de actividades</label>
                <input type="date" className="input-field" value={datos.inicioActividades} onChange={e => setDatos(p => ({ ...p, inicioActividades: e.target.value }))} />
              </div>
            </div>
          )}

          {paso === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">Ventas anuales en UF <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type="number" className="input-field pr-10" placeholder="8500" value={datos.ventasUf} onChange={e => setDatos(p => ({ ...p, ventasUf: e.target.value }))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">UF</span>
                </div>
              </div>
              <div>
                <label className="label">Número de trabajadores</label>
                <input type="number" className="input-field" placeholder="12" value={datos.numTrabajadores} onChange={e => setDatos(p => ({ ...p, numTrabajadores: e.target.value }))} />
              </div>
              {clasificacion && (
                <div className={`p-4 rounded-xl border-2 flex items-start gap-3 ${clasificacion.tipo !== 'no_aplica' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  {clasificacion.tipo !== 'no_aplica' ? (
                    <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Clasificación calculada:</p>
                    <p className="text-sm text-gray-700 mt-0.5">{clasificacion.label}</p>
                  </div>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">Clasificación según Ley 20.416:</p>
                <p>🔵 Micro ≤ 2.400 UF</p>
                <p>🟢 Pequeña 2.400 – 25.000 UF</p>
                <p>🟡 Mediana 25.000 – 100.000 UF</p>
                <p>⚪ No aplica &gt; 100.000 UF</p>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="space-y-3">
              {[
                { key: 'tieneDeudaPrevisional' as const, label: 'Tengo deudas previsionales activas', desc: 'Inhabilidad para postular (Ley 19.886 Art. 4°)', danger: true },
                { key: 'tieneDeudaTributaria' as const, label: 'Tengo deudas tributarias', desc: 'Puede inhabilitar dependiendo del monto', danger: true },
                { key: 'tieneDenunciaLaboral' as const, label: 'Tengo denuncia laboral activa', desc: 'Puede afectar la evaluación', danger: true },
                { key: 'tieneLitigioProveedor' as const, label: 'Tengo litigios activos con el Estado', desc: 'Inhabilidad para postular', danger: true },
                { key: 'inscritaChileProveedores' as const, label: 'Estoy inscrito en ChileProveedores', desc: 'Requisito obligatorio para postular', danger: false },
              ].map(item => {
                const checked = datos[item.key];
                const isAlert = checked && item.danger;
                const isOk = checked && !item.danger;
                return (
                  <label key={item.key} className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${isAlert ? 'border-red-200 bg-red-50' : isOk ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                    <input type="checkbox" className="mt-0.5 w-4 h-4 cursor-pointer" style={{ accentColor: '#0F2D5C' }} checked={checked} onChange={e => setDatos(p => ({ ...p, [item.key]: e.target.checked }))} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    {isAlert && <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
                    {isOk && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />}
                  </label>
                );
              })}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="label">Certificaciones vigentes</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['ISO 9001', 'ISO 14001', 'ISO 27001', 'OHSAS 18001', 'Great Place to Work'].map(cert => (
                    <button key={cert} type="button" onClick={() => toggleCert(cert)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${datos.certificaciones.includes(cert) ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600 hover:border-navy/50'}`}>
                      {datos.certificaciones.includes(cert) ? '✓ ' : ''}{cert}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {paso === 3 && (
            <div className="space-y-4">
              <div>
                <label className="label">Nombre representante legal</label>
                <input className="input-field" placeholder="Juan Pérez González" value={datos.repLegal} onChange={e => setDatos(p => ({ ...p, repLegal: e.target.value }))} />
              </div>
              <div>
                <label className="label">Cargo</label>
                <input className="input-field" placeholder="Gerente General" value={datos.cargoRepLegal} onChange={e => setDatos(p => ({ ...p, cargoRepLegal: e.target.value }))} />
              </div>
              <div>
                <label className="label">Documentos adjuntos</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 hover:border-navy/40 transition-colors cursor-pointer">
                  <div className="text-3xl mb-2">📎</div>
                  <p className="text-sm font-medium">Arrastra archivos aquí o haz click</p>
                  <p className="text-xs mt-1">PDF, DOCX — máx. 10MB por archivo</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
            <button
              onClick={() => setPaso(p => Math.max(0, p - 1))}
              disabled={paso === 0}
              className="btn-secondary flex items-center gap-1.5 text-sm py-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} /> Anterior
            </button>
            {paso < PASOS.length - 1 ? (
              <button onClick={() => setPaso(p => p + 1)} className="btn-primary flex items-center gap-1.5 text-sm py-2.5">
                Siguiente <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={completar} className="btn-primary flex items-center gap-1.5 text-sm py-2.5">
                {isEditing ? 'Guardar y re-analizar' : 'Finalizar y analizar'} <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

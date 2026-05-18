export type SemaforoColor = 'green' | 'yellow' | 'red' | 'black';

export interface Concurso {
  id: string;
  nombre: string;
  organismo: string;
  montoUf: number;
  fechaCierre: Date;
  estado: 'activo' | 'cerrado' | 'adjudicado' | 'desierto';
  semaforo: SemaforoColor;
  pymesPostuladas?: number;
  requisitos: string[];
  descripcion: string;
}

export interface ChecklistItem {
  nombre: string;
  estado: 'cumple' | 'no_cumple' | 'pendiente';
  inhabilitante: boolean;
  gap?: string;
  accion?: string;
}

export interface MockEmpresa {
  id: string;
  rut: string;
  razonSocial: string;
  clasificacionPyme: 'micro' | 'pequena' | 'mediana' | 'no_aplica';
  ventasUf: number;
  numTrabajadores: number;
  giro: string;
  tieneDeudaPrevisional: boolean;
  tieneDeudaTributaria: boolean;
  tieneDenunciaLaboral: boolean;
  tieneLitigioProveedor: boolean;
  inscritaChileProveedores: boolean;
  estadoPrimerFiltro: 'califica' | 'no_califica' | 'pendiente';
  scoreCompletitud: number;
  checklistItems?: ChecklistItem[];
  feedbackAdmin?: string;
  certificaciones: string[];
  repLegal: string;
  cargoRepLegal: string;
  fechaRegistro: Date;
}

export interface Postulacion {
  id: string;
  concursoId: string;
  empresaId: string;
  estado: 'guardado' | 'en_progreso' | 'completado' | 'enviado' | 'descalificado';
  fechaInicio: Date;
  etapaActual: number;
}

export const ETAPAS = ['Ficha completa', 'Primer filtro IA', 'Revisión admin', 'Documentos ok', 'Postulación enviada'] as const;

function getSemaforo(fechaCierre: Date): SemaforoColor {
  const diff = Math.floor((fechaCierre.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'black';
  if (diff < 3) return 'red';
  if (diff <= 10) return 'yellow';
  return 'green';
}

const hoy = new Date();

export const concursos: Concurso[] = [
  {
    id: '001',
    nombre: 'Servicio de limpieza dependencias MINSAL RM 2025',
    organismo: 'Ministerio de Salud',
    descripcion: 'Contratación de servicio de aseo y mantención para las dependencias del MINSAL en la Región Metropolitana durante el año 2025.',
    montoUf: 800,
    fechaCierre: new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000),
    estado: 'activo',
    semaforo: getSemaforo(new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000)),
    pymesPostuladas: 4,
    requisitos: [
      'Ventas anuales entre 2.400 y 25.000 UF',
      'Sin deudas previsionales últimos 12 meses',
      'Inscripción vigente en ChileProveedores',
      'Mínimo 5 trabajadores con contrato',
      'Certificado SUSESO de cumplimiento laboral',
      'No haber sido multado por la DT en últimos 24 meses',
    ],
  },
  {
    id: '002',
    nombre: 'Suministro equipos computacionales establecimientos municipales',
    organismo: 'Municipalidad de Santiago',
    descripcion: 'Adquisición de equipos computacionales para establecimientos educacionales y dependencias municipales de la comuna de Santiago.',
    montoUf: 2200,
    fechaCierre: new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000),
    estado: 'activo',
    semaforo: getSemaforo(new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000)),
    pymesPostuladas: 7,
    requisitos: [
      'Distribuidor autorizado o carta del fabricante',
      'Garantía mínima de equipos: 36 meses',
      'Soporte técnico en sitio en 48 horas',
      'Sin litigios con organismos públicos últimos 3 años',
      'Boleta de garantía por 5% del valor adjudicado',
    ],
  },
  {
    id: '003',
    nombre: 'Consultoría transformación digital servicios municipales — SUBDERE',
    organismo: 'Subsecretaría de Desarrollo Regional',
    descripcion: 'Consultoría especializada para el diseño e implementación de estrategias de transformación digital en servicios municipales del país.',
    montoUf: 4500,
    fechaCierre: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000),
    estado: 'activo',
    semaforo: getSemaforo(new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000)),
    pymesPostuladas: 2,
    requisitos: [
      'Giro en consultoría o tecnología',
      'Al menos 1 profesional titulado en el equipo',
      'Experiencia en mínimo 2 proyectos similares con el Estado',
      'ISO 9001 vigente (deseable)',
      'Sin sanciones del Consejo para la Transparencia',
    ],
  },
];

export const empresasMock: MockEmpresa[] = [
  {
    id: 'emp-001',
    rut: '76.543.210-K',
    razonSocial: 'TecnoServ Ltda.',
    giro: 'Servicios de tecnología y consultoría',
    clasificacionPyme: 'pequena',
    ventasUf: 8500,
    numTrabajadores: 12,
    tieneDeudaPrevisional: false,
    tieneDeudaTributaria: false,
    tieneDenunciaLaboral: false,
    tieneLitigioProveedor: false,
    inscritaChileProveedores: true,
    estadoPrimerFiltro: 'califica',
    scoreCompletitud: 70,
    certificaciones: ['ISO 9001'],
    repLegal: 'María González Pérez',
    cargoRepLegal: 'Gerente General',
    fechaRegistro: new Date('2025-04-10'),
    checklistItems: [
      { nombre: 'Inscripción ChileProveedores', estado: 'cumple', inhabilitante: true },
      { nombre: 'Sin deuda previsional', estado: 'cumple', inhabilitante: true },
      { nombre: 'Sin deuda tributaria', estado: 'cumple', inhabilitante: true },
      { nombre: 'Clasificación PYME pequeña (2.400–25.000 UF)', estado: 'cumple', inhabilitante: false },
      { nombre: 'Mínimo 5 trabajadores con contrato', estado: 'cumple', inhabilitante: false },
      { nombre: 'Certificado SUSESO de cumplimiento laboral', estado: 'no_cumple', inhabilitante: false, gap: 'No se ha cargado el certificado SUSESO vigente', accion: 'Solicitar certificado en www.suseso.cl y adjuntarlo antes del cierre' },
      { nombre: 'Sin multas DT últimos 24 meses', estado: 'pendiente', inhabilitante: false, gap: 'Verificación en curso', accion: 'Obtener certificado en la Dirección del Trabajo' },
    ],
  },
  {
    id: 'emp-002',
    rut: '77.891.234-5',
    razonSocial: 'Construcciones Rápidas SpA',
    giro: 'Construcción y obras civiles',
    clasificacionPyme: 'pequena',
    ventasUf: 12000,
    numTrabajadores: 8,
    tieneDeudaPrevisional: true,
    tieneDeudaTributaria: false,
    tieneDenunciaLaboral: false,
    tieneLitigioProveedor: false,
    inscritaChileProveedores: true,
    estadoPrimerFiltro: 'no_califica',
    scoreCompletitud: 40,
    certificaciones: [],
    repLegal: 'Roberto Silva Castro',
    cargoRepLegal: 'Representante Legal',
    fechaRegistro: new Date('2025-04-18'),
    feedbackAdmin: 'Regulariza deuda previsional en www.previred.com antes de postular',
    checklistItems: [
      { nombre: 'Sin deuda previsional', estado: 'no_cumple', inhabilitante: true, gap: 'Deuda previsional activa detectada', accion: 'Regularizar en www.previred.com' },
      { nombre: 'Inscripción ChileProveedores', estado: 'cumple', inhabilitante: true },
      { nombre: 'Sin deuda tributaria', estado: 'cumple', inhabilitante: true },
      { nombre: 'Clasificación PYME pequeña', estado: 'cumple', inhabilitante: false },
    ],
  },
  {
    id: 'emp-003',
    rut: '78.123.456-3',
    razonSocial: 'Soluciones Digitales Andes SPA',
    giro: 'Desarrollo de software y consultoría TI',
    clasificacionPyme: 'pequena',
    ventasUf: 15000,
    numTrabajadores: 20,
    tieneDeudaPrevisional: false,
    tieneDeudaTributaria: false,
    tieneDenunciaLaboral: false,
    tieneLitigioProveedor: false,
    inscritaChileProveedores: true,
    estadoPrimerFiltro: 'califica',
    scoreCompletitud: 95,
    certificaciones: ['ISO 9001', 'ISO 27001'],
    repLegal: 'Claudia Morales Vega',
    cargoRepLegal: 'Gerente General',
    fechaRegistro: new Date('2025-05-02'),
  },
];

export const postulacionesMock: Postulacion[] = [
  { id: 'post-001', concursoId: '001', empresaId: 'emp-001', estado: 'en_progreso', fechaInicio: new Date('2025-05-01'), etapaActual: 2 },
  { id: 'post-002', concursoId: '003', empresaId: 'emp-001', estado: 'guardado', fechaInicio: new Date('2025-05-14'), etapaActual: 0 },
];

export function getSemaforoEmoji(color: SemaforoColor) {
  return { green: '🟢', yellow: '🟡', red: '🔴', black: '⚫' }[color];
}

export function getSemaforoLabel(color: SemaforoColor) {
  return { green: 'Tiempo suficiente', yellow: 'Pronto a vencer', red: 'Urgente', black: 'Vencido' }[color];
}

export function diasRestantes(fecha: Date): number {
  return Math.floor((fecha.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function validarRut(rut: string): boolean {
  const limpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (!/^[0-9]{7,8}[0-9K]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let suma = 0, mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const dvEsp = 11 - (suma % 11);
  return dv === (dvEsp === 11 ? '0' : dvEsp === 10 ? 'K' : String(dvEsp));
}

export function clasificarPyme(ventasUf: number): { label: string; tipo: 'micro' | 'pequena' | 'mediana' | 'no_aplica' } {
  if (ventasUf <= 2400) return { label: 'Microempresa (≤ 2.400 UF)', tipo: 'micro' };
  if (ventasUf <= 25000) return { label: 'Pequeña empresa (2.400–25.000 UF)', tipo: 'pequena' };
  if (ventasUf <= 100000) return { label: 'Mediana empresa (25.000–100.000 UF)', tipo: 'mediana' };
  return { label: 'No aplica como PYME (> 100.000 UF)', tipo: 'no_aplica' };
}

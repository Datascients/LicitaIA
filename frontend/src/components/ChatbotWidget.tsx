import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  fuente?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const MOCK_RESPONSES: { triggers: string[]; respuesta: string; fuente: string }[] = [
  {
    triggers: ['document', 'requisi', 'necesito', 'qué necesit'],
    respuesta: 'Los documentos obligatorios para postular son: (1) Certificado de inscripción ChileProveedores vigente, (2) Certificado SUSESO de cumplimiento laboral, (3) Declaración jurada simple de no tener deudas previsionales, (4) Propuesta técnica y económica según el formato de las bases.',
    fuente: 'Cláusula 5.2 — Bases Técnicas Concurso 001',
  },
  {
    triggers: ['penalidad', 'atraso', 'multa', 'retraso'],
    respuesta: 'Las penalidades por atraso en la entrega son del 0,5% del valor del contrato por cada día hábil de retraso, con un tope del 10%. Superado ese límite, el organismo comprador puede resolver el contrato administrativamente.',
    fuente: 'Artículo 22 — Ley 19.886 de Compras Públicas',
  },
  {
    triggers: ['deuda', 'previsional', 'inhabil', 'bloquea', 'impide'],
    respuesta: 'Sí, las deudas previsionales son una causal de inhabilidad que te impide postular según la Ley 19.886. Debes regularizarlas antes de la fecha de cierre del concurso en www.previred.com y obtener el certificado de cumplimiento para adjuntarlo.',
    fuente: 'Artículo 4° — Ley 19.886 (Causales de inhabilidad)',
  },
  {
    triggers: ['pyme', 'uf', 'ventas', 'clasificaci'],
    respuesta: 'Según la Ley 20.416, las empresas se clasifican en: Microempresa (ventas ≤ 2.400 UF), Pequeña empresa (2.400 a 25.000 UF) y Mediana empresa (25.000 a 100.000 UF). La mayoría de los concursos de Mercado Público están orientados a empresas de hasta 100.000 UF anuales.',
    fuente: 'Artículo 2° — Ley 20.416 sobre Empresas de Menor Tamaño',
  },
  {
    triggers: ['chileproveedores', 'inscrit', 'registro'],
    respuesta: 'Para inscribirte en ChileProveedores necesitas: RUT empresa activo, documentos del representante legal, último balance tributario, y el formulario de inscripción en www.chileproveedores.cl. El proceso toma entre 5 y 10 días hábiles.',
    fuente: 'Instructivo ChileProveedores — Requisitos de inscripción',
  },
  {
    triggers: ['garantía', 'boleta', 'seguro'],
    respuesta: 'El concurso exige una boleta de garantía equivalente al 5% del valor adjudicado, emitida por un banco o institución financiera. Debe mantenerse vigente durante toda la ejecución del contrato más 60 días adicionales.',
    fuente: 'Cláusula 8.1 — Bases Técnicas Concurso 001',
  },
];

function getMockResponse(query: string) {
  const q = query.toLowerCase();
  const match = MOCK_RESPONSES.find(r => r.triggers.some(t => q.includes(t)));
  return match ?? {
    respuesta: 'Para postular a este concurso debes tener inscripción vigente en ChileProveedores, cumplir con la clasificación PYME solicitada y no tener inhabilidades activas. ¿Tienes alguna pregunta específica sobre los requisitos?',
    fuente: 'Cláusula 3.1 — Bases Técnicas Concurso 001',
  };
}

export default function ChatbotWidget() {
  const { role } = useApp();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'bot',
      text: '¡Hola! Soy LicitaBot 🤖\nPregúntame sobre los requisitos de cualquier concurso activo, inhabilidades, documentos necesarios o cómo mejorar tu perfil.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, minimized]);

  if (!role) return null;

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, empresa_id: 'emp-001', concurso_id: '001' }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: Date.now().toString() + 'b',
        role: 'bot',
        text: data.corrected || data.respuesta || 'Sin respuesta verificada disponible.',
        fuente: data.fuente_citada,
      }]);
    } catch {
      const mock = getMockResponse(text);
      setMessages(prev => [...prev, {
        id: Date.now().toString() + 'b',
        role: 'bot',
        text: mock.respuesta,
        fuente: mock.fuente,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestionsBase = ['¿Qué documentos necesito?', '¿Puedo postular con deuda previsional?', '¿Cómo me inscribo en ChileProveedores?'];

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div
          className="mb-3 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all"
          style={{ width: 360, height: minimized ? 52 : 480 }}
        >
          {/* Header */}
          <div className="bg-navy flex items-center justify-between px-4 py-3 flex-shrink-0 cursor-pointer" onClick={() => setMinimized(v => !v)}>
            <div className="flex items-center gap-2.5 text-white">
              <div className="relative">
                <MessageSquare size={18} />
                {loading && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />}
              </div>
              <div>
                <span className="font-semibold text-sm">LicitaBot</span>
                <span className="ml-2 text-xs text-white/50">IA especializada</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-white/60">
              <button onClick={e => { e.stopPropagation(); setMinimized(v => !v); }} className="hover:text-white p-1 rounded transition-colors">
                {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button onClick={e => { e.stopPropagation(); setOpen(false); }} className="hover:text-white p-1 rounded transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'bot' && (
                      <div className="w-6 h-6 bg-navy rounded-full flex items-center justify-center text-white text-xs mr-1.5 flex-shrink-0 mt-0.5">
                        🤖
                      </div>
                    )}
                    <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-navy text-white rounded-br-md'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                      {msg.fuente && (
                        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-navy font-medium flex items-center gap-1">
                          📎 [{msg.fuente}]
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 bg-navy rounded-full flex items-center justify-center text-white text-xs mr-1.5 flex-shrink-0">🤖</div>
                    <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                      <Loader2 size={13} className="animate-spin text-navy" />
                      <span className="text-xs text-gray-400">LicitaBot analizando bases... ⏳</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggestions */}
              {messages.length <= 1 && (
                <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                  {suggestionsBase.map(s => (
                    <button key={s} onClick={() => { setInput(s); }} className="text-xs bg-navy/8 text-navy px-2.5 py-1.5 rounded-full hover:bg-navy/15 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-gray-100 bg-white">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                    placeholder="Pregunta sobre las bases del concurso activo..."
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/25 focus:border-navy"
                  />
                  <button
                    onClick={send}
                    disabled={loading || !input.trim()}
                    className="bg-navy text-white rounded-xl p-2.5 hover:bg-navy-light disabled:opacity-40 transition-colors flex-shrink-0"
                  >
                    <Send size={15} />
                  </button>
                </div>
                <p className="text-xs text-gray-300 text-center mt-1.5">Respuestas basadas en las bases oficiales del concurso</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => { setOpen(v => !v); setMinimized(false); }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 ${open ? 'bg-gray-600' : 'bg-navy hover:bg-navy-light'}`}
      >
        {open ? <X size={22} className="text-white" /> : <MessageSquare size={22} className="text-white" />}
        {!open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  );
}

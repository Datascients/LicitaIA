import { CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import type { ChecklistItem } from '../data/mockData';

export default function ChecklistRow({ item }: { item: ChecklistItem }) {
  const config = {
    cumple: {
      icon: <CheckCircle2 size={17} className="text-emerald-600 flex-shrink-0 mt-0.5" />,
      bg: 'bg-emerald-50/60 border-emerald-100',
      badge: <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Cumple</span>,
    },
    no_cumple: {
      icon: <XCircle size={17} className="text-red-500 flex-shrink-0 mt-0.5" />,
      bg: 'bg-red-50/60 border-red-100',
      badge: (
        <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
          No cumple{item.inhabilitante ? ' · inhabilitante' : ''}
        </span>
      ),
    },
    pendiente: {
      icon: <AlertTriangle size={17} className="text-amber-500 flex-shrink-0 mt-0.5" />,
      bg: 'bg-amber-50/60 border-amber-100',
      badge: <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pendiente</span>,
    },
  }[item.estado];

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${config.bg}`}>
      {config.icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-sm font-medium text-gray-900">{item.nombre}</span>
          {config.badge}
        </div>
        {item.gap && <p className="text-xs text-gray-500 mt-1">{item.gap}</p>}
        {item.accion && (
          <p className="text-xs text-blue-700 mt-1.5 flex items-center gap-1">
            <ExternalLink size={11} />
            {item.accion}
          </p>
        )}
      </div>
    </div>
  );
}

import type { SemaforoColor } from '../data/mockData';
import { getSemaforoLabel, diasRestantes } from '../data/mockData';

interface Props {
  color: SemaforoColor;
  fechaCierre: Date;
  size?: 'sm' | 'md';
}

export default function SemaforoTag({ color, fechaCierre, size = 'md' }: Props) {
  const dias = diasRestantes(fechaCierre);
  const configs: Record<SemaforoColor, { bg: string; dot: string; text: string }> = {
    green: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800', dot: 'bg-emerald-500', text: '' },
    yellow: { bg: 'bg-amber-50 border-amber-200 text-amber-800', dot: 'bg-amber-500', text: '' },
    red: { bg: 'bg-red-50 border-red-200 text-red-800', dot: 'bg-red-500 animate-pulse', text: '' },
    black: { bg: 'bg-gray-100 border-gray-300 text-gray-500', dot: 'bg-gray-400', text: '' },
  };
  const c = configs[color];
  const diasLabel = dias < 0 ? 'Vencido' : dias === 0 ? 'Vence hoy' : `${dias}d restantes`;
  const textSize = size === 'sm' ? 'text-xs' : 'text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium ${textSize} ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      <span>{getSemaforoLabel(color)}</span>
      <span className="opacity-60">·</span>
      <span className="font-bold">{diasLabel}</span>
    </span>
  );
}

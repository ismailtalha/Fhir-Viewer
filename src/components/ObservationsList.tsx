
import { SimpleVital } from '@/types/fhir';
import { Activity } from 'lucide-react';
import { VList } from 'virtua';
import { memo } from 'react';

interface ObservationsListProps {
    observations: SimpleVital[];
}

const ObservationItem = memo(({ obs }: { obs: SimpleVital }) => (
    <div
        className="bg-slate-700/30 rounded-xl p-3 border border-slate-700/50 hover:border-slate-600 transition-colors group mb-3"
    >
        <div className="flex justify-between items-start mb-1">
            <span className="text-sm font-medium text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                {obs.display}
            </span>
            <span className="text-xs text-slate-400 capitalize bg-slate-800 px-2 py-0.5 rounded ml-2 shrink-0">
                {obs.category}
            </span>
        </div>
        <div className="flex justify-between items-end">
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-blue-400">
                    {obs.value}
                </span>
                <span className="text-xs text-slate-500">
                    {obs.unit}
                </span>
            </div>
            <span className="text-[10px] text-slate-500">
                {new Date(obs.effectiveDateTime).toLocaleDateString()}
            </span>
        </div>
    </div>
));

ObservationItem.displayName = 'ObservationItem';

export default function ObservationsList({ observations }: ObservationsListProps) {
    if (observations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
                <Activity className="w-12 h-12 mb-2 opacity-20" />
                <p>No observations found</p>
            </div>
        );
    }

    return (
        <div className="h-[400px] pr-2 custom-scrollbar">
            <VList style={{ height: '100%' }}>
                {observations.map((obs) => (
                    <ObservationItem key={obs.id} obs={obs} />
                ))}
            </VList>
        </div>
    );
}

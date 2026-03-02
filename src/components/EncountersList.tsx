'use client';

import { SimpleEncounter } from '@/types/fhir';
import { Calendar, Clock } from 'lucide-react';
import { VList } from 'virtua';
import { memo } from 'react';

interface EncountersListProps {
    encounters: SimpleEncounter[];
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'finished':
            return 'text-green-400 bg-green-500/10 border-green-500/30';
        case 'in-progress':
            return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
        case 'planned':
            return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
        case 'cancelled':
            return 'text-red-400 bg-red-500/10 border-red-500/30';
        default:
            return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
};

const EncounterItem = memo(({ encounter }: { encounter: SimpleEncounter }) => (
    <div
        className="p-3 rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 transition-colors mb-3"
    >
        <div className="flex justify-between items-start mb-2">
            <div>
                <p className="text-white font-medium">{encounter.type}</p>
                <p className="text-sm text-slate-400 mt-0.5">{encounter.reason}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(encounter.status)} capitalize`}>
                {encounter.status}
            </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {encounter.period}
            </div>
        </div>
    </div>
));

EncounterItem.displayName = 'EncounterItem';

export default function EncountersList({ encounters }: EncountersListProps) {
    if (encounters.length === 0) {
        return (
            <div className="flex items-center justify-center py-6 text-slate-500">
                <div className="text-center">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No encounters recorded</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-h-60 overflow-hidden pr-2">
            <VList style={{ height: '240px' }}>
                {encounters.map((encounter) => (
                    <EncounterItem key={encounter.id} encounter={encounter} />
                ))}
            </VList>
        </div>
    );
}

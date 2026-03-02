'use client';

import { SimpleProcedure } from '@/types/fhir';
import { Activity, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { VList } from 'virtua';
import { memo } from 'react';

interface ProceduresListProps {
    procedures: SimpleProcedure[];
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'completed':
            return 'text-green-400';
        case 'in-progress':
            return 'text-blue-400';
        case 'stopped':
            return 'text-red-400';
        default:
            return 'text-slate-400';
    }
};

const ProcedureItem = memo(({ procedure }: { procedure: SimpleProcedure }) => {
    const statusColor = getStatusColor(procedure.status);
    return (
        <div
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800/50 transition-colors mb-2"
        >
            <div className={`mt-0.5 ${statusColor}`}>
                {procedure.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                ) : procedure.status === 'in-progress' ? (
                    <Clock className="w-4 h-4" />
                ) : (
                    <AlertCircle className="w-4 h-4" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{procedure.display}</p>
                {procedure.performedDateTime && (
                    <p className="text-xs text-slate-500 mt-1">
                        {new Date(procedure.performedDateTime).toLocaleDateString()}
                    </p>
                )}
            </div>

            <span className={`text-xs px-2 py-0.5 rounded bg-slate-800 capitalize ${statusColor}`}>
                {procedure.status}
            </span>
        </div>
    );
});

ProcedureItem.displayName = 'ProcedureItem';

export default function ProceduresList({ procedures }: ProceduresListProps) {
    if (procedures.length === 0) {
        return (
            <div className="flex items-center justify-center py-6 text-slate-500">
                <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No procedures recorded</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-h-60 overflow-hidden pr-2">
            <VList style={{ height: '240px' }}>
                {procedures.map((procedure) => (
                    <ProcedureItem key={procedure.id} procedure={procedure} />
                ))}
            </VList>
        </div>
    );
}

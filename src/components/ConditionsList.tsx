'use client';

import { SimpleCondition } from '@/types/fhir';
import { AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { VList } from 'virtua';
import { memo } from 'react';

interface ConditionsListProps {
    conditions: SimpleCondition[];
}

const getStatusInfo = (status: string) => {
    switch (status) {
        case 'active':
            return {
                icon: <AlertCircle className="w-4 h-4" />,
                color: 'text-red-400',
                bg: 'bg-red-500/10 border-red-500/30',
            };
        case 'resolved':
            return {
                icon: <CheckCircle2 className="w-4 h-4" />,
                color: 'text-green-400',
                bg: 'bg-green-500/10 border-green-500/30',
            };
        case 'inactive':
            return {
                icon: <XCircle className="w-4 h-4" />,
                color: 'text-slate-400',
                bg: 'bg-slate-500/10 border-slate-500/30',
            };
        default:
            return {
                icon: <Clock className="w-4 h-4" />,
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/10 border-yellow-500/30',
            };
    }
};

const ConditionItem = memo(({ condition }: { condition: SimpleCondition }) => {
    const statusInfo = getStatusInfo(condition.clinicalStatus);
    return (
        <div
            className={`p-3 rounded-xl border ${statusInfo.bg} transition-colors hover:border-opacity-50 mb-2`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <p className="text-white font-medium">{condition.display}</p>
                    {condition.code && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            Code: {condition.code}
                        </p>
                    )}
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.icon}
                    <span className="capitalize">{condition.clinicalStatus}</span>
                </div>
            </div>
            {condition.onsetDateTime && (
                <p className="text-xs text-slate-500 mt-2">
                    Onset: {new Date(condition.onsetDateTime).toLocaleDateString()}
                </p>
            )}
        </div>
    );
});

ConditionItem.displayName = 'ConditionItem';

export default function ConditionsList({ conditions }: ConditionsListProps) {
    if (conditions.length === 0) {
        return (
            <div className="flex items-center justify-center py-6 text-slate-500">
                <div className="text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No conditions recorded</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-h-48 overflow-hidden">
            <VList style={{ height: '192px' }}>
                {conditions.map((condition) => (
                    <ConditionItem key={condition.id} condition={condition} />
                ))}
            </VList>
        </div>
    );
}

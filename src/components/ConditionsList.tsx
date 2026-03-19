'use client';

import { SimpleCondition } from '@/types/fhir';
import { AlertCircle, CheckCircle2, XCircle, Clock, Search, Filter, Loader2 } from 'lucide-react';
import { VList } from 'virtua';
import { memo, useState, useMemo, useEffect } from 'react';

interface ConditionsListProps {
    conditions: SimpleCondition[];
    isExpanded?: boolean;
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
}

const ScrollTrigger = memo(({ onLoadMore, loading }: { onLoadMore: () => void, loading?: boolean }) => {
    const [ref, setRef] = useState<HTMLDivElement | null>(null);
    useEffect(() => {
        if (loading || !ref) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) onLoadMore();
        }, { threshold: 0.1 });
        observer.observe(ref);
        return () => observer.disconnect();
    }, [onLoadMore, loading, ref]);

    return (
        <div ref={setRef} className="py-4 flex justify-center items-center pb-8 text-slate-400">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-500" /> : <div className="h-6" />}
        </div>
    );
});
ScrollTrigger.displayName = 'ScrollTrigger';

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
        </div>
    );
});
ConditionItem.displayName = 'ConditionItem';

const DateHeader = memo(({ date }: { date: string }) => (
    <div className="sticky top-0 z-10 bg-slate-800/90 backdrop-blur-sm py-2 px-1 mb-2 mt-4 first:mt-0 rounded-t-lg text-center">
        <h4 className="text-sm font-bold text-slate-300 border-b border-slate-700/50 pb-1 inline-block px-4">{date}</h4>
    </div>
));
DateHeader.displayName = 'DateHeader';

export default function ConditionsList({ conditions, isExpanded, onLoadMore, hasMore, loadingMore }: ConditionsListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const statuses = useMemo(() => {
        const stats = new Set<string>();
        conditions.forEach(c => c.clinicalStatus && stats.add(c.clinicalStatus));
        return ['all', ...Array.from(stats).sort()];
    }, [conditions]);

    const items = useMemo(() => {
        // Filter
        let filtered = conditions;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(c => c.display.toLowerCase().includes(lower));
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => c.clinicalStatus === statusFilter);
        }

        // Sort by date desc
        filtered.sort((a, b) => {
            const timeA = a.onsetDateTime ? new Date(a.onsetDateTime).getTime() : 0;
            const timeB = b.onsetDateTime ? new Date(b.onsetDateTime).getTime() : 0;
            return timeB - timeA;
        });

        // Group
        const groups: Record<string, SimpleCondition[]> = {};
        filtered.forEach(cond => {
            if (cond.onsetDateTime) {
                const hasTime = cond.onsetDateTime.includes('T') && cond.onsetDateTime.length > 10;
                let dateTime = '';
                
                if (hasTime) {
                    const d = new Date(cond.onsetDateTime);
                    const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    dateTime = `${dateStr} - ${timeStr}`;
                } else {
                    const d = new Date(cond.onsetDateTime.length === 10 ? cond.onsetDateTime + "T00:00:00Z" : cond.onsetDateTime);
                    dateTime = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                }

                if (!groups[dateTime]) groups[dateTime] = [];
                groups[dateTime].push(cond);
            } else {
                if (!groups['Unknown Date']) groups['Unknown Date'] = [];
                groups['Unknown Date'].push(cond);
            }
        });

        // Flatten
        const flat: any[] = [];
        Object.entries(groups).forEach(([date, condList]) => {
            flat.push({ type: 'header', date, id: `header-${date}` });
            condList.forEach(cond => {
                flat.push({ type: 'item', data: cond, id: cond.id });
            });
        });

        if (hasMore) {
            flat.push({ type: 'loader', id: 'infinite-loader' });
        }

        return flat;
    }, [conditions, searchTerm, statusFilter, hasMore]);

    if (conditions.length === 0) {
        return (
            <div className="flex items-center justify-center py-6 h-full text-slate-500">
                <div className="text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No conditions recorded</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full">
            {isExpanded && (
                <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0 px-1">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Search conditions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>
                    <div className="relative min-w-[150px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none capitalize"
                        >
                            {statuses.map(s => (
                                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
            
            <div className={`flex-1 overflow-hidden pr-2 ${!isExpanded ? 'h-[192px]' : ''}`}>
                {items.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
                        No matches found for current filters
                    </div>
                ) : (
                    <VList style={{ height: '100%' }}>
                        {items.map((item) => (
                            item.type === 'header' ? <DateHeader key={item.id} date={item.date} /> :
                            item.type === 'loader' ? <ScrollTrigger key={item.id} onLoadMore={onLoadMore!} loading={loadingMore} /> :
                            <ConditionItem key={item.id} condition={item.data} />
                        ))}
                    </VList>
                )}
            </div>
        </div>
    );
}

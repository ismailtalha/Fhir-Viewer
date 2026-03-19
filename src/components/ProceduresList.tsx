'use client';

import { SimpleProcedure } from '@/types/fhir';
import { Activity, CheckCircle2, AlertCircle, Clock, Search, Filter, Loader2 } from 'lucide-react';
import { VList } from 'virtua';
import { memo, useState, useMemo, useEffect } from 'react';

interface ProceduresListProps {
    procedures: SimpleProcedure[];
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
            className="p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800/50 transition-colors mb-2"
        >
            <div className="flex items-start gap-3 mb-2">
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
                </div>

                <span className={`text-xs px-2 py-0.5 rounded bg-slate-800 capitalize shrink-0 ${statusColor}`}>
                    {procedure.status}
                </span>
            </div>
        </div>
    );
});
ProcedureItem.displayName = 'ProcedureItem';

const DateHeader = memo(({ date }: { date: string }) => (
    <div className="sticky top-0 z-10 bg-slate-800/90 backdrop-blur-sm py-2 px-1 mb-2 mt-4 first:mt-0 rounded-t-lg text-center">
        <h4 className="text-sm font-bold text-slate-300 border-b border-slate-700/50 pb-1 inline-block px-4">{date}</h4>
    </div>
));
DateHeader.displayName = 'DateHeader';

export default function ProceduresList({ procedures, isExpanded, onLoadMore, hasMore, loadingMore }: ProceduresListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const statuses = useMemo(() => {
        const stats = new Set<string>();
        procedures.forEach(p => p.status && stats.add(p.status));
        return ['all', ...Array.from(stats).sort()];
    }, [procedures]);

    const items = useMemo(() => {
        let filtered = procedures;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(p => p.display.toLowerCase().includes(lower));
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.status === statusFilter);
        }

        filtered.sort((a, b) => {
            const timeA = a.performedDateTime ? new Date(a.performedDateTime).getTime() : 0;
            const timeB = b.performedDateTime ? new Date(b.performedDateTime).getTime() : 0;
            return timeB - timeA;
        });

        const groups: Record<string, SimpleProcedure[]> = {};
        filtered.forEach(proc => {
            if (proc.performedDateTime) {
                const hasTime = proc.performedDateTime.includes('T') && proc.performedDateTime.length > 10;
                let dateTime = '';

                if (hasTime) {
                    const d = new Date(proc.performedDateTime);
                    const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    dateTime = `${dateStr} - ${timeStr}`;
                } else {
                    const d = new Date(proc.performedDateTime.length === 10 ? proc.performedDateTime + "T00:00:00Z" : proc.performedDateTime);
                    dateTime = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                }

                if (!groups[dateTime]) groups[dateTime] = [];
                groups[dateTime].push(proc);
            } else {
                if (!groups['Unknown Date']) groups['Unknown Date'] = [];
                groups['Unknown Date'].push(proc);
            }
        });

        const flat: any[] = [];
        Object.entries(groups).forEach(([date, procList]) => {
            flat.push({ type: 'header', date, id: `header-${date}` });
            procList.forEach(proc => {
                flat.push({ type: 'item', data: proc, id: proc.id });
            });
        });

        if (hasMore) {
            flat.push({ type: 'loader', id: 'infinite-loader' });
        }

        return flat;
    }, [procedures, searchTerm, statusFilter, hasMore]);

    if (procedures.length === 0) {
        return (
            <div className="flex items-center justify-center py-6 h-full text-slate-500">
                <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No procedures recorded</p>
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
                            placeholder="Search procedures..."
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
            
            <div className={`flex-1 overflow-hidden pr-2 ${!isExpanded ? 'h-[240px]' : ''}`}>
                {items.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
                        No matches found for current filters
                    </div>
                ) : (
                    <VList style={{ height: '100%' }}>
                        {items.map((item) => (
                            item.type === 'header' ? <DateHeader key={item.id} date={item.date} /> :
                            item.type === 'loader' ? <ScrollTrigger key={item.id} onLoadMore={onLoadMore!} loading={loadingMore} /> :
                            <ProcedureItem key={item.id} procedure={item.data} />
                        ))}
                    </VList>
                )}
            </div>
        </div>
    );
}

'use client';

import { SimpleEncounter } from '@/types/fhir';
import { Calendar, Clock, Search, Filter, Loader2 } from 'lucide-react';
import { VList } from 'virtua';
import { memo, useState, useMemo, useEffect } from 'react';

interface EncountersListProps {
    encounters: SimpleEncounter[];
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

const EncounterItem = memo(({ encounter }: { encounter: SimpleEncounter }) => {
    return (
        <div
            className="p-3 rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 transition-colors mb-3"
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-white font-medium">{encounter.type}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{encounter.reason}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ml-2 ${getStatusColor(encounter.status)} capitalize`}>
                    {encounter.status}
                </span>
            </div>
        </div>
    );
});
EncounterItem.displayName = 'EncounterItem';

const DateHeader = memo(({ date }: { date: string }) => (
    <div className="sticky top-0 z-10 bg-slate-800/90 backdrop-blur-sm py-2 px-1 mb-2 mt-4 first:mt-0 rounded-t-lg text-center">
        <h4 className="text-sm font-bold text-slate-300 border-b border-slate-700/50 pb-1 inline-block px-4">{date}</h4>
    </div>
));
DateHeader.displayName = 'DateHeader';

// Helper to extract a timestamp
const getEncounterTimestamp = (enc: SimpleEncounter) => {
    const dateStr = (enc as any).start || enc.period.split(' - ')[0];
    const ms = new Date(dateStr).getTime();
    return isNaN(ms) ? 0 : ms;
};

export default function EncountersList({ encounters, isExpanded, onLoadMore, hasMore, loadingMore }: EncountersListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const statuses = useMemo(() => {
        const stats = new Set<string>();
        encounters.forEach(e => e.status && stats.add(e.status));
        return ['all', ...Array.from(stats).sort()];
    }, [encounters]);

    const items = useMemo(() => {
        let filtered = encounters;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(e => 
                (e.type && e.type.toLowerCase().includes(lower)) || 
                (e.reason && e.reason.toLowerCase().includes(lower))
            );
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(e => e.status === statusFilter);
        }

        filtered.sort((a, b) => getEncounterTimestamp(b) - getEncounterTimestamp(a));

        const groups: Record<string, SimpleEncounter[]> = {};
        filtered.forEach(enc => {
            const ts = getEncounterTimestamp(enc);
            if (ts > 0) {
                const dateStrRaw = (enc as any).start || enc.period.split(' - ')[0];
                const hasTime = dateStrRaw && dateStrRaw.includes('T') && dateStrRaw.length > 10;
                let dateTime = '';

                if (hasTime) {
                    const d = new Date(ts);
                    const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    dateTime = `${dateStr} - ${timeStr}`;
                } else {
                    const d = new Date(dateStrRaw && dateStrRaw.length === 10 ? dateStrRaw + "T00:00:00Z" : ts);
                    dateTime = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                }

                if (!groups[dateTime]) groups[dateTime] = [];
                groups[dateTime].push(enc);
            } else {
                if (!groups['Unknown Date']) groups['Unknown Date'] = [];
                groups['Unknown Date'].push(enc);
            }
        });

        const flat: any[] = [];
        Object.entries(groups).forEach(([date, encList]) => {
            flat.push({ type: 'header', date, id: `header-${date}` });
            encList.forEach(enc => {
                flat.push({ type: 'item', data: enc, id: enc.id });
            });
        });

        if (hasMore) {
            flat.push({ type: 'loader', id: 'infinite-loader' });
        }

        return flat;
    }, [encounters, searchTerm, statusFilter, hasMore]);

    if (encounters.length === 0) {
        return (
            <div className="flex items-center justify-center py-6 h-full text-slate-500">
                <div className="text-center">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No encounters recorded</p>
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
                            placeholder="Search encounters..."
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
                            <EncounterItem key={item.id} encounter={item.data} />
                        ))}
                    </VList>
                )}
            </div>
        </div>
    );
}

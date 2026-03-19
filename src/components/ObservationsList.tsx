'use client';

import { SimpleVital } from '@/types/fhir';
import { Activity, Search, Filter, Loader2 } from 'lucide-react';
import { VList } from 'virtua';
import { memo, useState, useMemo, useEffect } from 'react';

interface ObservationsListProps {
    observations: SimpleVital[];
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

const ObservationItem = memo(({ obs }: { obs: SimpleVital }) => {
    return (
        <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-700/50 hover:border-slate-600 transition-colors group mb-3">
            <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-medium text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                    {obs.display}
                </span>
                <span className="text-xs text-slate-400 capitalize bg-slate-800 px-2 py-0.5 rounded ml-2 shrink-0">
                    {obs.category}
                </span>
            </div>
            <div className="flex justify-between items-end mb-2">
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-blue-400">
                        {obs.value}
                    </span>
                    <span className="text-xs text-slate-500">
                        {obs.unit}
                    </span>
                </div>
            </div>
        </div>
    );
});
ObservationItem.displayName = 'ObservationItem';

const DateHeader = memo(({ date }: { date: string }) => (
    <div className="sticky top-0 z-10 bg-slate-800/90 backdrop-blur-sm py-2 px-1 mb-2 mt-4 first:mt-0 rounded-t-lg text-center">
        <h4 className="text-sm font-bold text-slate-300 border-b border-slate-700/50 pb-1 inline-block px-4">{date}</h4>
    </div>
));
DateHeader.displayName = 'DateHeader';

export default function ObservationsList({ observations, isExpanded, onLoadMore, hasMore, loadingMore }: ObservationsListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const categories = useMemo(() => {
        const cats = new Set<string>();
        observations.forEach(o => o.category && cats.add(o.category));
        return ['all', ...Array.from(cats).sort()];
    }, [observations]);

    const items = useMemo(() => {
        // Filter
        let filtered = observations;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(o => o.display.toLowerCase().includes(lower));
        }
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(o => o.category === categoryFilter);
        }

        // Sort by date desc
        filtered.sort((a, b) => new Date(b.effectiveDateTime).getTime() - new Date(a.effectiveDateTime).getTime());

        // Group
        const groups: Record<string, SimpleVital[]> = {};
        filtered.forEach(obs => {
            if (!obs.effectiveDateTime) return;
            const hasTime = obs.effectiveDateTime.includes('T') && obs.effectiveDateTime.length > 10;
            let dateTime = '';
            
            if (hasTime) {
                const d = new Date(obs.effectiveDateTime);
                const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                dateTime = `${dateStr} - ${timeStr}`;
            } else {
                const d = new Date(obs.effectiveDateTime.length === 10 ? obs.effectiveDateTime + "T00:00:00Z" : obs.effectiveDateTime);
                dateTime = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
            }
            
            if (!groups[dateTime]) groups[dateTime] = [];
            groups[dateTime].push(obs);
        });

        // Flatten
        const flat: any[] = [];
        Object.entries(groups).forEach(([date, obsList]) => {
            flat.push({ type: 'header', date, id: `header-${date}` });
            obsList.forEach(obs => {
                flat.push({ type: 'item', data: obs, id: obs.id });
            });
        });

        if (hasMore) {
            flat.push({ type: 'loader', id: 'infinite-loader' });
        }

        return flat;
    }, [observations, searchTerm, categoryFilter, hasMore]);

    if (observations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
                <Activity className="w-12 h-12 mb-2 opacity-20" />
                <p>No observations found</p>
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
                            placeholder="Search observations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>
                    <div className="relative min-w-[150px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none capitalize"
                        >
                            {categories.map(c => (
                                <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
            
            <div className={`flex-1 overflow-hidden pr-2 ${!isExpanded ? 'h-[400px]' : ''}`}>
                {items.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
                        No matches found for current filters
                    </div>
                ) : (
                    <VList style={{ height: '100%' }}>
                        {items.map((item) => (
                            item.type === 'header' ? <DateHeader key={item.id} date={item.date} /> :
                            item.type === 'loader' ? <ScrollTrigger key={item.id} onLoadMore={onLoadMore!} loading={loadingMore} /> :
                            <ObservationItem key={item.id} obs={item.data} />
                        ))}
                    </VList>
                )}
            </div>
        </div>
    );
}

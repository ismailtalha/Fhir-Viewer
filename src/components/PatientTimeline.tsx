
import { TimelineEvent } from '@/types/fhir';
import {
    Calendar,
    Activity,
    Clock,
    Stethoscope,
    ClipboardList,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { VList } from 'virtua';
import { memo } from 'react';

interface PatientTimelineProps {
    events: TimelineEvent[];
}

const getEventIcon = (type: string) => {
    switch (type) {
        case 'encounter': return <Clock className="w-4 h-4 text-blue-400" />;
        case 'observation': return <Activity className="w-4 h-4 text-cyan-400" />;
        case 'procedure': return <Stethoscope className="w-4 h-4 text-purple-400" />;
        case 'condition': return <AlertCircle className="w-4 h-4 text-amber-400" />;
        default: return <ClipboardList className="w-4 h-4 text-slate-400" />;
    }
};

const getEventColor = (type: string) => {
    switch (type) {
        case 'encounter': return 'bg-blue-500/20 border-blue-500/30';
        case 'observation': return 'bg-cyan-500/20 border-cyan-500/30';
        case 'procedure': return 'bg-purple-500/20 border-purple-500/30';
        case 'condition': return 'bg-amber-500/20 border-amber-500/30';
        default: return 'bg-slate-500/20 border-slate-500/30';
    }
};

const TimelineEventItem = memo(({ event }: { event: TimelineEvent }) => (
    <div className="relative pl-12 group pb-8">
        {/* Timeline Line (connector) */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-700/50" />

        {/* Event Dot */}
        <div className={`absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center border-2 border-slate-900 z-10 ${getEventColor(event.type)} transition-transform group-hover:scale-110`}>
            {getEventIcon(event.type)}
        </div>

        {/* Content Card */}
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600 transition-all hover:bg-slate-800/60">
            <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                        {event.type}
                    </span>
                    <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                        {event.title}
                    </h4>
                </div>
                <div className="text-right">
                    <span className="text-xs font-medium text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700/50">
                        {new Date(event.timestamp).toLocaleDateString()} at {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed mb-3">
                {event.description}
            </p>

            <div className="flex items-center gap-4 flex-wrap">
                {event.status && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="capitalize">{event.status}</span>
                    </div>
                )}
                {event.value && (
                    <div className="flex items-center gap-1 text-sm">
                        <span className="text-blue-400 font-bold">{event.value}</span>
                        <span className="text-slate-500 text-xs">{event.unit}</span>
                    </div>
                )}
            </div>
        </div>
    </div>
));

TimelineEventItem.displayName = 'TimelineEventItem';

export default function PatientTimeline({ events }: PatientTimelineProps) {
    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Calendar className="w-12 h-12 mb-2 opacity-20" />
                <p>No timeline events found</p>
            </div>
        );
    }

    return (
        <div className="h-[600px] overflow-hidden">
            <VList style={{ height: '600px' }}>
                {events.map((event, index) => (
                    <TimelineEventItem key={`${event.id}-${index}`} event={event} />
                ))}
            </VList>
        </div>
    );
}

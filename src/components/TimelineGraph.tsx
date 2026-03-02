
import { TimelineEvent } from '@/types/fhir';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface TimelineGraphProps {
    events: TimelineEvent[];
}

export default function TimelineGraph({ events }: TimelineGraphProps) {
    // Map event type to Y-axis index
    const typeToIndex: Record<string, number> = {
        'encounter': 3,
        'condition': 2,
        'procedure': 1,
        'observation': 0,
    };

    const indexToType = ['Observation', 'Procedure', 'Condition', 'Encounter'];

    // Format data for chart
    const data = events.map(event => ({
        x: new Date(event.timestamp).getTime(),
        y: typeToIndex[event.type] ?? 0,
        z: 1, // Size of dot
        ...event
    })).sort((a, b) => a.x - b.x);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">{data.type}</p>
                    <p className="text-sm font-bold text-white mb-1">{data.title}</p>
                    <p className="text-xs text-slate-400 mb-2">{new Date(data.x).toLocaleDateString()}</p>
                    {data.value && (
                        <p className="text-xs text-blue-400 font-medium">
                            Value: {data.value} {data.unit}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'encounter': return '#60a5fa'; // Blue
            case 'condition': return '#fbbf24'; // Amber
            case 'procedure': return '#c084fc'; // Purple
            case 'observation': return '#22d3ee'; // Cyan
            default: return '#94a3b8';
        }
    };

    return (
        <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                    margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
                >
                    <XAxis
                        type="number"
                        dataKey="x"
                        domain={['auto', 'auto']}
                        name="Time"
                        tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
                        stroke="#64748b"
                        fontSize={10}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        domain={[-0.5, 3.5]}
                        ticks={[0, 1, 2, 3]}
                        tickFormatter={(val) => indexToType[val]}
                        stroke="#64748b"
                        fontSize={10}
                        width={80}
                    />
                    <ZAxis type="number" dataKey="z" range={[100, 100]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Events" data={data}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getEventColor(entry.type)} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}

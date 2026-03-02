'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SimpleVital } from '@/types/fhir';
import { Activity, Thermometer, Wind, Scale } from 'lucide-react';

interface VitalsChartProps {
    vitals: SimpleVital[];
}

interface ChartData {
    date: string;
    dateLabel: string;
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    weight?: number;
}

export default function VitalsChart({ vitals }: VitalsChartProps) {
    const { chartData, latestVitals } = useMemo(() => {
        // Group vitals by date for charting
        const dataMap = new Map<string, ChartData>();

        vitals.forEach((vital) => {
            if (!vital.effectiveDateTime) return;

            const date = new Date(vital.effectiveDateTime);
            const dateKey = date.toISOString().split('T')[0];
            const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (!dataMap.has(dateKey)) {
                dataMap.set(dateKey, { date: dateKey, dateLabel });
            }

            const entry = dataMap.get(dateKey)!;

            // Blood Pressure (composite with /)
            if (vital.code === '85354-9' || vital.display.toLowerCase().includes('blood pressure')) {
                const [sys, dia] = vital.value.split('/').map(Number);
                if (sys) entry.systolic = sys;
                if (dia) entry.diastolic = dia;
            }
            // Heart Rate
            else if (vital.code === '8867-4' || vital.display.toLowerCase().includes('heart rate')) {
                entry.heartRate = parseFloat(vital.value);
            }
            // Temperature
            else if (vital.code === '8310-5' || vital.display.toLowerCase().includes('temperature')) {
                entry.temperature = parseFloat(vital.value);
            }
            // Respiratory Rate
            else if (vital.code === '9279-1' || vital.display.toLowerCase().includes('respiratory')) {
                entry.respiratoryRate = parseFloat(vital.value);
            }
            // Weight
            else if (vital.code === '29463-7' || vital.display.toLowerCase().includes('weight')) {
                entry.weight = parseFloat(vital.value);
            }
        });

        // Sort by date
        const sortedData = Array.from(dataMap.values()).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Get latest of each type
        const latest: Record<string, SimpleVital> = {};
        vitals.forEach((vital) => {
            const key = vital.display.toLowerCase().includes('blood pressure')
                ? 'bp'
                : vital.display.toLowerCase().includes('heart rate')
                    ? 'hr'
                    : vital.display.toLowerCase().includes('temperature')
                        ? 'temp'
                        : vital.display;

            if (!latest[key] || new Date(vital.effectiveDateTime) > new Date(latest[key].effectiveDateTime)) {
                latest[key] = vital;
            }
        });

        return { chartData: sortedData.slice(-10), latestVitals: Object.values(latest).slice(0, 4) };
    }, [vitals]);

    if (vitals.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-slate-500">
                <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No vital signs recorded</p>
                </div>
            </div>
        );
    }

    const getVitalIcon = (display: string) => {
        const name = display.toLowerCase();
        if (name.includes('temperature')) return <Thermometer className="w-4 h-4" />;
        if (name.includes('respiratory')) return <Wind className="w-4 h-4" />;
        if (name.includes('weight')) return <Scale className="w-4 h-4" />;
        return <Activity className="w-4 h-4" />;
    };

    return (
        <div className="space-y-4">
            {/* Latest Vitals Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {latestVitals.map((vital) => (
                    <div
                        key={vital.id}
                        className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30"
                    >
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                            {getVitalIcon(vital.display)}
                            <span className="truncate">{vital.display}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-white">{vital.value}</span>
                            <span className="text-xs text-slate-500">{vital.unit}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                            {new Date(vital.effectiveDateTime).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            {chartData.length > 1 && (
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis
                                dataKey="dateLabel"
                                stroke="#64748b"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                            />
                            <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            {chartData.some((d) => d.systolic) && (
                                <Line
                                    type="monotone"
                                    dataKey="systolic"
                                    name="Systolic"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ fill: '#ef4444', r: 3 }}
                                />
                            )}
                            {chartData.some((d) => d.diastolic) && (
                                <Line
                                    type="monotone"
                                    dataKey="diastolic"
                                    name="Diastolic"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    dot={{ fill: '#f97316', r: 3 }}
                                />
                            )}
                            {chartData.some((d) => d.heartRate) && (
                                <Line
                                    type="monotone"
                                    dataKey="heartRate"
                                    name="Heart Rate"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={{ fill: '#22c55e', r: 3 }}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Vitals Table */}
            <div className="overflow-x-auto max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-800">
                        <tr className="text-slate-400 text-left">
                            <th className="py-2 px-3 font-medium">Vital</th>
                            <th className="py-2 px-3 font-medium">Value</th>
                            <th className="py-2 px-3 font-medium">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {vitals.slice(0, 10).map((vital) => (
                            <tr key={vital.id} className="text-slate-300 hover:bg-slate-700/20">
                                <td className="py-2 px-3">{vital.display}</td>
                                <td className="py-2 px-3">
                                    <span className="font-medium text-white">{vital.value}</span>
                                    <span className="text-slate-500 ml-1">{vital.unit}</span>
                                </td>
                                <td className="py-2 px-3 text-slate-500">
                                    {new Date(vital.effectiveDateTime).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Activity, Clock } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface AgentChatProps {
    patientId: string;
    onAction?: () => void;
}

export default function AgentChat({ patientId, onAction }: AgentChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    patientId,
                }),
            });

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || data.error || 'Sorry, I encountered an error.',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // If there were actions performed, refresh the dashboard
            if (data.actions && data.actions.length > 0 && onAction) {
                onAction();
            }
        } catch {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const categories = [
        {
            title: 'Vital Observations',
            icon: Activity,
            actions: [
                { label: 'Add BP 120/80', prompt: 'Add blood pressure for this patient: 120/80 mmHg' },
                { label: 'Log Pulse 72', prompt: 'Record heart rate 72 bpm' },
                { label: 'Record Oxygen', prompt: 'Add oxygen saturation 98%' }
            ]
        },
        {
            title: 'Patient Insights',
            icon: Sparkles,
            actions: [
                { label: 'Summarize History', prompt: 'Can you give me a clinical summary of this patient?' },
                { label: 'Recent Events', prompt: 'What were the most recent interactions or results?' },
                { label: 'Current Conditions', prompt: 'List all active conditions for this patient.' }
            ]
        },
        {
            title: 'Assistant Help',
            icon: Bot,
            actions: [
                { label: 'What can you do?', prompt: 'How can you help me manage this patient?' },
                { label: 'Data Sources', prompt: 'Where are you getting this patient data from?' }
            ]
        }
    ];

    return (
        <div className="h-full flex flex-col bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold tracking-tight">Clinical Intelligence</h3>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                                    Agentic Assistant
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="max-w-2xl mx-auto py-8">
                        <div className="text-center mb-10">
                            <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 mb-4">
                                <Bot className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">How can I assist you today?</h4>
                            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                                I am an intelligent clinical agent. I am currently focused on <span className="text-indigo-400 font-bold">this patient record</span>.
                                You can perform CRUD actions using natural language like "Add BPM 80" or "Summarize history".
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {categories.map((cat, i) => (
                                <div key={i} className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <cat.icon className="w-3.5 h-3.5 text-indigo-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{cat.title}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {cat.actions.map((action, j) => (
                                            <button
                                                key={j}
                                                onClick={() => setInput(action.prompt)}
                                                className="text-left p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/50 hover:border-indigo-500/50 transition-all text-xs text-slate-300 hover:text-white group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span>{action.label}</span>
                                                    <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                            <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 px-1">System Capabilities</h5>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] text-slate-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                                    FHIR Resource Extraction
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                                    Observation Write-back
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                                    Temporal Care Gap Analysis
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                                    Automated Clinical Summaries
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                    >
                        {message.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] p-3 rounded-2xl ${message.role === 'user'
                                ? 'bg-blue-500 text-white rounded-br-md'
                                : 'bg-slate-700/50 text-slate-200 rounded-bl-md'
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                                }`}>
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        {message.role === 'user' && (
                            <div className="w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-slate-700/50 p-3 rounded-2xl rounded-bl-md">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                <span className="text-sm text-slate-400">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700/50">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/25"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}

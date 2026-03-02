'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Server, Key, User, Lock, Loader2, CheckCircle2 } from 'lucide-react';

type AuthType = 'none' | 'bearer' | 'basic';

export default function ConnectionForm() {
    const router = useRouter();
    const [baseUrl, setBaseUrl] = useState('');
    const [authType, setAuthType] = useState<AuthType>('none');
    const [token, setToken] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/connect-fhir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseUrl,
                    authType,
                    token: authType === 'bearer' ? token : undefined,
                    username: authType === 'basic' ? username : undefined,
                    password: authType === 'basic' ? password : undefined,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(`Connected to ${data.serverName || 'FHIR Server'} (FHIR ${data.fhirVersion || 'R4'})`);
                setTimeout(() => router.push('/viewer'), 1500);
            } else {
                setError(data.error || 'Connection failed');
            }
        } catch {
            setError('Failed to connect. Please check your network connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 shadow-lg shadow-blue-500/25">
                        <Server className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">FHIR AI Agent</h1>
                    <p className="text-slate-400">Connect to your FHIR server to get started</p>
                </div>

                {/* Form Card */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl"
                >
                    {/* FHIR URL */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            FHIR Server URL
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                <Server className="w-5 h-5" />
                            </span>
                            <input
                                type="url"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                placeholder="https://hapi.fhir.org/baseR4"
                                className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>
                    </div>

                    {/* Auth Type */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Authentication
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['none', 'bearer', 'basic'] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setAuthType(type)}
                                    className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${authType === type
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                >
                                    {type === 'none' ? 'None' : type === 'bearer' ? 'Bearer Token' : 'Basic Auth'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bearer Token */}
                    {authType === 'bearer' && (
                        <div className="mb-5 animate-fadeIn">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Access Token
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-500">
                                    <Key className="w-5 h-5" />
                                </span>
                                <textarea
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="Paste your access token here..."
                                    rows={3}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none font-mono text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Basic Auth */}
                    {authType === 'basic' && (
                        <div className="space-y-4 mb-5 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Username
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        <User className="w-5 h-5" />
                                    </span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter username"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        <Lock className="w-5 h-5" />
                                    </span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="mb-5 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            {success}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !baseUrl}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            'Connect'
                        )}
                    </button>

                    {/* Quick Connect */}
                    <div className="mt-6 pt-6 border-t border-slate-700/50">
                        <p className="text-sm text-slate-500 mb-3 text-center">Quick connect to test servers:</p>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                type="button"
                                onClick={() => setBaseUrl('https://hapi.fhir.org/baseR4')}
                                className="text-sm text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-700/50 transition-all text-left"
                            >
                                🔹 HAPI FHIR (Public Test Server)
                            </button>
                            <button
                                type="button"
                                onClick={() => setBaseUrl('https://server.fire.ly/r4')}
                                className="text-sm text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-700/50 transition-all text-left"
                            >
                                🔹 Firely Server (Public Test Server)
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

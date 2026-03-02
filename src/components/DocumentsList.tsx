'use client';

import { FileText, Download, ExternalLink, Calendar, File, Shield } from 'lucide-react';
import { SimpleDocument } from '@/types/fhir';
import { VList } from 'virtua';
import { memo } from 'react';

interface DocumentsListProps {
    documents: SimpleDocument[];
}

const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (contentType: string) => {
    if (contentType.includes('pdf')) return <Shield className="w-5 h-5 text-red-400" />;
    if (contentType.includes('image')) return <FileText className="w-5 h-5 text-emerald-400" />;
    return <File className="w-5 h-5 text-indigo-400" />;
};

const DocumentItem = memo(({ doc, onDownload }: { doc: SimpleDocument; onDownload: (doc: SimpleDocument) => void }) => (
    <div
        className="group bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/50 transition-all duration-300 shadow-sm mb-3"
    >
        <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform shrink-0">
                {getFileIcon(doc.contentType)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {doc.title}
                    </h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${doc.category === 'report'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}>
                        {doc.category}
                    </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-3 truncate">
                        {doc.type}
                    </span>
                    <span className="border-l border-slate-200 dark:border-slate-700 pl-3 shrink-0">
                        {formatSize(doc.size)}
                    </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                    {(doc.data || doc.url) && (
                        <button
                            onClick={() => onDownload(doc)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            <Download className="w-3 h-3" />
                            {doc.data ? 'Download' : 'View External'}
                        </button>
                    )}
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors">
                        <ExternalLink className="w-3 h-3" />
                        Details
                    </button>
                </div>
            </div>
        </div>
    </div>
));

DocumentItem.displayName = 'DocumentItem';

export default function DocumentsList({ documents }: DocumentsListProps) {
    if (documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">No clinical documents found</p>
            </div>
        );
    }

    const handleDownload = (doc: SimpleDocument) => {
        if (doc.data) {
            const link = document.createElement('a');
            link.href = `data:${doc.contentType};base64,${doc.data}`;
            link.download = doc.title;
            link.click();
        } else if (doc.url) {
            window.open(doc.url, '_blank');
        }
    };

    return (
        <div className="max-h-[500px] overflow-hidden pr-2 custom-scrollbar">
            <VList style={{ height: '500px' }}>
                {documents.map((doc) => (
                    <DocumentItem key={doc.id} doc={doc} onDownload={handleDownload} />
                ))}
            </VList>
        </div>
    );
}

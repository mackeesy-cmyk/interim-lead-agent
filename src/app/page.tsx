import { getCaseFiles, CaseFile } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

export default async function Home() {
    const leads = await getCaseFiles();
    const qualifiedLeads = leads
        .filter(l => l.status === 'qualified')
        .sort((a, b) => (b.stars || 0) - (a.stars || 0));

    return (
        <div className="min-h-screen pb-20 px-4 md:px-8 pt-12">
            <div className="max-w-7xl mx-auto">
                {/* Premium Header */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider border border-blue-100 mb-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Live Overvåking
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                            Markeds<span className="text-blue-600">innsikt</span>
                        </h1>
                        <p className="text-slate-500 text-lg max-w-2xl font-medium">
                            Kvalifiserte markedssignaler og interim-muligheter identifisert av AI.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/50 backdrop-blur p-2 rounded-2xl border border-slate-200/60 shadow-sm">
                        <div className="px-4 py-2 text-center">
                            <div className="text-2xl font-black text-slate-900 leading-none">{qualifiedLeads.length}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Salgssignaler</div>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div className="px-4 py-2 text-center">
                            <div className="text-2xl font-black text-emerald-600 leading-none">
                                {qualifiedLeads.filter(l => (l.stars || 0) >= 4).length}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Høy Prioritet</div>
                        </div>
                    </div>
                </header>

                {/* Leads Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {qualifiedLeads.map((lead, index) => (
                        <LeadCard key={lead.id} lead={lead} index={index} />
                    ))}
                </div>

                {/* Empty State */}
                {qualifiedLeads.length === 0 && (
                    <div className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-100 mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Skanner markedet...</h3>
                        <p className="text-slate-500 mt-2 max-w-xs mx-auto font-medium leading-relaxed">
                            Ingen kvalifiserte leads akkurat nå. Systemet jobber i bakgrunnen med de nyeste kildene.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function SourceBadge({ type }: { type: string }) {
    const config: Record<string, { icon: string; color: string }> = {
        newsweb: { icon: '📰', color: 'bg-blue-500' },
        brreg_status_update: { icon: '📋', color: 'bg-emerald-500' },
        brreg_role_change: { icon: '👤', color: 'bg-teal-500' },
        bronnysund: { icon: '⚖️', color: 'bg-red-500' },
        brreg_kunngjoringer: { icon: '📄', color: 'bg-emerald-600' },
        finn: { icon: '💼', color: 'bg-purple-500' },
        dn_rss: { icon: '📡', color: 'bg-amber-500' },
        e24_rss: { icon: '📡', color: 'bg-orange-500' },
        finansavisen_rss: { icon: '📡', color: 'bg-yellow-500' },
        linkedin_exec: { icon: '🔗', color: 'bg-blue-600' },
        linkedin_signal: { icon: '🔗', color: 'bg-blue-400' },
    };

    const { icon, color } = config[type] || { icon: '📌', color: 'bg-slate-500' };

    return (
        <span className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center text-sm shadow-sm`}>
            {icon}
        </span>
    );
}

function BrregEnrichmentDisplay({ lead }: { lead: CaseFile }) {
    const eventType = lead.source_type === 'brreg_status_update' ? 'Statusendring' : 'Rolleendring';
    const eventDate = lead.created_at
        ? new Date(lead.created_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Nylig';

    return (
        <div className="flex items-center gap-2 p-2 bg-blue-50/30 rounded-lg border border-blue-100/50 mb-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-md">
                <span className="text-lg">📋</span>
                <span className="text-xs font-bold uppercase tracking-wide">{eventType}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Registrert</span>
                <span className="text-xs font-bold text-slate-700">{eventDate}</span>
            </div>
            <div className="ml-auto px-3 py-1 bg-emerald-50 text-emerald-700 rounded-md">
                <span className="text-[10px] font-black uppercase tracking-wide">Offentlig register</span>
            </div>
        </div>
    );
}

function LeadCard({ lead, index }: { lead: CaseFile; index: number }) {
    return (
        <div
            className="enterprise-card group rounded-3xl p-8 flex flex-col h-full animate-enter"
            style={{ animationDelay: `${index * 120}ms` }}
        >
            {/* Header: Identity & Rating */}
            <div className="flex justify-between items-start mb-6 gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                            {lead.company_name}
                        </h2>
                        {lead.is_ostlandet && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                Østlandet
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wide">
                            {lead.suggested_role || 'Interim Leder'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <svg
                                key={i}
                                className={`w-5 h-5 transition-transform group-hover:scale-110 ${i < (lead.stars || 0) ? 'text-amber-400 fill-current shadow-amber-200' : 'text-slate-200 fill-current'}`}
                                viewBox="0 0 20 20"
                                style={{ transitionDelay: `${i * 50}ms` }}
                            >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        ))}
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">AI-tillit</span>
                </div>
            </div>

            {/* Score Grid: E, W, V, R */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <ScoreMini label="Bevis" value={lead.E} color="blue" />
                <ScoreMini label="Behov" value={lead.W} color="emerald" />
                <ScoreMini label="Verifisert" value={lead.V === 1 ? 1 : 0} color="amber" />
                <ScoreMini label="Risk" value={1 - (lead.R || 0)} color="rose" labelAlt="Trygghet" />
            </div>

            {/* AI Analysis Section */}
            <div className="flex-grow flex flex-col mb-8">
                <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 group-hover:bg-white transition-colors duration-500 h-full relative">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1 px-2 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">AI Innsikt</div>
                        <div className="h-px flex-grow bg-slate-200/60"></div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kasus</span>
                            <div className="space-y-1">
                                <p className="text-slate-900 font-bold leading-tight">
                                    {translateTrigger(lead.trigger_hypothesis || 'LeadershipChange')}
                                </p>
                                {lead.case_summary && (
                                    <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-3">
                                        {lead.case_summary}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kilde</span>
                            <div className="flex items-center gap-2">
                                <SourceBadge type={lead.source_type || ''} />
                                <span className="text-slate-600 font-medium text-sm">
                                    {formatSourceType(lead.source_type)}
                                </span>
                                {lead.source_url && (
                                    <a
                                        href={lead.source_url}
                                        target="_blank"
                                        className="text-blue-600 hover:text-blue-800 text-[10px] font-bold flex items-center gap-0.5 group/link"
                                    >
                                        Les original
                                        <svg className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>

                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Hvorfor nå?</span>

                            {/* Show structured data for Brreg sources */}
                            {(lead.source_type === 'brreg_status_update' || lead.source_type === 'brreg_role_change') && (
                                <BrregEnrichmentDisplay lead={lead} />
                            )}

                            <p className="text-slate-800 text-base leading-relaxed font-semibold italic">
                                "{lead.why_now_text || 'Analyse under utførelse. Systemet venter på mer kontekst.'}"
                            </p>
                        </div>
                    </div>

                    <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L14.017 3C14.017 1.89543 14.9124 1 16.017 1H19.017C21.2261 1 23.017 2.79086 23.017 5V15C23.017 18.3137 20.3307 21 17.017 21H14.017ZM1.017 21L1.017 18C1.017 16.8954 1.91243 16 3.017 16H6.017C6.56928 16 7.017 15.5523 7.017 15V9C7.017 8.44772 6.56928 8 6.017 8H3.017C1.91243 8 1.017 7.10457 1.017 6V3L1.017 3C1.017 1.89543 1.91243 1 3.017 1H6.017C8.22614 1 10.017 2.79086 10.017 5V15C10.017 18.3137 7.33072 21 4.017 21H1.017Z" /></svg>
                    </div>
                </div>
            </div>

            {/* Footer: Actions & Data Context */}
            <div className="flex flex-col gap-6 mt-auto">
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        <ActionButton icon="kilde" label="Les Kilde" href={lead.source_url} />
                        <ActionButton icon="proff" label="Proff.no" href={`https://www.proff.no/bransjesøk?q=${lead.org_number}`} />
                        <ActionButton icon="linkedin" label="Personer" href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(lead.company_name)}`} />
                    </div>

                    <div className="flex items-center gap-3 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-slate-200/50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Relevanse</span>
                        <div className="flex items-center gap-1">
                            <FeedbackBtn leadId={lead.id!} grade="Relevant" current={lead.feedback_grade} color="emerald" />
                            <FeedbackBtn leadId={lead.id!} grade="Delvis" current={lead.feedback_grade} color="amber" />
                            <FeedbackBtn leadId={lead.id!} grade="Ikke" current={lead.feedback_grade} color="rose" />
                        </div>
                    </div>
                </div>

                <div className="flex items-end justify-between pt-6 border-t border-slate-100">
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">
                        Ref: {lead.id?.slice(-8).toUpperCase()} • Identifisert {lead.created_at ? formatRelativeTime(lead.created_at) : 'nylig'}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ESL+ Motor Aktiv</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScoreMini({ label, value, color, labelAlt }: { label: string; value: number; color: string; labelAlt?: string }) {
    const pct = Math.round(value * 100);
    const colors: Record<string, string> = {
        blue: "bg-blue-600",
        emerald: "bg-emerald-600",
        amber: "bg-amber-500",
        rose: "bg-rose-500"
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{labelAlt || label}</span>
                <span className="text-[10px] font-black text-slate-900">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colors[color]} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${pct}%` }}
                ></div>
            </div>
        </div>
    );
}

function ActionButton({ icon, label, href }: { icon: string; label: string; href?: string }) {
    if (!href) return null;
    return (
        <a
            href={href}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900 shadow-sm"
        >
            <span className="text-sm opacity-70">
                {icon === 'kilde' && '📄'}
                {icon === 'proff' && '📊'}
                {icon === 'linkedin' && '👥'}
            </span>
            {label}
        </a>
    );
}

function FeedbackBtn({ leadId, grade, current, color }: { leadId: string; grade: 'Relevant' | 'Delvis' | 'Ikke'; current?: string; color: string }) {
    const active = current === grade;
    const colors: Record<string, string> = {
        emerald: active ? "bg-emerald-500 text-white" : "text-emerald-500 hover:bg-emerald-50",
        amber: active ? "bg-amber-500 text-white" : "text-amber-500 hover:bg-amber-50",
        rose: active ? "bg-rose-500 text-white" : "text-rose-500 hover:bg-rose-50",
    };

    return (
        <form action={`/api/feedback?id=${leadId}&grade=${grade}`} method="POST">
            <button
                className={`px-3 h-8 rounded-lg text-[10px] font-black transition-all ${colors[color]} ${active ? 'shadow-md scale-105' : 'scale-95 opacity-70'}`}
            >
                {grade.toUpperCase()}
            </button>
        </form>
    );
}

// Helpers
function formatRelativeTime(date: string): string {
    const now = new Date();
    const then = new Date(date);
    const hours = Math.floor((now.getTime() - then.getTime()) / 3600000);

    if (hours < 1) return 'for <1t siden';
    if (hours < 24) return `for ${hours}t siden`;
    if (hours < 48) return 'i går';
    return then.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

function translateTrigger(trigger: string): string {
    const mapping: Record<string, string> = {
        LeadershipChange: 'Lederskifte',
        Restructuring: 'Omstrukturering',
        MergersAcquisitions: 'Oppkjøp & Fusjoner',
        StrategicReview: 'Strategisk Gjennomgang',
        OperationalCrisis: 'Operasjonell Krise',
        RegulatoryLegal: 'Regulatoriske Endringer',
        CostProgram: 'Kostnadsprogram',
        HiringSignal: 'Rekrutteringssignal',
        OwnershipGovernance: 'Eierstyring',
        TransformationProgram: 'Transformasjon',
    };
    return mapping[trigger] || trigger;
}

function formatSourceType(source: string | undefined): string {
    if (!source) return 'Ukjent kilde';
    const mapping: Record<string, string> = {
        dn_rss: 'Dagens Næringsliv',
        e24_rss: 'E24',
        finansavisen_rss: 'Finansavisen',
        newsweb: 'NewsWeb (Oslo Børs)',
        brreg_update: 'Brønnøysundregistrene',
        brreg_status_update: 'Brønnøysund Statusoppdatering',
        finn: 'FINN.no',
        linkedin_exec: 'LinkedIn (Move)',
        linkedin_signal: 'LinkedIn (Signal)',
    };
    return mapping[source] || source;
}

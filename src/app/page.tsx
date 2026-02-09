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
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider border border-blue-100 mb-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Live Intelligence
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                            Intelligence <span className="text-blue-600">Dashboard</span>
                        </h1>
                        <p className="text-slate-500 text-lg max-w-2xl font-medium">
                            Kvalifiserte markedssignaler og interim-muligheter identifisert av AI.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/50 backdrop-blur p-2 rounded-2xl border border-slate-200/60 shadow-sm">
                        <div className="px-4 py-2 text-center">
                            <div className="text-2xl font-black text-slate-900 leading-none">{qualifiedLeads.length}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Leads</div>
                        </div>
                        <div className="w-px h-8 bg-slate-200"></div>
                        <div className="px-4 py-2 text-center">
                            <div className="text-2xl font-black text-emerald-600 leading-none">
                                {qualifiedLeads.filter(l => (l.stars || 0) >= 4).length}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">High Priority</div>
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
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">AI Confidence</span>
                </div>
            </div>

            {/* Score Grid: E, W, V, R */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <ScoreMini label="Evidence" value={lead.E} color="blue" />
                <ScoreMini label="Will/Need" value={lead.W} color="emerald" />
                <ScoreMini label="Validation" value={lead.V === 1 ? 1 : 0} color="amber" />
                <ScoreMini label="Risk" value={1 - (lead.R || 0)} color="rose" labelAlt="Safety" />
            </div>

            {/* AI Analysis Section */}
            <div className="flex-grow flex flex-col mb-8">
                <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 group-hover:bg-white transition-colors duration-500 h-full relative">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1 px-2 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">AI Insights</div>
                        <div className="h-px flex-grow bg-slate-200/60"></div>
                    </div>
                    <p className="text-slate-800 text-base md:text-lg leading-relaxed font-semibold italic">
                        "{lead.why_now_text || 'Analyse under utførelse. Systemet venter på mer kontekst.'}"
                    </p>
                    <div className="absolute right-4 bottom-4 opacity-5">
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
                        Ref: {lead.id?.slice(-8).toUpperCase()} • Identified {new Date(lead.created_at!).toLocaleDateString('nb-NO')}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ESL+ Engine Active</span>
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

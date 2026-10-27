import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Activity, Heart, Bot, AlertTriangle, PlusCircle, MessageCircle } from 'lucide-react';
import hologramFigure from '@/assets/hologram-figure.png';
import hologramPlatform from '@/assets/hologram-platform.jpg';
import {
  buildOrgans, healthScore, parseReadings, NEMO_PREFILL_KEY, READINGS_KEY,
  type HealthSnapshot, type OrganId, type OrganStatus, type OrganAction,
} from '@/lib/organ-insights';

export interface PatientMedicalProfileProps {
  vitalsContent?: React.ReactNode;
  recordsContent?: React.ReactNode;
  appointmentsContent?: React.ReactNode;
}

const STATUS_STYLE: Record<OrganStatus, { dot: string; ring: string; text: string; label: string }> = {
  normal: { dot: 'bg-emerald-400 shadow-[0_0_12px_#34d399]', ring: 'border-emerald-400', text: 'text-emerald-300', label: 'طبيعي' },
  watch: { dot: 'bg-amber-400 shadow-[0_0_12px_#f59e0b]', ring: 'border-amber-400', text: 'text-amber-300', label: 'يحتاج متابعة' },
  alert: { dot: 'bg-rose-500 shadow-[0_0_14px_#f43f5e]', ring: 'border-rose-500', text: 'text-rose-300', label: 'تنبيه' },
  unknown: { dot: 'bg-cyan-300 shadow-[0_0_12px_#00e5ff]', ring: 'border-cyan-300', text: 'text-cyan-200', label: 'لا توجد قراءة' },
};

export function PatientMedicalProfile({ vitalsContent, recordsContent, appointmentsContent }: PatientMedicalProfileProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'appointments' | 'nemo'>('overview');
  const [patientName, setPatientName] = useState<string>('');
  const [snap, setSnap] = useState<HealthSnapshot>({});
  const [selected, setSelected] = useState<OrganId>('heart');

  useEffect(() => {
    try {
      const session = localStorage.getItem('sanad_patient_session');
      if (session) setPatientName(JSON.parse(session)?.name ?? '');
    } catch { /* ignore */ }
    const load = () => setSnap(parseReadings(localStorage.getItem(READINGS_KEY)));
    load();
    // re-read when the calculators below save a new reading
    const t = window.setInterval(load, 2000);
    window.addEventListener('storage', load);
    return () => { window.clearInterval(t); window.removeEventListener('storage', load); };
  }, []);

  const organs = useMemo(() => buildOrgans(snap), [snap]);
  const organ = organs.find((o) => o.id === selected) ?? organs[0];
  const score = healthScore(snap);
  const alerts = organs.filter((o) => o.status === 'alert' || o.status === 'watch');
  const uniqueAlerts = alerts.filter((o, i) => alerts.findIndex((a) => a.reading === o.reading) === i);

  const runAction = (a: OrganAction) => {
    if (a.nemo) {
      try { sessionStorage.setItem(NEMO_PREFILL_KEY, a.nemo); } catch { /* ignore */ }
      navigate({ to: '/patient/assistant' });
    } else if (a.measure) {
      setActiveTab('overview');
      setTimeout(() => document.getElementById('sanad-vitals')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  const st = STATUS_STYLE[organ.status];

  return (
    <div className="bg-[#0b0f19] text-white min-h-screen p-4 md:p-6 font-sans relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00e5ff08_1px,transparent_1px),linear-gradient(to_bottom,#00e5ff08_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none"></div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-cyan-500/20 pb-4 gap-4 relative z-10">
        <div>
          <span className="text-cyan-400 text-xs font-mono tracking-widest uppercase">منصة سند الطبية • النظام الهولوجرامي الذكي</span>
          <h1 className="text-2xl font-bold mt-1 tracking-wide flex items-center gap-2">
            ملفك الطبي {patientName && <span className="text-xs font-normal text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">{patientName}</span>}
          </h1>
        </div>
        <div className="flex flex-wrap bg-slate-900/90 border border-cyan-500/30 rounded-xl p-1 gap-1">
          {([['overview', 'المؤشرات'], ['records', 'السجلات'], ['appointments', 'المواعيد'], ['nemo', 'نيمو']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === k ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        <div className="space-y-4 order-2 lg:order-1">
          {activeTab === 'overview' ? (
            <>
              <div className="bg-slate-900/80 border border-cyan-500/30 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-cyan-400"></div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-400 text-sm">مؤشر صحتك من قياساتك</span>
                  <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
                <div className="text-3xl font-extrabold text-cyan-300 font-mono">{score ?? '—'}{score !== null && <span className="text-sm">/100</span>}</div>
                <div className="text-xs text-slate-400 mt-1">{score === null ? 'سجّل ضغطك أو سكرك ليتكيّف ملفك معك' : 'يتحدّث تلقائياً مع كل قياس جديد'}</div>
              </div>
              {uniqueAlerts.length > 0 ? uniqueAlerts.map((o) => (
                <button key={o.id} onClick={() => setSelected(o.id)} className={`w-full text-right p-4 rounded-xl border ${STATUS_STYLE[o.status].ring}/50 bg-slate-900/70`}>
                  <div className={`flex items-center gap-2 font-semibold mb-1 text-sm ${STATUS_STYLE[o.status].text}`}>
                    <AlertTriangle className="w-4 h-4" /> {o.name}: {STATUS_STYLE[o.status].label}
                  </div>
                  <p className="text-xs text-slate-300">{o.reading} — اضغط لعرض اقتراحات نيمو.</p>
                </button>
              )) : (
                <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-200">لا توجد تنبيهات من قياساتك المسجلة.</div>
              )}
            </>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl text-sm text-slate-300">
              {activeTab === 'records' && (recordsContent || 'جميع السجلات والفحوصات مؤرشفة بدقة.')}
              {activeTab === 'appointments' && (appointmentsContent || 'لا توجد مواعيد قادمة.')}
              {activeTab === 'nemo' && (
                <div className="space-y-3">
                  <p>اضغط على أي عضو في المجسم، وهختار لك الأسئلة المناسبة عشان تكلم نيمو عنها.</p>
                  <button onClick={() => runAction({ label: '', nemo: 'أهلاً يا نيمو، عايز أطمن على صحتي' })} className="w-full rounded-xl bg-cyan-500 text-slate-950 font-bold py-2.5 flex items-center justify-center gap-2"><Bot className="w-4 h-4" /> كلم نيمو</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="order-1 lg:order-2 bg-slate-900/40 border border-cyan-500/40 rounded-2xl p-4 flex flex-col items-center relative overflow-hidden backdrop-blur-md">
          <div className="w-full flex justify-between items-center z-10 text-xs font-mono text-cyan-400 border-b border-cyan-500/20 pb-2">
            <span>اضغط على أي عضو</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> هولوجرام 3D</span>
          </div>

          <div className="relative w-full z-10 h-[420px] rounded-xl overflow-hidden mt-2">
            <img src={hologramPlatform} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-bottom" />
            <div className="hologram-scan absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-cyan-300/20 to-transparent pointer-events-none z-20" />
            <div className="absolute inset-x-0 mx-auto bottom-[9%] h-[86%] aspect-[318/667] hologram-float z-10">
              <img src={hologramFigure} alt="مجسم هولوجرامي لجسم المريض" className="w-full h-full object-contain opacity-90 drop-shadow-[0_0_18px_rgba(0,229,255,0.55)]" />
              {organs.map((o) => {
                const s = STATUS_STYLE[o.status];
                const active = o.id === selected;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelected(o.id)}
                    aria-label={o.name}
                    aria-pressed={active}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full z-30"
                    style={{ left: `${o.x}%`, top: `${o.y}%` }}
                  >
                    {active && <span className={`absolute inset-0 rounded-full border-2 animate-ping ${s.ring}`} />}
                    <span className={`rounded-full ${s.dot} ${active ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5 opacity-80'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full mt-3 rounded-xl border border-cyan-500/30 bg-slate-950/80 p-3 z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold text-cyan-200">{organ.name}</div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${st.ring} ${st.text}`}>{st.label}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{organ.reading}</div>
            <div className="mt-3 grid gap-2">
              {organ.actions.map((a) => (
                <button key={a.label} onClick={() => runAction(a)} className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 text-right active:scale-[0.98] transition">
                  {a.measure ? <PlusCircle className="w-4 h-4 shrink-0" /> : <MessageCircle className="w-4 h-4 shrink-0" />}
                  <span className="flex-1">{a.label}</span>
                  {a.nemo && <span className="text-[10px] text-cyan-400">نيمو ←</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 order-3">
          <div className="bg-slate-900/80 border border-cyan-500/30 p-5 rounded-2xl space-y-3">
            <div className="text-sm font-bold text-cyan-400 border-b border-cyan-500/20 pb-2">آخر قياساتك</div>
            {[
              { id: 'heart' as const, t: 'ضغط الدم', v: snap.bp ? `${snap.bp.sys}/${snap.bp.dia}` : '—' },
              { id: 'pancreas' as const, t: 'السكر', v: snap.sugar ? `${snap.sugar.value} mg/dL` : '—' },
            ].map((r) => {
              const o = organs.find((x) => x.id === r.id)!;
              return (
                <button key={r.id} onClick={() => setSelected(r.id)} className="w-full bg-slate-950/80 p-3 rounded-xl border border-cyan-500/20 flex items-center justify-between">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{r.t}</div>
                    <div className="text-sm font-bold text-cyan-300 font-mono">{r.v}</div>
                  </div>
                  <span className={`text-[10px] ${STATUS_STYLE[o.status].text}`}>{STATUS_STYLE[o.status].label}</span>
                </button>
              );
            })}
            <Heart className="hidden" />
          </div>
        </div>
      </div>

      {activeTab === 'overview' && vitalsContent && (
        <div id="sanad-vitals" className="relative z-10 mt-6 scroll-mt-4">{vitalsContent}</div>
      )}
    </div>
  );
}

export default PatientMedicalProfile;

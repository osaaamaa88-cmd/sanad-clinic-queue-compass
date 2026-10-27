import React, { useState, useEffect } from 'react';
import { Activity, Heart, Shield, FileText, Bot, AlertTriangle } from 'lucide-react';
import hologramFigure from '@/assets/hologram-figure.png';
import hologramPlatform from '@/assets/hologram-platform.jpg';

export interface PatientMedicalProfileProps {
  vitalsContent?: React.ReactNode;
  recordsContent?: React.ReactNode;
  appointmentsContent?: React.ReactNode;
}

interface SanadReading {
  BP?: string;
  sugar?: string | number;
  heartRate?: number;
}

export function PatientMedicalProfile({ vitalsContent, recordsContent }: PatientMedicalProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'appointments' | 'nemo'>('overview');
  const [patientSession, setPatientSession] = useState<{ name?: string; id?: string }>({});
  const [latestReading, setLatestReading] = useState<SanadReading>({ BP: '120/80', sugar: '98', heartRate: 75 });
  const [selectedArea, setSelectedArea] = useState<'heart' | 'throat' | 'head' | null>('throat');

  useEffect(() => {
    try {
      const session = localStorage.getItem('sanad_patient_session');
      if (session) setPatientSession(JSON.parse(session));
      else setPatientSession({ name: 'أسامة محمد', id: 'SANAD-96573' });
    } catch {
      setPatientSession({ name: 'أسامة محمد', id: 'SANAD-96573' });
    }

    try {
      const saved = localStorage.getItem('sanad_health_readings_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLatestReading(parsed[parsed.length - 1]);
        }
      }
    } catch {
      // افتراضي
    }
  }, []);

  return (
    <div className="bg-[#0b0f19] text-white min-h-screen p-4 md:p-6 font-sans relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00e5ff08_1px,transparent_1px),linear-gradient(to_bottom,#00e5ff08_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none"></div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-cyan-500/20 pb-4 gap-4 relative z-10">
        <div>
          <span className="text-cyan-400 text-xs font-mono tracking-widest uppercase">منصة سند الطبية • النظام الهولوجرامي الذكي</span>
          <h1 className="text-2xl font-bold mt-1 tracking-wide flex items-center gap-2">
            الملف الطبي الشامل <span className="text-xs font-normal text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">{patientSession.name}</span>
          </h1>
        </div>
        
        <div className="flex flex-wrap bg-slate-900/90 border border-cyan-500/30 rounded-xl p-1 gap-1 shadow-[0_0_20px_rgba(0,229,255,0.15)]">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'overview' ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,229,255,0.5)]' : 'text-slate-300 hover:text-white'}`}>المؤشرات</button>
          <button onClick={() => setActiveTab('records')} className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'records' ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,229,255,0.5)]' : 'text-slate-300 hover:text-white'}`}>السجلات</button>
          <button onClick={() => setActiveTab('appointments')} className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'appointments' ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,229,255,0.5)]' : 'text-slate-300 hover:text-white'}`}>المواعيد</button>
          <button onClick={() => setActiveTab('nemo')} className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-1 ${activeTab === 'nemo' ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,229,255,0.5)]' : 'text-cyan-400 hover:text-white'}`}><Bot className="w-4 h-4" /> نيمو</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        <div className="space-y-4">
          {activeTab === 'overview' ? (
            <>
              <div className="bg-slate-900/80 border border-cyan-500/30 p-5 rounded-2xl relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-2 h-full bg-cyan-400"></div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-400 text-sm">معدل الصحة العامة الإجمالي</span>
                  <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
                <div className="text-3xl font-extrabold text-cyan-300 font-mono">102.67</div>
                <div className="text-xs text-slate-400 mt-1">الضغط: {latestReading.BP}</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-400 text-sm">مستوى السكر بالدم</span>
                  <Heart className="w-5 h-5 text-rose-500 animate-ping" />
                </div>
                <div className="text-2xl font-bold text-rose-400 font-mono">{latestReading.sugar} <span className="text-xs text-slate-400">mg/dL</span></div>
              </div>

              <div onClick={() => setSelectedArea('throat')} className="p-4 rounded-xl border border-amber-500/50 bg-amber-500/10 cursor-pointer shadow-lg">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1 text-sm">
                  <AlertTriangle className="w-4 h-4 animate-bounce" /> تنبيه تشخيصي: الحنجرة
                </div>
                <p className="text-xs text-slate-300">تم رصد توهج بؤري في الحنجرة. انقر للتشخيص الفوري مع نيمو.</p>
              </div>
            </>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl text-sm text-slate-300 shadow-lg">
              {activeTab === 'records' && (recordsContent || 'جميع السجلات والفحوصات مؤرشفة بدقة.')}
              {activeTab === 'appointments' && 'موعدك القادم مع استشاري العيادة غداً الساعة 04:00 مساءً.'}
              {activeTab === 'nemo' && 'أهلاً بك يا أسامة! أنا نيمو، مؤشراتك مستقرة وجاهز تماماً لمساعدتك.'}
            </div>
          )}
        </div>

        <div className="bg-slate-900/40 border border-cyan-500/40 rounded-2xl p-6 flex flex-col items-center justify-between relative min-h-[550px] overflow-hidden backdrop-blur-md shadow-[0_0_30px_rgba(0,229,255,0.15)]">
          <div className="w-full flex justify-between items-center z-10 text-xs font-mono text-cyan-400 border-b border-cyan-500/20 pb-2">
            <span>ID: {patientSession.id}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> هولوجرام نشط 3D</span>
          </div>

          <div className="relative w-full my-auto z-10 h-[440px] rounded-xl overflow-hidden">
            <img src={hologramPlatform} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-bottom" />
            <div className="hologram-scan absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-cyan-300/20 to-transparent pointer-events-none z-20" />
            <div className="absolute inset-x-0 mx-auto bottom-[9%] h-[86%] aspect-[318/667] hologram-float z-10">
              <img src={hologramFigure} alt="مجسم هولوجرامي لجسم المريض" className="w-full h-full object-contain opacity-90 drop-shadow-[0_0_18px_rgba(0,229,255,0.55)]" />
              <button type="button" onClick={() => setSelectedArea('head')} aria-label="الرأس" className="absolute top-[0%] left-[35%] w-[30%] h-[12%] rounded-full" />
              <button type="button" onClick={() => setSelectedArea('throat')} aria-label="الحنجرة" className="absolute top-[12%] left-[38%] w-[24%] h-[6%] rounded-full" />
              <button type="button" onClick={() => setSelectedArea('heart')} aria-label="القلب" className="absolute top-[19%] left-[40%] w-[25%] h-[12%] rounded-full" />
              {selectedArea && (
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ top: selectedArea === 'head' ? '7%' : selectedArea === 'throat' ? '15%' : '24%' }}>
                  <div className={`w-8 h-8 rounded-full border-2 animate-ping absolute -inset-2.5 ${selectedArea === 'throat' ? 'border-amber-400' : 'border-cyan-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${selectedArea === 'throat' ? 'bg-amber-400 shadow-[0_0_15px_#f59e0b]' : 'bg-cyan-300 shadow-[0_0_15px_#00e5ff]'}`}></div>
                  <div className={`absolute top-1 left-4 w-16 h-[1px] ${selectedArea === 'throat' ? 'bg-amber-400' : 'bg-cyan-300'}`}>
                    <div className={`absolute -top-3 left-16 bg-slate-900/90 border text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${selectedArea === 'throat' ? 'border-amber-500 text-amber-300' : 'border-cyan-400 text-cyan-200'}`}>
                      {selectedArea === 'throat' ? 'تنبيه: التهاب حنجري' : selectedArea === 'heart' ? `القلب • ${latestReading.heartRate ?? 75} BPM` : `الرأس • ضغط ${latestReading.BP ?? '120/80'}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-2 z-10 mt-4">
            <button onClick={() => setSelectedArea('throat')} className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 py-2 rounded-xl text-xs text-cyan-300 transition-all">فحص عضوي دقيق</button>
            <button onClick={() => setActiveTab('records')} className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 py-2 rounded-xl text-xs text-slate-200 transition-all">التقارير الشاملة</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-cyan-500/30 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="text-sm font-bold text-cyan-400 border-b border-cyan-500/20 pb-2 flex items-center justify-between">
              <span>لوحة القياسات الحيوية HUD</span>
              <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-cyan-500/20 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">ضغط الدم (BP)</div>
                <div className="text-sm font-bold text-cyan-300 font-mono">{latestReading.BP}</div>
              </div>
              <span className="text-[10px] text-green-400 bg-green-950/60 px-2 py-0.5 rounded border border-green-500/30">مثالي</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-sky-500/20 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">مستوى السكر (Sugar)</div>
                <div className="text-sm font-bold text-sky-300 font-mono">{latestReading.sugar} mg/dL</div>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">متوازن</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-teal-500/20 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">معدل نبض القلب</div>
                <div className="text-sm font-bold text-teal-300 font-mono">{latestReading.heartRate || 75} BPM</div>
              </div>
              <span className="text-[10px] text-teal-400 font-mono animate-pulse">∿∿∿📈</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientMedicalProfile;
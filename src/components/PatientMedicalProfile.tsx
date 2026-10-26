import React, { useState, useEffect } from 'react';
import { Activity, Heart, Shield, FileText, Calendar, User, Stethoscope, Bot, AlertTriangle } from 'lucide-react';

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

        <div className="bg-slate-900/40 border border-cyan-500/40 rounded-2xl p-6 flex flex-col items-center justify-between relative min-h-[500px] overflow-hidden backdrop-blur-md shadow-[0_0_30px_rgba(0,229,255,0.15)]">
          <div className="w-full flex justify-between items-center z-10 text-xs font-mono text-cyan-400 border-b border-cyan-500/20 pb-2">
            <span>ID: {patientSession.id}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> هولوجرام نشط 3D</span>
          </div>

          <div className="relative flex flex-col items-center justify-center my-auto z-10 py-4 w-full">
            {selectedArea === 'throat' && (
              <div className="absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <div className="w-8 h-8 rounded-full border-2 border-amber-400 animate-ping absolute -inset-2"></div>
                <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_15px_#f59e0b]"></div>
                <div className="absolute top-2 left-6 w-20 h-[1px] bg-amber-400">
                  <div className="absolute -top-3 left-20 bg-slate-900/90 border border-amber-500 text-amber-300 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap font-mono">
                    تنبيه: التهاب حنجري
                  </div>
                </div>
              </div>
            )}

            <svg className="w-64 h-80 drop-shadow-[0_0_20px_rgba(0,229,255,0.5)]" viewBox="0 0 160 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M80 5 C 55 5, 42 20, 42 45 C 42 65, 52 80, 58 105 C 48 125, 30 160, 35 190 C 37 198, 48 198, 54 198 C 60 198, 66 180, 72 135 C 76 125, 84 125, 88 135 C 94 180, 100 198, 106 198 C 112 198, 123 198, 125 190 C 130 160, 112 125, 102 105 C 108 80, 118 65, 118 45 C 118 20, 105 5, 80 5 Z" fill="rgba(0, 229, 255, 0.05)" stroke="rgba(0, 229, 255, 0.7)" strokeWidth="1"/>
              <ellipse cx="80" cy="25" rx="16" ry="18" stroke="#00e5ff" strokeWidth="1.2" fill="rgba(0,229,255,0.12)"/>
              <path d="M74 20 Q 80 15 86 20 Q 86 28 74 28 Z" fill="#38bdf8" opacity="0.85"/>
              <line x1="80" y1="43" x2="80" y2="125" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3"/>
              <path d="M60 55 Q 80 50 100 55 M57 65 Q 80 60 103 65 M55 75 Q 80 70 105 75 M57 85 Q 80 80 103 85" stroke="#00e5ff" strokeWidth="1.5" fill="none"/>
              <line x1="50" y1="50" x2="110" y2="50" stroke="#00e5ff" strokeWidth="2"/>
              <path d="M60 120 Q 80 115 100 120" stroke="#00e5ff" strokeWidth="1.8" fill="none"/>
              <path d="M60 120 L 45 165 L 40 195 M100 120 L 115 165 L 120 195" stroke="#00e5ff" strokeWidth="1.2" strokeDasharray="2 2"/>
            </svg>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 h-16 flex items-center justify-center pointer-events-none z-0">
            <div className="absolute w-64 h-12 rounded-[100%] border border-cyan-400/60 shadow-[0_0_25px_rgba(0,229,255,0.7)] animate-pulse"></div>
            <div className="absolute w-48 h-8 rounded-[100%] border border-sky-400/90 shadow-[0_0_15px_rgba(56,189,248,0.9)]"></div>
            <div className="absolute w-32 h-4 rounded-[100%] bg-cyan-400/20 blur-md"></div>
          </div>

          <div className="w-full grid grid-cols-2 gap-2 z-10 mt-4">
            <button onClick={() => setSelectedArea('heart')} className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 py-2 rounded-xl text-xs text-cyan-300 transition-all">فحص عضوي دقيق</button>
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
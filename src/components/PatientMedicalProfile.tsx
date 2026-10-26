import React, { useState } from 'react';
import { Activity, Heart, Shield, FileText, Calendar, User, Stethoscope, Bot } from 'lucide-react';

export function PatientMedicalProfile() {
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'appointments' | 'nemo'>('overview');

  return (
    <div className="bg-slate-950 text-white min-h-screen p-6 font-sans" dir="rtl">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-4 gap-4">
        <div>
          <span className="text-cyan-400 text-xs font-semibold tracking-wider">منصة سند الطبية</span>
          <h1 className="text-2xl font-bold mt-1">الملف الطبي الشامل للمريض</h1>
        </div>

        {/* Navigation Tabs linking all Sanad features including Nemo */}
        <div className="flex flex-wrap bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'overview' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
          >
            المؤشرات الحيوية
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'records' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
          >
            السجلات والتقارير
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'appointments' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
          >
            المواعيد والحجوزات
          </button>
          <button
            onClick={() => setActiveTab('nemo')}
            className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-1.5 ${activeTab === 'nemo' ? 'bg-cyan-500 text-white font-medium' : 'text-cyan-400 hover:text-white'}`}
          >
            <Bot className="w-4 h-4" /> مساعد نيمو الذكي
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Quick Stats & Vitals */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">معدل الصحة العامة</span>
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-extrabold text-green-400">98.5</div>
            <div className="text-xs text-slate-500 mt-1">ضغط الدم المثالي: 120 / 80 mmHg</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">نبضات القلب (Heart Rate)</span>
              <Heart className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-cyan-400">75 BPM</div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-cyan-400 h-full w-2/3"></div>
            </div>
          </div>
        </div>
        {/* Center: Anatomical Body Hologram & Core Profile */}
        <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-6 flex flex-col items-center justify-between relative shadow-2xl min-h-[350px]">
          <div className="absolute inset-0 bg-cyan-500/5 rounded-2xl"></div>

          <div className="w-full flex justify-between items-center z-10">
            <span className="text-xs text-cyan-400 font-mono">ID: SANAD-96573</span>
            <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs text-cyan-300">نشط ومستقر</span>
          </div>

          {/* Hologram Placeholder Visual */}
          <div className="flex flex-col items-center z-10 my-6">
            <div className="h-48 w-24 border-2 border-dashed border-cyan-500/40 rounded-full flex items-center justify-center relative shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <User className="w-16 h-16 text-cyan-400" />
            </div>
            <span className="text-xs text-slate-400 mt-3">المجسم التشريعي التفاعلي لحالة المريض</span>
          </div>

          <div className="w-full grid grid-cols-2 gap-2 z-10">
            <button className="bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 py-2 rounded-xl text-xs text-cyan-300 transition-all flex items-center justify-center gap-1">
              <Stethoscope className="w-3.5 h-3.5" /> فحص جديد
            </button>
            <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2 rounded-xl text-xs text-slate-300 transition-all flex items-center justify-center gap-1">
              <FileText className="w-3.5 h-3.5" /> التقرير الشامل
            </button>
          </div>
        </div>

        {/* Right Column: Integrated System Features (Appointments & Nemo Tab View) */}
        <div className="space-y-4">
          {activeTab === 'nemo' ? (
            <div className="bg-slate-900/90 border border-cyan-500/40 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-3">
                <Bot className="w-5 h-5" /> رؤى المساعد الذكي "نيمو"
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                أهلاً بك يا أسامة! بناءً على تحليل المؤشرات الحيوية الأخيرة، الحالة العامة ممتازة، ويُصحى بالمحافظة على شرب المياه بانتظام.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-cyan-300">
                💡 هل تريد بدء محادثة جديدة مع نيمو؟
              </div>
            </div>
          ) : (
            <>
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-3">
                  <Calendar className="w-5 h-5" /> الحجوزات والمواعيد القادمة
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">متابعة العيادة الدورية</div>
                      <div className="text-xs text-slate-500 mt-0.5">غداً، 04:30 مساءً</div>
                    </div>
                    <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">مؤكد</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
                  <Shield className="w-5 h-5" /> ملاحظات التوصيات الطبية
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  المؤشرات الحيوية تدل على استقرار الحالة. يوصى بالاستمرار على جدول المواعيد والمتابعة المنتظمة عبر النظام.
                </p>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default PatientMedicalProfile;


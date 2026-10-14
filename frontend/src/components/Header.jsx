import React from 'react';
import {
  Menu,
  Heart,
  Plus,
  Activity,
  User,
  BarChart3
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  patientRefId,
  hasResults,
  backendOnline,
  onOpenMetrics,
  colorblindMode,
  setMobileOpen
}) {
  const getTabInfo = (tab) => {
    switch (tab) {
      case 'overview':
        return {
          title: 'Dashboard',
          subtitle: ''
        };
      case 'assessment':
        return {
          title: 'Patient Clinical Assessment',
          subtitle: '54-parameter non-invasive clinical evaluation form'
        };
      case 'results':
        return {
          title: 'Assessment Results & Explainability',
          subtitle: 'CAD risk, multi-vessel stenosis probabilities, and SHAP attributions'
        };
      case 'visualization':
        return {
          title: '3D Coronary Circulation',
          subtitle: 'Interactive anatomical model with model-driven vessel risk coloring'
        };
      case 'performance':
        return {
          title: 'Model Performance & Audit',
          subtitle: 'Holdout test evaluation (N=61) and zero-leakage verification'
        };
      default:
        return {
          title: 'CardioVision',
          subtitle: 'Clinical Decision Support System'
        };
    }
  };

  const currentInfo = getTabInfo(activeTab);

  return (
    <header className="bg-white border-b border-[#E2E8F0] px-4 sm:px-6 py-3.5 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition md:hidden"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight">
                {currentInfo.title}
              </h1>
              {patientRefId && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-semibold bg-[#F0FDF8] text-[#0F766E] px-2.5 py-0.5 rounded-full border border-teal-200">
                  <User className="w-3 h-3 text-[#0F766E]" />
                  <span>{patientRefId}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748B] hidden sm:block mt-0.5">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Quick Contextual Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick Link to Model Evaluation if not on performance tab */}
          {activeTab !== 'performance' && (
            <button
              onClick={onOpenMetrics}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 hidden md:flex items-center gap-1.5 transition shadow-2xs"
              title="Open holdout model evaluation metrics"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Model Audit</span>
            </button>
          )}

          {/* Quick New Assessment Button (when not on assessment tab) */}
          {activeTab !== 'assessment' && (
            <button
              onClick={() => setActiveTab('assessment')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#0F766E] hover:bg-[#0D6D65] text-white flex items-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Assessment</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

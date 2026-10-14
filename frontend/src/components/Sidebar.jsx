import React from 'react';
import {
  LayoutDashboard,
  FileEdit,
  Activity,
  Heart,
  BarChart3,
  X
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  hasResults,
  backendOnline,
  colorblindMode,
  setColorblindMode,
  mobileOpen,
  setMobileOpen
}) {
  const navItems = [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: LayoutDashboard,
      desc: 'Platform overview & workflow'
    },
    {
      id: 'assessment',
      label: 'New Assessment',
      icon: FileEdit,
      desc: '54-parameter clinical form'
    },
    {
      id: 'results',
      label: 'Assessment Results',
      icon: Activity,
      desc: 'Stenosis predictions & SHAP',
      hasBadge: hasResults
    },
    {
      id: 'visualization',
      label: '3D Heart & Vessels',
      icon: Heart,
      desc: 'Interactive 3D coronary anatomy'
    },
    {
      id: 'performance',
      label: 'Model Performance',
      icon: BarChart3,
      desc: 'Validation metrics & audit'
    }
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-[#E2E8F0] z-50 flex flex-col justify-between
        transition-transform duration-200 ease-in-out shrink-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Top: Brand Header & Navigation */}
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-2xs">
                <Heart className="w-4.5 h-4.5 fill-white/20" />
              </div>
              <div>
                <span className="font-bold text-base text-[#1E293B] tracking-tight block">CardioVision</span>
                <span className="text-[11px] text-[#64748B] block font-medium">Clinical Decision Support</span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden transition"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left
                    ${isActive
                      ? 'bg-[#F0FDF8] text-[#0F766E] border border-teal-200/70 shadow-2xs'
                      : 'text-[#64748B] hover:text-[#1E293B] hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0F766E]' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.hasBadge && (
                    <span
                      className="w-2 h-2 rounded-full bg-teal-600 shadow-2xs shrink-0"
                      title="Assessment ready"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

import React from 'react';
import { X } from 'lucide-react';
import ModelPerformanceView from './ModelPerformanceView';

export default function ModelMetricsModal({ isOpen, onClose, metadata }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-4">
        {/* Modal Close Action */}
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Embedded ModelPerformanceView */}
        <ModelPerformanceView metadata={metadata} />
      </div>
    </div>
  );
}

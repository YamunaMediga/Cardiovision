import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import PatientAssessmentForm from './components/PatientAssessmentForm';
import PatientResultsPage from './components/PatientResultsPage';
import HeartViewer3D from './components/HeartViewer3D';
import VesselFallback2D from './components/VesselFallback2D';
import ModelPerformanceView from './components/ModelPerformanceView';
import ModelMetricsModal from './components/ModelMetricsModal';
import { Layers, Eye, Plus, Heart, Activity, BarChart3, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'assessment', 'results', 'visualization', 'performance'
  const [backendOnline, setBackendOnline] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [use3D, setUse3D] = useState(true);
  const [colorblindMode, setColorblindMode] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Patient & Clinical state
  const [patientRefId, setPatientRefId] = useState('');
  const [activePatientData, setActivePatientData] = useState(null);
  const [assessmentId, setAssessmentId] = useState('');
  const [selectedVessel, setSelectedVessel] = useState('LAD'); // 'CAD', 'LAD', 'LCX', 'RCA'
  const [thresholds, setThresholds] = useState({ low: 0.35, high: 0.65 });

  // Clean initial form state for direct manual patient data entry (all 54 features)
  const [formData, setFormData] = useState({
    Age: '', Sex: 'Male', Weight: '', Length: '', BMI: '',
    BP: '', PR: '', DM: 0, HTN: 0, 'Current Smoker': 0, 'EX-Smoker': 0,
    FH: 0, Obesity: 'N', CRF: 'N', CVA: 'N', 'Airway disease': 'N',
    'Thyroid Disease': 'N', CHF: 'N', DLP: 'N', Edema: 0,
    'Weak Peripheral Pulse': 'N', 'Lung rales': 'N', 'Systolic Murmur': 'N',
    'Diastolic Murmur': 'N', 'Typical Chest Pain': 0, Dyspnea: 'N',
    'Function Class': 0, Atypical: 'N', Nonanginal: 'N', 'LowTH Ang': 'N',
    'Q Wave': 0, 'St Elevation': 0, 'St Depression': 0, Tinversion: 0,
    LVH: 'N', 'Poor R Progression': 'N', BBB: 'N', FBS: '', CR: '',
    TG: '', LDL: '', HDL: '', BUN: '', ESR: '', HB: '', K: '',
    Na: '', WBC: '', Lymph: '', Neut: '', PLT: '', 'EF-TTE': '',
    'Region RWMA': 0, VHD: 'N'
  });

  const [predictions, setPredictions] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Initial backend ping and metadata fetch
  useEffect(() => {
    async function init() {
      try {
        const hRes = await fetch(`${API_BASE}/health`);
        if (hRes.ok) {
          setBackendOnline(true);
        }

        const mRes = await fetch(`${API_BASE}/metadata`);
        if (mRes.ok) {
          const mData = await mRes.json();
          setMetadata(mData);
        }
      } catch (err) {
        console.warn('Backend not responding yet on port 5000:', err);
        setBackendOnline(false);
      }
    }
    init();
  }, []);

  // 2. Run prediction & explanation
  const handleRunAssessment = async (submittedData, refId) => {
    setLoadingPrediction(true);
    setLoadingExplanation(true);
    setErrorMsg(null);
    
    // Create immutable snapshot of submitted patient data and unique assessment ID
    const currentAssId = refId || ('PAT-' + Date.now().toString().slice(-6));
    const immutableData = { ...submittedData };
    
    setPatientRefId(currentAssId);
    setAssessmentId(currentAssId);
    setActivePatientData(immutableData);

    try {
      // Predict 4 targets: Overall CAD (Cath), LAD, LCX, RCA
      const predRes = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: immutableData,
          thresholds,
          assessment_id: currentAssId
        })
      });

      if (!predRes.ok) {
        throw new Error(`Prediction API error: ${predRes.statusText}`);
      }
      const predData = await predRes.json();
      setPredictions(predData.predictions);

      // Explain active selected vessel via SHAP
      const expRes = await fetch(`${API_BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: immutableData,
          target: selectedVessel,
          n_top: 8,
          assessment_id: currentAssId
        })
      });

      if (!expRes.ok) {
        throw new Error(`Explain API error: ${expRes.statusText}`);
      }
      const expData = await expRes.json();
      setExplanation(expData.explanation);

      // Automatically transition to the results page
      setActiveTab('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error running inference:', err);
      setErrorMsg(`Inference request failed: ${err.message}. Please verify the ML backend service is running.`);
    } finally {
      setLoadingPrediction(false);
      setLoadingExplanation(false);
    }
  };

  // Re-fetch local explanation when selectedVessel changes (using immutable active patient data)
  useEffect(() => {
    if (!predictions || !activePatientData) return;

    async function fetchExplanation() {
      setLoadingExplanation(true);
      try {
        const expRes = await fetch(`${API_BASE}/explain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            features: activePatientData,
            target: selectedVessel,
            n_top: 8,
            assessment_id: assessmentId
          })
        });
        if (expRes.ok) {
          const expData = await expRes.json();
          setExplanation(expData.explanation);
        }
      } catch (err) {
        console.error('Error fetching SHAP for target:', err);
      } finally {
        setLoadingExplanation(false);
      }
    }
    fetchExplanation();
  }, [selectedVessel, activePatientData]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex font-sans selection:bg-teal-700 selection:text-white">
      {/* 1. Collapsible & Responsive Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasResults={!!predictions}
        backendOnline={backendOnline}
        colorblindMode={colorblindMode}
        setColorblindMode={setColorblindMode}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimal Application Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          patientRefId={patientRefId}
          hasResults={!!predictions}
          backendOnline={backendOnline}
          onOpenMetrics={() => setIsMetricsOpen(true)}
          colorblindMode={colorblindMode}
          setMobileOpen={setMobileOpen}
        />

        {/* Error notification banner if any */}
        {errorMsg && (
          <div className="max-w-7xl mx-auto w-full px-4 pt-4">
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs text-rose-900 flex items-center justify-between shadow-2xs">
              <span>Notice: {errorMsg}</span>
              <button 
                onClick={() => setErrorMsg(null)} 
                className="text-rose-700 underline font-semibold ml-2 hover:text-rose-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Tabbed Views */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
          {/* TAB 0: DASHBOARD OVERVIEW */}
          {activeTab === 'overview' && (
            <DashboardOverview
              metadata={metadata}
              predictions={predictions}
              thresholds={thresholds}
              patientRefId={patientRefId}
              selectedVessel={selectedVessel}
              setSelectedVessel={setSelectedVessel}
              colorblindMode={colorblindMode}
              onNavigate={setActiveTab}
            />
          )}

          {/* TAB 1: PATIENT ASSESSMENT FORM */}
          {activeTab === 'assessment' && (
            <PatientAssessmentForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleRunAssessment}
              loading={loadingPrediction}
              metadata={metadata}
            />
          )}

          {/* TAB 2: ASSESSMENT RESULTS & SHAP */}
          {activeTab === 'results' && (
            <PatientResultsPage
              patientRefId={patientRefId}
              patientData={activePatientData || formData}
              predictions={predictions}
              thresholds={thresholds}
              selectedVessel={selectedVessel}
              setSelectedVessel={setSelectedVessel}
              explanation={explanation}
              globalShap={metadata?.global_shap}
              loadingExplanation={loadingExplanation}
              colorblindMode={colorblindMode}
              onReturnToForm={() => setActiveTab('assessment')}
              onView3DHeart={() => setActiveTab('visualization')}
            />
          )}

          {/* TAB 3: 3D ANATOMICAL HEART & CORONARY VESSELS */}
          {activeTab === 'visualization' && (
            <div className="space-y-6">
              {/* Top Toolbar for 3D View */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
                    <h2 className="text-base font-bold text-[#1E293B]">
                      3D Interactive Heart & Coronary Circulation
                    </h2>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Anatomical myocardium, aorta, and selectable LAD, LCX, RCA vessels colored by actual backend model probabilities.
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-2.5">
                  {/* 2D Fallback Toggle */}
                  <button
                    onClick={() => setUse3D(!use3D)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition shadow-2xs ${
                      use3D
                        ? 'bg-[#F0FDF8] border-teal-200 text-[#0F766E]'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                    title={use3D ? 'Switch to 2D schematic fallback' : 'Switch to 3D WebGL viewer'}
                  >
                    {use3D ? <Layers className="w-3.5 h-3.5 text-[#0F766E]" /> : <Eye className="w-3.5 h-3.5 text-amber-600" />}
                    {use3D ? '3D WebGL Active' : '2D Fallback Active'}
                  </button>

                  {/* Return to Results / Form */}
                  {predictions && (
                    <button
                      onClick={() => setActiveTab('results')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 transition shadow-2xs"
                    >
                      View Results & SHAP
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('assessment')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0F766E] hover:bg-[#0D6D65] text-white transition shadow-2xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Assessment</span>
                  </button>
                </div>
              </div>

              {/* 3D Viewer or 2D Fallback */}
              <div>
                {use3D ? (
                  <HeartViewer3D
                    predictions={predictions}
                    thresholds={thresholds}
                    setThresholds={setThresholds}
                    selectedVessel={selectedVessel}
                    setSelectedVessel={setSelectedVessel}
                    colorblindMode={colorblindMode}
                  />
                ) : (
                  <VesselFallback2D
                    predictions={predictions}
                    thresholds={thresholds}
                    selectedVessel={selectedVessel}
                    setSelectedVessel={setSelectedVessel}
                    colorblindMode={colorblindMode}
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MODEL PERFORMANCE & AUDIT */}
          {activeTab === 'performance' && (
            <ModelPerformanceView metadata={metadata} />
          )}
        </main>

        {/* Model Performance & Leakage Audit Modal */}
        <ModelMetricsModal
          isOpen={isMetricsOpen}
          onClose={() => setIsMetricsOpen(false)}
          metadata={metadata}
        />
      </div>
    </div>
  );
}

<<<<<<< HEAD
# CardioVision: Track A — Cardiovascular Risk Visualization & Multi-Vessel Stenosis Prediction

[![Track A: MDT Challenge](https://img.shields.io/badge/Challenge-Track%20A%20Cardiovascular-blue.svg)](https://github.com)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://python.org)
[![React: 18.3](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev)
[![Three.js: 0.170](https://img.shields.io/badge/Three.js-WebGL-black.svg)](https://threejs.org)
[![Target Leakage: 0% Verified](https://img.shields.io/badge/Target%20Leakage-0%25%20Verified-success.svg)](#target-leakage-prevention)

CardioVision is an advanced clinical decision-support and educational prototype built for **Track A: Cardiovascular Risk Visualization & Prediction**. The system addresses all four official challenge priorities:
1. **Predictive Performance (30%):** Four independently evaluated machine learning models predicting Overall CAD, LAD Stenosis, LCX Stenosis, and RCA Stenosis without target leakage.
2. **3D Visualization (25%):** Realistic 3D WebGL anatomical heart and thoracic cage viewer with interactive coronary arteries (LAD, LCX, RCA), dynamic prediction-driven color maps, camera orbit targeting, and a 2D hardware-accelerated fallback.
3. **Clinical Interpretability (20%):** Comprehensive SHAP (TreeExplainer and KernelExplainer) physiological breakdowns mapped to validated clinical measurements and units.
4. **System Integration (15%) & Technical Implementation (10%):** Decoupled Python Flask ML microservice and high-performance React 18 frontend responsive on standard consumer laptops.

---

## 1. Quickstart Guide

### Prerequisites
- Python 3.10+ (Anaconda / Virtual Environment)
- Node.js 18+ & npm

### Step 1: Start Python Backend Microservice
```powershell
cd c:\Users\yamun\OneDrive\Desktop\cardiovascular

# Install required dependencies
pip install xgboost==2.1.4 shap flask flask-cors scikit-learn joblib pandas numpy openpyxl

# Start the Flask API server
python backend/app.py
# Server starts on http://localhost:5000
```

### Step 2: Start React Frontend Application
```powershell
cd c:\Users\yamun\OneDrive\Desktop\cardiovascular\frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
# Frontend interface live at http://localhost:3000
```

### Step 3: Run Automated Verification Suite
```powershell
cd c:\Users\yamun\OneDrive\Desktop\cardiovascular

# Verify target leakage prevention and independent test set metrics
python audit_models.py

# Verify end-to-end API endpoints and SHAP generation
python test_backend.py
```

---

## 2. Independent Model Performance & Evaluation

Evaluated on the independent holdout test partition ($N = 61$ patients, 20% test split) of the Z-Alizadeh Sani cohort ($N = 303$ total):

| Prediction Target | Optimal Algorithm | Accuracy | ROC-AUC | Sensitivity | Specificity | Precision | F1-Score | Brier Calibration Score |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Overall CAD** (`Cath`) | Balanced RBF Support Vector Machine | **68.85%** | **0.9005** | 60.47% | 88.89% | 92.86% | 0.7324 | 0.2557 |
| **LAD Stenosis** | Balanced Random Forest (300 trees) | **100.00%** | **1.0000** | 100.00% | 100.00% | 100.00% | 1.0000 | 0.0253 |
| **LCX Stenosis** | Tuned XGBoost (300 estimators) | **96.72%** | **1.0000** | 100.00% | 94.29% | 92.86% | 0.9630 | 0.0462 |
| **RCA Stenosis** | Balanced RBF Support Vector Machine | **80.33%** | **0.9744** | 90.00% | 75.61% | 64.29% | 0.7500 | 0.1035 |

---

## 3. Key Challenge Features & Requirements Addressed

### Strict Target Leakage Prevention
- All four target outcomes (`Cath`, `LAD`, `LCX`, `RCA`) are strictly removed from input features across all models.
- Features are strictly limited to 54 non-invasive clinical, ECG, echocardiographic, and laboratory parameters.

### Photorealistic 3D Anatomical Heart Visualization (Three.js WebGL)
- **High-Fidelity 3D Anatomical Organ Model:**
  - Myocardial organ model derived from the National Library of Medicine (NLM) Visible Human Project and the Human Reference Atlas (HRA CCF 3D Reference Library v1.2, NIH HubMAP Consortium). Creative Commons Attribution (CC-BY 4.0).
  - PBR standard materials with realistic muscle roughness, subtle subsurface-simulated specular response, and high-resolution normal surface texturing.
- **Accurately Mapped Coronary Arterial Trees:**
  - **LAD (Left Anterior Descending):** Emerges from the left coronary sinus, descends the anterior interventricular sulcus to the apex, featuring Diagonal branches (D1, D2) and septal perforators supplying the anterior LV wall and septum.
  - **LCX (Left Circumflex):** Emerges from the left main trunk, traverses the left atrioventricular groove, featuring Obtuse Marginal branches (OM1, OM2) supplying the lateral and posterior LV free wall.
  - **RCA (Right Coronary Artery):** Emerges from the right aortic sinus, traverses the right atrioventricular groove, featuring the Conus branch, Acute Marginal branch (AM), and Posterior Descending Artery (PDA) supplying the inferior wall, RV, and conduction nodes.
- **Interactive Features & Clinical Controls:**
  - **360° Free Orbit & Zoom:** OrbitControls with smooth inertia damping and constrained camera bounds.
  - **Camera View Presets:** One-click anatomical view presets:
    - *Front / Anterior (AP):* Focus on LAD, diagonals, aortic root, pulmonary trunk.
    - *Back / Posterior (Post):* Focus on PDA, crux cordis, coronary sinus.
    - *LAO (Left Lateral):* Focus on LCX and obtuse marginal branches.
    - *RAO (Right Lateral):* Focus on RCA and acute margin.
    - *Reset View:* Returns to 3/4 canonical anatomical perspective.
  - **Dynamic Prediction Color Mapping:**
    - Low Risk / Normal ($p < 0.35$): Medical Emerald Green (`#10B981`)
    - Borderline ($0.35 \le p \le 0.65$): Clinical Amber (`#F59E0B`)
    - Significant Stenosis Risk ($p > 0.65$): Clinical Crimson Red (`#EF4444`)
    - Accessible Colorblind Palette: Teal (`#0D9488`), Purple (`#7C3AED`), Gold (`#EAB308`).
  - **Selected Vessel Emissive Highlighting:** Subtle emissive illumination on the selected vessel with non-selected vessels and myocardium maintaining anatomical context.
  - **Myocardial Translucency (X-Ray Mode):** Allows clinicians to view vessels traveling along deeper grooves or the posterior wall through translucent tissue.
  - **Biphasic Physiological Heartbeat:** Contraction cycle simulating natural ~70 BPM cardiac dynamics.
  - **Interactive 3D Raycasting:** Hovering detects vessels and changes cursor; clicking selects the vessel across the entire dashboard and triggers camera repositioning.
  - **2D Hardware-Accelerated SVG Fallback:** For low-power or non-WebGL devices.

### Clinical Explainability (SHAP)
- Dedicated explainers: `TreeExplainer` for Random Forest (LAD) and XGBoost (LCX); `KernelExplainer` with $k$-means background compression for SVM (CAD, RCA).
- Local patient breakdown displaying positive risk drivers ($+$) and negative protective factors ($-$) with exact clinical measurements and standard physiological units (e.g., $\text{EF-TTE} = 20.0\%$, $\text{BP} = 160\text{ mmHg}$).
- Global mean absolute SHAP importance view across the holdout validation cohort.

---

## 4. Deliverables Index

- **Application Frontend:** `c:\Users\yamun\OneDrive\Desktop\cardiovascular\frontend`
- **Application Backend:** `c:\Users\yamun\OneDrive\Desktop\cardiovascular\backend\app.py`
- **Reproducible Models:** `c:\Users\yamun\OneDrive\Desktop\cardiovascular\models`
- **Technical Report (<= 6 Pages):** [CARDIOVISION_TECHNICAL_REPORT.md](reports/CARDIOVISION_TECHNICAL_REPORT.md)
- **Video Demonstration Script & Storyboard:** [DEMO_SCRIPT_AND_STORYBOARD.md](demo/DEMO_SCRIPT_AND_STORYBOARD.md)
- **Audit Verification Script:** [audit_models.py](audit_models.py)

---

## 5. Clinical Research Disclaimer

CardioVision is an experimental decision-support and educational prototype developed for challenge evaluation. It is **not** a certified medical diagnostic device, nor a substitute for invasive coronary angiography, formal diagnostic imaging, or professional clinical assessment. Model attributions reflect statistical feature importance within the trained classifier and must never be interpreted as clinical proof of causation or diagnostic finality.
=======
# Cardiovision
An explainable AI research prototype for coronary artery disease assessment with interactive 3D heart visualization.
>>>>>>> 27d0a1de4d1ccfb190a2fdc5bed6deb432ee9c46

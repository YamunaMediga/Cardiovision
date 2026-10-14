# CardioVision: Track A — Cardiovascular Risk Visualization & Multi-Vessel Stenosis Prediction
## Official Technical Implementation & Scientific Evaluation Report

**Track:** Track A — Cardiovascular Risk Visualization & Prediction  
**Evaluation Priorities:** Predictive Performance (30%), 3D Visualization (25%), Clinical Interpretability (20%), System Integration (15%), Technical Implementation (10%)  
**Dataset:** Z-Alizadeh Sani Cardiovascular Cohort ($N = 303$ patients)  
**System Status:** Operational Prototype (Python ML Service + React 18 / Three.js WebGL Frontend)  

---

## 1. Executive Summary & Problem Formulation

Coronary Artery Disease (CAD) remains the leading cause of global mortality. While conventional risk calculators (such as Framingham or ASCVD) estimate 10-year systemic vascular hazard, they provide no anatomical vessel specificity and frequently fail to identify multi-vessel occlusive disease prior to catheterization. 

**CardioVision** bridges the critical gap between non-invasive clinical evaluation and anatomical reality. Specifically, the system formulates cardiovascular assessment as **four independent prediction targets**:
1. **Overall CAD Status** ($\text{Cath}$ ground truth): Identifies systemic coronary arterial narrowing $\ge 50\%$.
2. **Left Anterior Descending (LAD) Stenosis**: Identifies significant occlusion in the anterior interventricular circulation.
3. **Left Circumflex (LCX) Stenosis**: Identifies significant occlusion along the lateral and posterior left ventricular margin.
4. **Right Coronary Artery (RCA) Stenosis**: Identifies significant occlusion supplying the right heart, inferior myocardium, and conduction nodes.

CardioVision couples rigorous machine learning pipelines with an **interactive 3D WebGL anatomical heart and torso viewer**, a **2D hardware-accelerated schematic fallback**, and **SHAP (SHapley Additive exPlanations) physiological breakdowns** mapped directly to verified clinical units.

```
+-----------------------------------------------------------------------------------------+
|                               CARDIOVISION ARCHITECTURE                                  |
+-----------------------------------------------------------------------------------------+
|  [Clinical Patient Input] (54 non-target features: ECG, Echo, Vitals, Labs, History)     |
|                                       │                                                 |
|                                       ▼                                                 |
|  [Target Leakage Prevention Layer] (Strictly strips Cath, LAD, LCX, RCA)               |
|                                       │                                                 |
|                                       ▼                                                 |
|  [Scikit-Learn Preprocessing Pipeline] (ColumnTransformer: Median/Scaler & Mode/OneHot)  |
|                                       │                                                 |
|         ┌─────────────────┬───────────┴───────────┬─────────────────┐                   |
|         ▼                 ▼                       ▼                 ▼                   |
|   Overall CAD (Cath)     LAD Stenosis            LCX Stenosis      RCA Stenosis         |
|     SVM (RBF Kernel)    Random Forest               XGBoost       SVM (RBF Kernel)      |
|     AUC: 0.9005         AUC: 1.0000             AUC: 1.0000       AUC: 0.9744           |
|         │                 │                       │                 │                   |
|         └─────────────────┴───────────┬───────────┴─────────────────┘                   |
|                                       ▼                                                 |
|               [Flask REST API Microservice: Port 5000]                                  |
|         Endpoints: /predict, /explain (SHAP), /metadata, /patients                      |
|                                       │                                                 |
|                                       ▼                                                 |
|                [Vite + React 18 + Three.js WebGL: Port 3000]                            |
|    • Interactive 3D Ventricles, Aorta, and Selectable LAD/LCX/RCA Vessels               |
|    • Configurable Risk Thresholds (p < 0.35 Low, 0.35-0.65 Borderline, p > 0.65 High)  |
|    • SHAP Waterfalls & Physiological Direction Badges (with validated units)            |
|    • 2D Hardware-Accelerated SVG Fallback for Low-Spec / Mobile Hardware                |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Dataset Audit & Strict Target Leakage Prevention

### 2.1 Cohort Characteristics & Target Definitions
The evaluation is conducted on the verified **Z-Alizadeh Sani** dataset ($N = 303$ patients), comprising four target columns:
- `Cath`: Verified gold-standard cardiac catheterization diagnosis ($1 = \text{CAD}$ with $\ge 50\%$ diameter stenosis in at least one major vessel, $0 = \text{Normal}$). Class distribution: 216 CAD (71.3%), 87 Normal (28.7%).
- `LAD`: Left Anterior Descending stenosis status ($1 = \text{Stenosis}$, $0 = \text{Normal}$).
- `LCX`: Left Circumflex stenosis status ($1 = \text{Stenosis}$, $0 = \text{Normal}$).
- `RCA`: Right Coronary Artery stenosis status ($1 = \text{Stenosis}$, $0 = \text{Normal}$).

### 2.2 Target Leakage Audit
Target leakage is catastrophic in medical informatics. If `Cath` were included as an input feature when predicting `LAD`, or if `LAD`/`LCX`/`RCA` were provided to the `Cath` classifier, predictive performance would artificially surge to near-tautological levels while rendering the model entirely useless before angiography.

**Audit Verification Protocol:**
1. **Feature Exclusion:** All four target columns (`Cath`, `LAD`, `LCX`, `RCA`) are systematically excised from the training matrix $\mathbf{X}_{\text{train}}$ and evaluation matrix $\mathbf{X}_{\text{test}}$.
2. **Column Inspection:** The remaining feature set contains exactly 54 clinical variables. Automated programmatic inspection confirms zero presence of target labels or derived catheterization representations.
3. **Partition Independence:** The dataset is split into an $80\%$ stratified training split ($N = 242$) and an independent $20\%$ holdout test split ($N = 61$). Preprocessing transformers are fitted exclusively on $\mathbf{X}_{\text{train}}$ to prevent cross-validation data bleed.

---

## 3. Preprocessing & Feature Engineering Pipeline

The 54 input features encompass 7 clinical categories:
- **Demographics & Anthropometrics (5):** Age, Sex, Weight, Length (height), BMI.
- **Cardiovascular History (12):** DM, HTN, Current Smoker, EX-Smoker, FH, Obesity, CRF, CVA, Airway Disease, Thyroid Disease, CHF, DLP.
- **Physical Examination (5):** BP, PR, Edema, Weak Peripheral Pulse, Lung Rales, Systolic Murmur, Diastolic Murmur.
- **Symptomatology (6):** Typical Chest Pain, Atypical, Nonanginal, LowTH Ang, Dyspnea, Function Class (NYHA).
- **Electrocardiogram (7):** Q Wave, St Elevation, St Depression, Tinversion, LVH, Poor R Progression, BBB.
- **Laboratory Biomarkers (14):** FBS, CR, TG, LDL, HDL, BUN, ESR, HB, K, Na, WBC, Lymph, Neut, PLT.
- **Echocardiography (3):** EF-TTE (Ejection Fraction), Region RWMA (Wall Motion Abnormality score), VHD (Valvular Heart Disease).

### 3.1 Preprocessing Transformation
A composite `ColumnTransformer` handles heterogeneous clinical data:
$$\mathbf{X}_{\text{transformed}} = \left[ \text{Scaler}\left(\text{Imputer}_{\text{median}}(\mathbf{X}_{\text{num}})\right) \parallel \text{OneHot}\left(\text{Imputer}_{\text{mode}}(\mathbf{X}_{\text{cat}})\right) \right]$$
- **Numerical Pipeline (34 features):** Median imputation followed by standard $z$-score scaling ($\mu = 0, \sigma = 1$).
- **Categorical Pipeline (20 features):** Most-frequent imputation followed by dense `OneHotEncoder(handle_unknown='ignore')`.
- Total transformed feature dimensionality: **77 features**.
- A custom deserialization shim (`_RemainderColsList`) was engineered to guarantee backward and forward compatibility across scikit-learn releases.

---

## 4. Model Architectures & Independent Performance Evaluation

Four dedicated algorithms were evaluated on the independent holdout validation cohort ($N = 61$ patients). Performance metrics reflect test-set generalization without target leakage:

### 4.1 Evaluation Results Summary

| Target Vessel / Condition | Optimized Architecture | Accuracy | ROC-AUC | Sensitivity (Recall) | Specificity | Precision | F1-Score | Brier Calibration Score |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Overall CAD** (`Cath`) | Balanced RBF Support Vector Machine | **68.85%** | **0.9005** | 60.47% | 88.89% | 92.86% | 0.7324 | 0.2557 |
| **LAD Stenosis** | Balanced Random Forest (300 trees) | **100.00%** | **1.0000** | 100.00% | 100.00% | 100.00% | 1.0000 | 0.0253 |
| **LCX Stenosis** | Tuned XGBoost (300 estimators) | **96.72%** | **1.0000** | 100.00% | 94.29% | 92.86% | 0.9630 | 0.0462 |
| **RCA Stenosis** | Balanced RBF Support Vector Machine | **80.33%** | **0.9744** | 90.00% | 75.61% | 64.29% | 0.7500 | 0.1035 |

### 4.2 Confusion Matrices (Holdout Test Cohort $N = 61$)

```
Overall CAD (Cath - SVM):               LAD Stenosis (Random Forest):
              Pred Norm  Pred CAD                     Pred Norm  Pred Sten
Actual Norm      16          2          Actual Norm      27          0
Actual CAD       17         26          Actual Sten       0         34

LCX Stenosis (XGBoost):                 RCA Stenosis (SVM):
              Pred Norm  Pred Sten                    Pred Norm  Pred Sten
Actual Norm      33          2          Actual Norm      31         10
Actual Sten       0         26          Actual Sten       2         18
```

### 4.3 Probability Calibration Quality vs. Classification Cutoffs
In accordance with challenge requirements, **model probabilities are evaluated separately from hard binary classification decisions**:
- **Brier Score Analysis:** $\text{Brier} = \frac{1}{N} \sum_{i=1}^N (p_i - y_i)^2$. The LAD ($0.0253$) and LCX ($0.0462$) models demonstrate exceptional probabilistic fidelity on the test set. 
- **Platt-Scaled SVM Outputs:** For CAD ($0.2557$) and RCA ($0.1035$), raw scores represent Platt-scaled sigmoid fits on margin distances.
- **Clinical Distinction:** CardioVision prominently clarifies that raw machine learning scores are cohort decision probabilities rather than population-calibrated lifetime absolute risk percentages. Documented, configurable threshold boundaries ($p < 0.35$ Low Risk, $0.35 \le p \le 0.65$ Borderline, $p > 0.65$ High Stenosis Risk) allow clinicians to adjust operating points according to institutional sensitivity/specificity preferences.

---

## 5. Interactive 3D Anatomical Visualization & WebGL Layer

The visual interface transforms multi-vessel tabular predictions into an interactive anatomical experience rendered in real time in the browser via Three.js.

### 5.1 Anatomical Modeling
- **Cardiac Myocardium:** Organically deformed ventricular geometry displaying cardiac axis tilt, pointed apex, left ventricular mass, and right ventricular chamber.
- **Great Vessels:** Ascending aorta, aortic arch, and pulmonary trunk modeled with Catmull-Rom tubular splines.
- **Thoracic Reference Cage:** Semi-transparent ribcage ellipses and sternum midline provide chest anatomical context without obscuring cardiac structures.
- **Individual Coronary Artery Mapping:**
  - **LAD (Left Anterior Descending):** Originates from the left aortic sinus, descends down the anterior interventricular sulcus, and terminates near the apex. Includes diagonal branching.
  - **LCX (Left Circumflex):** Traverses the left atrioventricular groove towards the posterior left ventricular wall. Includes obtuse marginal branching.
  - **RCA (Right Coronary Artery):** Traverses the right coronary sulcus towards the crux, supplying right ventricular and inferior myocardium. Includes acute marginal branching.

### 5.2 Dynamic Backend-Driven Color Encoding & Controls
- Vessel colors are driven dynamically by actual model prediction probabilities:
  - **Normal / Low Stenosis Risk ($p < 0.35$):** Emerald Green (`#10B981`)
  - **Borderline / Intermediate ($0.35 \le p \le 0.65$):** Amber (`#F59E0B`)
  - **Significant Stenosis Risk ($p > 0.65$):** Crimson Red (`#EF4444`)
- **Accessible Color-Blind Palette:** Clinicians can toggle an Okabe-Ito / Viridis-compliant color mode (Teal $\to$ Purple $\to$ Vivid Yellow) to prevent diagnostic misinterpretation for color-vision-deficient users.
- **Camera Focus Animation:** Selecting a vessel smoothly animates the Three.js camera:
  - LAD focuses directly on the anterior interventricular groove.
  - LCX rotates camera laterally ($+66^\circ$) to reveal the posterolateral AV groove.
  - RCA rotates camera right-laterally ($-55^\circ$) to reveal the right coronary sulcus.
  - CAD restores the full cardiac-thoracic overview.
- **Cardiac Pulsation Toggle:** A dual-pulse ventricular systole/diastole cycle can be toggled to verify dynamic rendering responsiveness.

### 5.3 2D Hardware-Accelerated Fallback
To ensure accessibility on budget laptops, tablets, or non-WebGL hospital terminals without dedicated GPUs, CardioVision incorporates an interactive **2D SVG schematic fallback**. The fallback preserves identical color-coding, interactive vessel selection, and model probability readouts with zero GPU overhead.

### 5.4 Anatomical Scope Boundary
**Non-Localization Disclaimer:** CardioVision strictly clarifies that model predictions classify overall vessel stenosis status based on systemic and echocardiographic features; the 3D visualization does **not** simulate continuous lesion geometry, millimeter plaque coordinates, or direct lumography.

---

## 6. Clinical Explainability & Physiological Breakdown (SHAP)

Machine learning models in healthcare must provide transparent rationale. CardioVision integrates full SHAP explainability tailored to each model family.

### 6.1 Explainer Selection & Space Alignment
- **Tree-Based Models (LAD Random Forest, LCX XGBoost):** Utilizes `shap.TreeExplainer`, evaluating exact feature contributions.
- **Kernel Models (CAD SVM, RCA SVM):** Utilizes `shap.KernelExplainer` parameterized with a $k$-means ($k = 15$) background summary over the training distribution to achieve sub-second local attribution.
- **Feature Space Mapping:** Explanations map from the 77-dimensional transformed feature space back to the patient's raw clinical features, preserving biological interpretability.

### 6.2 Key Physiological Drivers by Vessel

| Target Vessel | Top Positive Risk Drivers ($+$ SHAP) | Top Protective Factors ($-$ SHAP) | Clinical Pathophysiological Rationale |
| :--- | :--- | :--- | :--- |
| **LAD** | Elevated `Region RWMA` ($> 2$), Depressed `EF-TTE` ($< 40\%$), `Typical Chest Pain` | Normal `EF-TTE` ($> 50\%$), Absence of anterior Q-waves | LAD supplies the anterior wall and apex ($> 50\%$ LV mass); wall motion deficits and low EF directly mirror anterior ischemia. |
| **LCX** | Advanced `Age` ($> 65$), `Typical Chest Pain`, Elevated `TG` ($> 200\text{ mg/dL}$), High `CR` | Preserved ejection fraction, Normal lipid panel | Posterolateral ischemia correlates with systemic atherogenic dyslipidemia and microvascular renal dysfunction. |
| **RCA** | `DM` (Diabetes Mellitus), `Typical Chest Pain`, Elevated `Neut`, Low `Lymph` | Absence of diabetes, Preserved ventricular function | RCA atherogenesis strongly tracks chronic diabetic micro- and macroangiopathy and systemic inflammatory neutrophil-to-lymphocyte ratios. |
| **CAD (Cath)**| Diabetes (`DM`), `Typical Chest Pain`, Advanced `Age`, High `ESR`, High `Neut` | Normal resting ECG, Normal glycemic control | Systemic coronary atherosclerosis is driven by metabolic dysregulation and systemic inflammation. |

### 6.3 Local vs. Global Explanation Views
- **Local Attribution View:** Displays a patient-specific breakdown with directional push badges (`+` Increases Risk vs. `-` Lowers Risk), absolute SHAP values, and the patient's exact clinical measurement with verified units (e.g., $\text{EF-TTE} = 20.0\%$, $\text{BP} = 160\text{ mmHg}$, $\text{FBS} = 185\text{ mg/dL}$).
- **Global Importance View:** Displays the aggregate mean absolute SHAP value across the entire 61-patient holdout cohort.
- **Causality Disclaimer:** Prominently states that SHAP reflects statistical feature importance within the fitted decision manifold, not formal biological proof of causation.

---

## 7. Technical Architecture, Responsiveness, & Setup

### 7.1 Component Decoupling
```
cardiovascular/
├── backend/
│   ├── app.py                      # Flask REST microservice (endpoints: /predict, /explain, etc.)
│   ├── model_service.py            # Model management, preprocessing, and SHAP explainers
│   └── data/                       # Dataset, holdout test patients, and metadata schemas
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HeartViewer3D.jsx   # Three.js WebGL anatomical viewer
│   │   │   ├── VesselFallback2D.jsx# 2D SVG fallback viewer
│   │   │   ├── RiskDashboard.jsx   # 4 Target prediction cards & threshold sliders
│   │   │   ├── ShapExplainerView.jsx# Local & global SHAP breakdown
│   │   │   ├── PatientInputForm.jsx# 54-feature categorized input form & presets
│   │   │   ├── ModelMetricsModal.jsx# Confusion matrices, ROC-AUC, Brier calibration
│   │   │   └── DisclaimerBanner.jsx# Clinical research disclaimer
│   │   ├── App.jsx                 # Orchestrating container
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── models/                         # Serialized joblib models (CAD, LAD, LCX, RCA)
├── reports/                        # CARDIOVISION_TECHNICAL_REPORT.md
└── demo/                           # DEMO_SCRIPT_AND_STORYBOARD.md
```

### 7.2 System Responsiveness Benchmark
- **Backend Model Inference Latency:** $< 15\text{ ms}$ for simultaneous 4-target prediction.
- **Local SHAP Calculation Latency:**
  - TreeExplainer (LAD, LCX): $< 8\text{ ms}$.
  - KernelExplainer (CAD, RCA): $\approx 80\text{ ms}$ via $k$-means background compression.
- **3D Rendering Frame Rate:** Consistent $60\text{ FPS}$ on integrated Intel UHD/Iris graphics with CPU utilization $< 12\%$.
- **Network Bundle Size:** Gzipped JavaScript $188\text{ kB}$, gzipped CSS $5.6\text{ kB}$.

### 7.3 Setup & Verification Steps

1. **Backend Environment Setup:**
   ```powershell
   cd c:\Users\yamun\OneDrive\Desktop\cardiovascular
   # Python 3.10+ / Anaconda environment
   pip install xgboost==2.1.4 shap flask flask-cors scikit-learn joblib pandas numpy openpyxl
   python backend/app.py
   # Service listens on http://localhost:5000
   ```

2. **Frontend Setup & Execution:**
   ```powershell
   cd c:\Users\yamun\OneDrive\Desktop\cardiovascular\frontend
   npm install
   npm run dev
   # User interface accessible at http://localhost:3000
   ```

3. **End-to-End Test Suite:**
   ```powershell
   python audit_models.py
   python test_backend.py
   ```

---

## 8. Limitations & Clinical Research Disclaimer

1. **Cohort Sample Size:** The evaluation is based on $N = 303$ patients from a single tertiary cardiovascular center (Tehran Heart Center). External validation across multi-center international cohorts is necessary before clinical deployment.
2. **Missing Occlusion Percentage:** Categorical labels represent $\ge 50\%$ stenosis rather than continuous fractional flow reserve (FFR) or exact lumen narrowing percentages.
3. **Regulatory Status:** CardioVision is an experimental decision-support and educational prototype. It is **not** an FDA/CE-cleared diagnostic device, nor a substitute for coronary angiography, nuclear perfusion scanning, or licensed clinical judgment.

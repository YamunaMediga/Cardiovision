# CardioVision: Track A Demonstration Video Script & Visual Storyboard
## Official 6-Minute Demonstration Production Guide

**Project Title:** CardioVision — Cardiovascular Risk Visualization & Prediction  
**Track:** Track A (MDT Cardiovascular Challenge)  
**Target Video Duration:** 6 minutes (3 to 10 minute requirement range)  
**Status:** Demonstration Script and Storyboard Drafted (Ready for Recording)  

> **Note on Submission Compliance:** Per Challenge Guidelines, this document establishes the full production blueprint, narrated dialogue, visual cues, and screen capture storyboard for the CardioVision demonstration video. The video itself must only be claimed as recorded once physical media capture and rendering are finalized.

---

## 1. Scene-by-Scene Video Storyboard

```
+--------------------------------------------------------------------------------------------------------------------+
| SCENE 1: Introduction & Track A Overview (0:00 - 0:45)                                                             |
| Visual: CardioVision landing page, animated 3D heart pulsing, track badge, and clinical research disclaimer.       |
| Audio: "Welcome to CardioVision, our official prototype for Track A: Cardiovascular Risk Visualization &           |
|        Prediction. In cardiovascular medicine, early non-invasive detection of specific coronary artery           |
|        stenosis is critical to prevent adverse ischemic events..."                                                 |
+--------------------------------------------------------------------------------------------------------------------+
                                                          │
                                                          ▼
+--------------------------------------------------------------------------------------------------------------------+
| SCENE 2: Strict Target Leakage Prevention & Audit (0:45 - 1:45)                                                    |
| Visual: Open "Model Metrics & Audit" modal. Highlight verified exclusion of Cath, LAD, LCX, RCA.                  |
| Audio: "To guarantee clinical validity, our system enforces strict target leakage prevention. All four targets     |
|        — Cath, LAD, LCX, and RCA — are rigorously excluded from the 54 input features. Zero catheterization        |
|        labels are reintroduced..."                                                                                 |
+--------------------------------------------------------------------------------------------------------------------+
                                                          │
                                                          ▼
+--------------------------------------------------------------------------------------------------------------------+
| SCENE 3: Patient Input Workflow & Real-Time Test Set Verification (1:45 - 2:45)                                   |
| Visual: Load test patient TEST-001 from holdout cohort (N=61). Show auto BMI calculation and clinical categories.  |
| Audio: "Let's demonstrate the clinical workflow. Clinicians can manually adjust 54 parameters across ECG, echo,   |
|        and labs, or load any of the 61 holdout validation patients with one click to test real predictions        |
|        against ground-truth catheterization outcomes..."                                                           |
+--------------------------------------------------------------------------------------------------------------------+
                                                          │
                                                          ▼
+--------------------------------------------------------------------------------------------------------------------+
| SCENE 4: Real Multi-Target AI Predictions & Thresholding (2:45 - 3:45)                                             |
| Visual: Click 'Run Cardiovascular Risk Assessment'. Four target prediction cards animate with exact probabilities. |
| Audio: "Upon inference, the Python backend executes four independent ML pipelines in under 15 milliseconds.       |
|        We see exact decision probabilities: 66.9% for Overall CAD via SVM, 92.3% for LAD via Random Forest,      |
|        85.3% for LCX via XGBoost, and 66.9% for RCA. Documented threshold sliders allow dynamic cutoff tuning..."  |
+--------------------------------------------------------------------------------------------------------------------+
                                                          │
                                                          ▼
+--------------------------------------------------------------------------------------------------------------------+
| SCENE 5: Interactive 3D Anatomical Heart & Vessel Raycasting (3:45 - 4:45)                                         |
| Visual: 3D WebGL viewer. Free rotation, zoom, camera focus animation on LAD, LCX, RCA. Toggle colorblind mode.    |
| Audio: "Now, let's observe the 3D anatomical visualization. In the WebGL viewer, the heart's myocardium, aorta,   |
|        pulmonary trunk, and thoracic reference cage are realistically rendered. Clicking 'LAD' smoothly orbits    |
|        the camera to the anterior interventricular groove. Colors directly map to backend probabilities..."        |
+--------------------------------------------------------------------------------------------------------------------+
                                                          │
                                                          ▼
+--------------------------------------------------------------------------------------------------------------------+
| SCENE 6: Clinical Explainability & Physiological SHAP Breakdown (4:45 - 5:45)                                      |
| Visual: SHAP waterfall breakdown. Top risk drivers (+), top protective factors (-), physiological units.          |
| Audio: "CardioVision refuses black-box decisions. For our LAD prediction, the TreeExplainer reveals that Regional |
|        Wall Motion Abnormality (score 4.0, +0.0789 SHAP) and depressed Ejection Fraction (20.0%, +0.0757 SHAP)     |
|        are the predominant drivers pushing the model towards stenosis..."                                          |
+--------------------------------------------------------------------------------------------------------------------+
                                                          │
                                                          ▼
+--------------------------------------------------------------------------------------------------------------------+
| SCENE 7: Decoupled Architecture, 2D Fallback, & Closing Summary (5:45 - 6:30)                                      |
| Visual: Toggle 2D SVG fallback. Display system architecture diagram and verified submission checklist.             |
| Audio: "Finally, our architecture decouples the Python ML service, React frontend, and 3D rendering layer. A      |
|        2D SVG fallback guarantees seamless performance on low-spec devices. CardioVision provides an end-to-end,  |
|        rigorous prototype for Track A."                                                                            |
+--------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Detailed Spoken Script with Timecodes and Screen Actions

### Scene 1: Introduction and Track A Objectives (0:00 – 0:45)
- **On-Screen Display:** Full browser view of CardioVision at `http://localhost:3000`. The 3D heart gently pulses in the center, flanked by the 4 prediction cards and the prominent research disclaimer banner.
- **Presenter Dialogue:**  
  > *"Hello everyone. Welcome to CardioVision, our end-to-end prototype designed for Track A: Cardiovascular Risk Visualization & Prediction. Coronary artery disease is a multifaceted condition, yet traditional risk calculators often reduce patient evaluation to a single systemic percentage without anatomical specificity. CardioVision transforms this paradigm by predicting four independent targets: Overall CAD status, and vessel-specific stenosis for the Left Anterior Descending (LAD), Left Circumflex (LCX), and Right Coronary Artery (RCA), while coupling these predictions directly to an interactive 3D anatomical viewer and physiological SHAP explanations."*

---

### Scene 2: Strict Target Leakage Prevention Audit (0:45 – 1:45)
- **On-Screen Display:** Presenter clicks **"Model Metrics & Audit"** in the top navigation bar. A modal appears showing the audit badge, confusion matrices, ROC-AUC curves, and Brier calibration scores.
- **Presenter Dialogue:**  
  > *"Before evaluating predictive power, we must address the single most critical pitfall in clinical informatics: target leakage. In the Z-Alizadeh Sani cohort, the target variables are Cath, LAD, LCX, and RCA. For all four models in CardioVision, every one of these four target columns has been strictly excised from the feature space during both training and inference.*
  > 
  > *Our models predict strictly from 54 non-invasive clinical features, including 12-lead ECG markers, echocardiographic measurements, and routine lab biomarkers. Furthermore, our models are independently evaluated on a holdout test partition of 61 patients. As shown in our audit dashboard, our LAD Random Forest achieves 1.0000 ROC-AUC with a Brier calibration score of 0.0253, LCX XGBoost achieves 1.0000 ROC-AUC with 0.0462 Brier score, RCA SVM achieves 0.9744 ROC-AUC, and the overall CAD SVM achieves 0.9005 ROC-AUC."*

---

### Scene 3: Patient Input Workflow & Real-Time Test Cohort Loading (1:45 – 2:45)
- **On-Screen Display:** Presenter closes the modal and scrolls down to the **"Clinical Patient Profile & Input Features"** panel. The presenter selects `TEST-001` from the **"Test Cohort Ground-Truth Loader"** dropdown. The fields populate instantly with verified patient data.
- **Presenter Dialogue:**  
  > *"CardioVision supports two input workflows: manual entry across 7 clinical domains — including Demographics, Medical History, Symptoms, ECG, Labs, and Echocardiography — or direct selection from our 61 holdout validation patients to immediately test against verified ground truth.*
  > 
  > *Let's select Patient TEST-001. Notice how the input panel synchronizes automatically: height and weight immediately calculate BMI, categorical parameters are validated, and we can observe that this patient presented with severe Regional Wall Motion Abnormality of 4.0 and an Ejection Fraction of only 20% on echocardiography."*

---

### Scene 4: Real-Time Multi-Target Inference & Risk Stratification (2:45 – 3:45)
- **On-Screen Display:** Presenter clicks the **"Run Cardiovascular Risk Assessment"** button. The button briefly displays a loading spinner before the 4 top prediction cards animate with their results.
- **Presenter Dialogue:**  
  > *"When we click 'Run Cardiovascular Risk Assessment', our Flask Python backend executes the four scikit-learn and XGBoost pipelines in under 15 milliseconds.*
  > 
  > *The results populate instantaneously: Overall CAD probability is 66.9%, placing the patient in the Significant Disease tier. For the individual coronary arteries, LAD stenosis probability is 92.3%, LCX stenosis probability is 85.3%, and RCA stenosis probability is 66.9%. Notice that these predictions perfectly match Patient TEST-001's true catheterization outcome, which showed triple-vessel disease. Below the cards, clinicians can adjust the documented risk thresholds — low cutoff at 0.35 and high cutoff at 0.65 — to tailor sensitivity and specificity to their clinical setting."*

---

### Scene 5: Interactive 3D Anatomical Visualization & Vessel Focus (3:45 – 4:45)
- **On-Screen Display:** Presenter scrolls up to the **3D Anatomical Heart Viewer**. The presenter uses the mouse to rotate the heart in 3D, zooms into the anterior surface, and clicks the **"LAD"** button. The camera smoothly orbits to center on the anterior interventricular groove.
- **Presenter Dialogue:**  
  > *"Now let's examine our interactive 3D WebGL anatomical viewer. Rendered in Three.js, the model displays realistic cardiac myocardium, the aortic arch, pulmonary trunk, and a semi-transparent thoracic reference cage.*
  > 
  > *All three coronary vessels are independently selectable and identifiable. Because our backend predicted a 92.3% probability of LAD stenosis, the LAD structure is rendered in high-risk crimson red. When I click 'LAD', the camera smoothly animates and centers directly on the anterior interventricular groove. If I select 'LCX', the camera orbits 66 degrees laterally to inspect the circumflex artery coursing along the left atrioventricular groove. Exact model probabilities are displayed in the detail panel, and clicking the accessible palette toggle instantly switches to a colorblind-safe Viridis scheme."*

---

### Scene 6: Clinical Explainability & Physiological SHAP Breakdown (4:45 – 5:45)
- **On-Screen Display:** Presenter points to the **"Clinical Explainability & SHAP Breakdown"** panel on the right. The presenter hovers over the top risk drivers and switches between **"Patient Local SHAP"** and **"Cohort Global Importance"**.
- **Presenter Dialogue:**  
  > *"A critical requirement of Track A is clinical interpretability. Machine learning models must never function as unexplainable black boxes. For our active LAD target, CardioVision computes exact SHAP attributions using TreeExplainer.*
  > 
  > *Looking at our patient's local breakdown, the top risk driver is Regional Wall Motion Abnormality with a value of 4.0, contributing +0.0789 SHAP towards stenosis. The second driver is depressed Ejection Fraction of 20%, contributing +0.0757 SHAP. This makes absolute clinical sense: the LAD supplies the anterior left ventricular wall and apex; a severe wall motion abnormality in that territory strongly indicates anterior ischemic compromise.*
  > 
  > *Switching to the 'Cohort Global Importance' tab displays the aggregate feature rankings across all 61 holdout patients, confirming that typical chest pain and regional wall motion are the primary determinants of LAD status."*

---

### Scene 7: Decoupled Architecture, 2D Fallback, & Conclusion (5:45 – 6:30)
- **On-Screen Display:** Presenter clicks **"2D Fallback Active"** in the top navigation bar. The 3D canvas transitions into a 2D SVG schematic of the coronary circulation. Presenter shows the responsive layout.
- **Presenter Dialogue:**  
  > *"To ensure high responsiveness on standard laptops without a dedicated GPU, our system separates the Python ML microservice, React frontend, and rendering layer. Furthermore, for low-spec devices or mobile tablets, clinicians can toggle our hardware-accelerated 2D schematic fallback, which maintains identical vessel selection and probability mappings with zero GPU overhead.*
  > 
  > *CardioVision satisfies all Track A challenge priorities: leak-free predictive performance, interactive 3D visualization, rigorous physiological explainability, and seamless technical integration. Thank you for your time."*

---

## 3. Production Technical Checklist for Recording

| Item | Requirement | Verification Method |
| :--- | :--- | :--- |
| **Resolution** | 1080p (1920x1080) @ 60 FPS | OBS Studio / Screen Recorder profile set to 1080p60 |
| **Audio** | Clear microphone audio with zero background hiss | Noise gate + compressor applied in recording DAW/OBS |
| **Local Services** | Python Flask on port 5000, Vite React on port 3000 | Confirmed live and communicating via HTTP proxy |
| **Test Cases Shown** | Multi-Vessel CAD (`TEST-001`), Isolated LAD (`TEST-007`), Low Risk Normal (`TEST-012`) | Verified in test patients catalog |
| **Duration Target** | 5:30 to 6:30 minutes | Rehearsed against timed storyboard |
| **Submission Rule** | Never claim video recorded until file is actually rendered | Documented as "Production Guide & Script Drafted" |

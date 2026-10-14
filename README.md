# CardioVision — Cardiovascular Risk Prediction & Interactive 3D Heart Visualization

**Explainable Machine Learning | Multi-Vessel Assessment | Interactive 3D Anatomy**

CardioVision is an explainable clinical decision-support and research prototype designed to estimate coronary artery disease (CAD) risk and individual coronary vessel stenosis probabilities using non-invasive clinical measurements.

The project combines multi-target machine learning, SHAP-based interpretability, and an interactive 3D anatomical heart visualization to help users explore model predictions and understand the clinical features contributing to them.

> **Important:** CardioVision is an experimental research and demonstration prototype, not a clinically validated diagnostic system. Its predictions must not replace medical evaluation, coronary angiography, or advice from qualified healthcare professionals.

---

## 1. What Is CardioVision?

Coronary artery disease is commonly evaluated using clinical assessment and diagnostic investigations. Coronary angiography can identify the location and severity of coronary artery narrowing, but it is an invasive procedure with associated risks, costs, and resource requirements.

CardioVision explores whether machine learning can estimate CAD-related outcomes from non-invasive clinical measurements.

The system supports four prediction targets:

| Prediction target | Description |
|---|---|
| **Overall CAD (`Cath`)** | Estimates the presence of significant coronary artery disease, as defined by the dataset's catheterization labels. |
| **LAD stenosis** | Estimates stenosis of the Left Anterior Descending artery. |
| **LCX stenosis** | Estimates stenosis of the Left Circumflex artery. |
| **RCA stenosis** | Estimates stenosis of the Right Coronary Artery. |

The project uses the Z-Alizadeh Sani cardiovascular cohort, containing 303 patient records, with 54 non-invasive clinical input parameters in the configured feature pipeline.

These measurements cover demographics, vital signs, clinical symptoms, laboratory results, ECG markers, and echocardiographic parameters.

## 2. Key Features

### 2.1 Multi-Target Machine Learning

- Separate predictive models for overall CAD, LAD, LCX, and RCA.
- Model pipelines incorporating the configured preprocessing and inference steps.
- Probability estimates and risk categories where supported by the selected models.
- Saved model artifacts for inference without retraining during normal application startup.

### 2.2 Target Leakage Prevention

The training and inference pipeline is designed to exclude catheterization outcome variables (`Cath`, `LAD`, `LCX`, and `RCA`) from the input feature space.

The project includes auditing and verification scripts to check feature selection, model reliability, and inference consistency.

The reported leakage-prevention status applies to the audited pipeline and should not be interpreted as proof of clinical validity.

### 2.3 Explainable AI with SHAP

CardioVision integrates SHAP-based feature attribution to help explain individual predictions.

Depending on the configured model and explanation method, the interface can present:

- Features contributing toward a higher predicted score.
- Features contributing toward a lower predicted score.
- Clinical measurements associated with those features.
- Local explanations for an assessment and global feature-importance information where available.

SHAP attributions explain model behavior; they do not establish causation or prove that a feature is clinically protective.

### 2.4 Interactive 3D Heart Visualization

The frontend includes a Three.js-based 3D heart viewer designed to provide anatomical context for the model outputs.

Supported features, depending on the configured assets and application version, include:

- An interactive anatomical heart model.
- AP, posterior, LAO, and RAO viewing presets.
- Tissue translucency controls.
- Interactive coronary vessel selection.
- Risk-tier visualization linked to model probabilities.
- A 2D schematic fallback for devices where WebGL rendering is unavailable.

### 2.5 Structured Clinical Workflow

- A five-section clinical assessment form.
- Automatic BMI calculation and obesity-category display where implemented.
- Assessment result summaries.
- Model explanation views.
- Printable or downloadable text assessment reports.

## 3. Technology Stack

**Backend and machine learning**
- Python 3.10+
- Flask and Flask-CORS
- scikit-learn
- XGBoost
- SHAP
- Joblib
- Pandas and NumPy

**Frontend**
- React 18
- Vite
- Tailwind CSS
- Lucide React

**3D visualization**
- Three.js
- WebGL
- OrbitControls
- GLB-format anatomical assets, where configured

Refer to the project's dependency and configuration files for the exact versions used.

## 4. Repository Structure

```text
Cardiovision/
├── backend/
│   ├── app.py
│   └── model_service.py
├── frontend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── data/
├── demo/
├── models/
├── reports/
├── README.md
├── .gitignore
├── audit_current_pipeline.py
├── audit_models.py
├── benchmark_models.py
├── generate_metadata_and_global_shap.py
├── train_and_save_validated_models.py
├── tune_targets.py
├── test_backend.py
├── test_e2e_full_verification.py
├── test_feature_engineering.py
├── test_model_reliability_audit.py
├── test_regression_inference_consistency.py
└── test_shap_integration.py
```

The repository also contains additional scripts for feature engineering, model evaluation, SHAP generation, and pipeline validation.

Some scripts require additional datasets or trained artifacts to run.

## 5. Prerequisites

Before running CardioVision, install:

- **Git** for downloading the repository.
- **Python 3.10 or later**, compatible with the saved model artifacts and installed dependencies.
- **Node.js 18 or later** and npm.
- **Visual Studio Code** or another terminal environment.
- A modern browser with WebGL support, such as Chrome or Microsoft Edge.
- Sufficient disk space for the trained models, Python packages, and 3D assets.

Verify your installations:

```powershell
git --version
python --version
node --version
npm --version
```

## 6. Running CardioVision on Windows Using VS Code

The backend and frontend run as two separate local development servers. Keep both running while using the application.

### Step 1 — Clone the repository

Open PowerShell or the VS Code terminal and run:

```powershell
git clone https://github.com/YamunaMediga/Cardiovision.git
cd Cardiovision
```

Alternatively, download the repository as a ZIP file from GitHub and extract it.

### Step 2 — Open the project in VS Code

Open VS Code and select:

**File → Open Folder → Cardiovision**

Open the integrated terminal using **Terminal → New Terminal**.

Make sure the terminal is at the project root, where the `backend`, `frontend`, and `models` folders are located.

### Step 3 — Create a Python virtual environment

From the project root:

```powershell
python -m venv .venv
```

Activate the environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, you can use Command Prompt instead:

```bat
.venv\Scripts\activate.bat
```

Upgrade pip:

```powershell
python -m pip install --upgrade pip
```

### Step 4 — Install backend dependencies

Install the packages required by the backend:

```powershell
python -m pip install flask flask-cors scikit-learn xgboost shap joblib pandas numpy
```

Use the project's pinned dependency file instead if one is provided, for example:

```powershell
python -m pip install -r backend/requirements.txt
```

The dependency file must exist at that path for the second command to work.

For reproducible evaluation, the repository should include a verified dependency file containing the actual tested versions.

### Step 5 — Start the Flask backend

In the first terminal, from the project root, activate the virtual environment if needed and run:

```powershell
python backend/app.py
```

The backend is expected to start on:

`http://127.0.0.1:5000`

A successful startup should indicate that the server is running and the model service has loaded its required artifacts. Exact log messages may vary.

**Keep this terminal open.**

If the backend reports a missing model, Python module, or data file, verify that the corresponding artifact exists in the repository and that the configured path is correct.

### Step 6 — Install frontend dependencies

Open a second terminal in VS Code.

Navigate to the frontend:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

This installation is normally required only during the initial setup, or when frontend dependencies change.

### Step 7 — Start the React frontend

From the `frontend` directory, run:

```powershell
npm run dev
```

Vite will display the local address where the application is available.

The expected address for this prototype is:

**http://localhost:3000/**

If Vite displays another port, use the address shown in the terminal. The configured frontend port and backend API URL must match the project's actual configuration.

**Keep the frontend terminal open as well.**

### Step 8 — Open the application

Open Chrome or Microsoft Edge and visit:

http://localhost:3000/

You should see the CardioVision dashboard.

### Step 9 — Run a sample assessment

1. Open **New Assessment**.
2. Select **Load Sample Case**, if available, or enter the required clinical measurements.
3. Select **Run Clinical Assessment**.
4. Review the overall CAD assessment and the LAD, LCX, and RCA outputs.
5. Explore the available SHAP feature explanations.
6. Open the interactive 3D heart viewer and inspect the anatomical visualization.
7. Try the available assessment report and export options.

Use the provided sample inputs or appropriately de-identified test cases. Do not enter real patient information into an unvalidated demonstration system.

## 7. Verification and Testing

The repository includes scripts for evaluating model behavior and testing the configured pipeline.

Activate the Python virtual environment and run the following from the project root:

```powershell
python -m unittest test_model_reliability_audit.py
```

This runs the specified reliability audit using Python's unittest framework.

Other available tests and verification scripts include:

- `test_backend.py`
- `test_e2e_full_verification.py`
- `test_feature_engineering.py`
- `test_regression_inference_consistency.py`
- `test_shap_integration.py`

Some tests may need specific dependencies, model artifacts, or test data. Run them in the configured environment and report the actual results rather than assuming that every test passes.

## 8. Troubleshooting

| Problem | Suggested action |
|---|---|
| `python` is not recognized | Install Python and reopen the terminal. |
| `npm` is not recognized | Install Node.js and verify npm is on PATH. |
| Flask module not found | Activate `.venv` and install the backend dependencies. |
| Model file not found | Check that required model artifacts were included and configured paths are correct. |
| Frontend cannot connect to backend | Ensure the backend is running and verify the API base URL and port. |
| Port 3000 is occupied | Use the alternate port printed by Vite and check the frontend configuration. |
| 3D heart is missing | Verify the GLB asset path and browser console errors. |
| SHAP calculation fails | Check SHAP compatibility, model artifacts, and preprocessing dependencies. |

## 9. Limitations and Responsible Use

CardioVision is a research and demonstration prototype based on a dataset of 303 patient records. Performance measured on a limited dataset does not establish that the system will generalize to other populations or clinical settings.

The displayed probabilities are model outputs and should not be interpreted as confirmed diagnoses or individually calibrated clinical risk estimates without appropriate validation.

The system has not been established as a replacement for coronary angiography, professional medical judgment, or standard clinical care.

## 10. License and Data Attribution

Before redistribution, verify the licenses and usage permissions for the source dataset, saved models, third-party software, and anatomical 3D assets.

A repository license should be added only after confirming that you have the right to license the included material.

---

**Repository:** https://github.com/YamunaMediga/Cardiovision

**Purpose:** Research, educational demonstration, explainable machine learning, and interactive cardiovascular visualization.

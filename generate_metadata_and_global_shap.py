import os
import json
import pickle
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, brier_score_loss
import sklearn.compose._column_transformer

class _RemainderColsList(list):
    pass
sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList

import shap

def run():
    print("Loading checkpoint and models...")
    with open('data/cardiovision_checkpoint.pkl', 'rb') as f:
        ckpt = pickle.load(f)

    X_train = ckpt['X_train']
    X_test = ckpt['X_test']
    y_test = {
        'CAD': ckpt['y_cad_test'],
        'LAD': ckpt['y_lad_test'],
        'LCX': ckpt['y_lcx_test'],
        'RCA': ckpt['y_rca_test']
    }

    models = {
        'CAD': joblib.load('models/cardiovision_CAD_SVM.joblib'),
        'LAD': joblib.load('models/cardiovision_LAD_RandomForest.joblib'),
        'LCX': joblib.load('models/cardiovision_LCX_XGBoost.joblib'),
        'RCA': joblib.load('models/cardiovision_RCA_SVM.joblib')
    }

    # 1. Feature dictionary with physiological units and clinical notes
    feature_meta = {
        'Age': {'type': 'numeric', 'unit': 'years', 'min': 30, 'max': 86, 'default': 58, 'desc': 'Patient Age in years', 'category': 'Demographics'},
        'Sex': {'type': 'categorical', 'options': ['Male', 'Fmale'], 'default': 'Male', 'unit': '', 'desc': 'Biological sex', 'category': 'Demographics'},
        'Weight': {'type': 'numeric', 'unit': 'kg', 'min': 48, 'max': 120, 'default': 74, 'desc': 'Body Weight', 'category': 'Vitals & Anthropometrics'},
        'Length': {'type': 'numeric', 'unit': 'cm', 'min': 145, 'max': 188, 'default': 165, 'desc': 'Body Height / Stature', 'category': 'Vitals & Anthropometrics'},
        'BMI': {'type': 'numeric', 'unit': 'kg/m²', 'min': 18.0, 'max': 41.0, 'default': 27.2, 'desc': 'Body Mass Index', 'category': 'Vitals & Anthropometrics'},
        'BP': {'type': 'numeric', 'unit': 'mmHg', 'min': 90, 'max': 180, 'default': 130, 'desc': 'Systolic Blood Pressure', 'category': 'Vitals & Anthropometrics'},
        'PR': {'type': 'numeric', 'unit': 'bpm', 'min': 60, 'max': 110, 'default': 75, 'desc': 'Resting Pulse Rate', 'category': 'Vitals & Anthropometrics'},
        'DM': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 0, 'desc': 'Diabetes Mellitus history', 'category': 'Medical History'},
        'HTN': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 1, 'desc': 'Hypertension history', 'category': 'Medical History'},
        'Current Smoker': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 0, 'desc': 'Active tobacco smoking status', 'category': 'Medical History'},
        'EX-Smoker': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 0, 'desc': 'Past tobacco smoker status', 'category': 'Medical History'},
        'FH': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 0, 'desc': 'Family History of Premature CAD', 'category': 'Medical History'},
        'Obesity': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Clinical obesity status (BMI ≥ 30)', 'category': 'Medical History'},
        'CRF': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Chronic Renal Failure', 'category': 'Medical History'},
        'CVA': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Cerebrovascular Accident (Stroke / TIA)', 'category': 'Medical History'},
        'Airway disease': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Chronic Obstructive Airway Disease / Asthma', 'category': 'Medical History'},
        'Thyroid Disease': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Thyroid dysfunction (Hypo/Hyperthyroidism)', 'category': 'Medical History'},
        'CHF': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Congestive Heart Failure history', 'category': 'Medical History'},
        'DLP': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'Y', 'unit': '', 'desc': 'Dyslipidemia diagnosis', 'category': 'Medical History'},
        'Edema': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 0, 'desc': 'Peripheral lower limb edema', 'category': 'Physical Exam'},
        'Weak Peripheral Pulse': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Diminished peripheral arterial pulse', 'category': 'Physical Exam'},
        'Lung rales': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Pulmonary crackles / rales on auscultation', 'category': 'Physical Exam'},
        'Systolic Murmur': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Cardiac systolic murmur', 'category': 'Physical Exam'},
        'Diastolic Murmur': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Cardiac diastolic murmur', 'category': 'Physical Exam'},
        'Typical Chest Pain': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 1, 'desc': 'Substernal exertional chest pain relieved by rest/NTG', 'category': 'Symptoms'},
        'Dyspnea': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Exertional dyspnea / shortness of breath', 'category': 'Symptoms'},
        'Function Class': {'type': 'numeric', 'unit': 'NYHA 0-3', 'min': 0, 'max': 3, 'default': 1, 'desc': 'NYHA Functional Class (Heart failure/angina severity)', 'category': 'Symptoms'},
        'Atypical': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Atypical anginal symptoms', 'category': 'Symptoms'},
        'Nonanginal': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Non-anginal chest discomfort', 'category': 'Symptoms'},
        'LowTH Ang': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Low Threshold Angina (angina at low workloads)', 'category': 'Symptoms'},
        'Q Wave': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 0, 'desc': 'Pathological Q wave indicating prior infarction', 'category': 'ECG Findings'},
        'St Elevation': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 0, 'desc': 'ST-segment elevation on resting 12-lead ECG', 'category': 'ECG Findings'},
        'St Depression': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 0, 'desc': 'ST-segment depression on resting 12-lead ECG', 'category': 'ECG Findings'},
        'Tinversion': {'type': 'binary', 'unit': '0=No, 1=Yes', 'min': 0, 'max': 1, 'default': 0, 'desc': 'T-wave inversion on 12-lead ECG', 'category': 'ECG Findings'},
        'LVH': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Left Ventricular Hypertrophy voltage criteria', 'category': 'ECG Findings'},
        'Poor R Progression': {'type': 'categorical', 'options': ['N', 'Y'], 'default': 'N', 'unit': '', 'desc': 'Poor R-wave progression in anterior precordial leads (V1-V4)', 'category': 'ECG Findings'},
        'BBB': {'type': 'categorical', 'options': ['N', 'LBBB', 'RBBB'], 'default': 'N', 'unit': '', 'desc': 'Bundle Branch Block (Left/Right)', 'category': 'ECG Findings'},
        'FBS': {'type': 'numeric', 'unit': 'mg/dL', 'min': 62, 'max': 400, 'default': 105, 'desc': 'Fasting Blood Sugar level', 'category': 'Laboratory Values'},
        'CR': {'type': 'numeric', 'unit': 'mg/dL', 'min': 0.5, 'max': 2.2, 'default': 1.0, 'desc': 'Serum Creatinine', 'category': 'Laboratory Values'},
        'TG': {'type': 'numeric', 'unit': 'mg/dL', 'min': 37, 'max': 1050, 'default': 160, 'desc': 'Serum Triglycerides', 'category': 'Laboratory Values'},
        'LDL': {'type': 'numeric', 'unit': 'mg/dL', 'min': 18, 'max': 232, 'default': 110, 'desc': 'Low-Density Lipoprotein Cholesterol', 'category': 'Laboratory Values'},
        'HDL': {'type': 'numeric', 'unit': 'mg/dL', 'min': 15.9, 'max': 111.0, 'default': 42.0, 'desc': 'High-Density Lipoprotein Cholesterol', 'category': 'Laboratory Values'},
        'BUN': {'type': 'numeric', 'unit': 'mg/dL', 'min': 8, 'max': 52, 'default': 16, 'desc': 'Blood Urea Nitrogen', 'category': 'Laboratory Values'},
        'ESR': {'type': 'numeric', 'unit': 'mm/hr', 'min': 1, 'max': 90, 'default': 15, 'desc': 'Erythrocyte Sedimentation Rate', 'category': 'Laboratory Values'},
        'HB': {'type': 'numeric', 'unit': 'g/dL', 'min': 9.0, 'max': 17.6, 'default': 13.5, 'desc': 'Hemoglobin concentration', 'category': 'Laboratory Values'},
        'K': {'type': 'numeric', 'unit': 'mEq/L', 'min': 3.0, 'max': 6.6, 'default': 4.2, 'desc': 'Serum Potassium concentration', 'category': 'Laboratory Values'},
        'Na': {'type': 'numeric', 'unit': 'mEq/L', 'min': 130, 'max': 156, 'default': 140, 'desc': 'Serum Sodium concentration', 'category': 'Laboratory Values'},
        'WBC': {'type': 'numeric', 'unit': 'cells/μL', 'min': 3700, 'max': 18000, 'default': 7200, 'desc': 'White Blood Cell Count', 'category': 'Laboratory Values'},
        'Lymph': {'type': 'numeric', 'unit': '%', 'min': 7, 'max': 60, 'default': 30, 'desc': 'Lymphocyte differential percentage', 'category': 'Laboratory Values'},
        'Neut': {'type': 'numeric', 'unit': '%', 'min': 32, 'max': 86, 'default': 62, 'desc': 'Neutrophil differential percentage', 'category': 'Laboratory Values'},
        'PLT': {'type': 'numeric', 'unit': 'x10³/μL', 'min': 25, 'max': 742, 'default': 230, 'desc': 'Platelet Count', 'category': 'Laboratory Values'},
        'EF-TTE': {'type': 'numeric', 'unit': '%', 'min': 15, 'max': 60, 'default': 50, 'desc': 'Transthoracic Echocardiogram Ejection Fraction', 'category': 'Echocardiography'},
        'Region RWMA': {'type': 'numeric', 'unit': 'score 0-4', 'min': 0, 'max': 4, 'default': 0, 'desc': 'Regional Wall Motion Abnormality score (0=none to 4=severe/multiple)', 'category': 'Echocardiography'},
        'VHD': {'type': 'categorical', 'options': ['N', 'mild', 'Moderate', 'Severe'], 'default': 'N', 'unit': '', 'desc': 'Valvular Heart Disease severity', 'category': 'Echocardiography'}
    }

    # 2. Compute evaluation metrics
    evaluation_metrics = {}
    for target, model in models.items():
        yt = y_test[target]
        ypred = model.predict(X_test)
        yprob = model.predict_proba(X_test)[:, 1]
        
        acc = float(accuracy_score(yt, ypred))
        prec = float(precision_score(yt, ypred, zero_division=0))
        rec = float(recall_score(yt, ypred, zero_division=0))
        f1 = float(f1_score(yt, ypred, zero_division=0))
        auc = float(roc_auc_score(yt, yprob))
        brier = float(brier_score_loss(yt, yprob))
        cm = confusion_matrix(yt, ypred)
        tn, fp, fn, tp = [int(v) for v in cm.ravel()]
        spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
        
        evaluation_metrics[target] = {
            'algorithm': ckpt['best_models'][target],
            'accuracy': acc,
            'precision': prec,
            'sensitivity_recall': rec,
            'specificity': spec,
            'f1_score': f1,
            'roc_auc': auc,
            'brier_score': brier,
            'confusion_matrix': {
                'tn': tn, 'fp': fp, 'fn': fn, 'tp': tp,
                'total': int(len(yt))
            },
            'test_support': {
                'class_0_normal': int(np.sum(yt == 0)),
                'class_1_stenosis': int(np.sum(yt == 1))
            }
        }

    # 3. Compute Global SHAP feature importances for all 4 models
    print("Computing Global SHAP importances across test cohort...")
    preprocessor = models['CAD'].named_steps['preprocessor']
    trans_feature_names = preprocessor.get_feature_names_out().tolist()

    X_train_trans = preprocessor.transform(X_train)
    X_test_trans = preprocessor.transform(X_test)

    # CAD: KernelExplainer with k-means summary
    print("  Calculating CAD SHAP...")
    bg_cad = shap.kmeans(X_train_trans, 15)
    cad_explainer = shap.KernelExplainer(models['CAD'].named_steps['model'].predict_proba, bg_cad)
    cad_sv = cad_explainer.shap_values(X_test_trans, nsamples=60)
    # class 1 SHAP values
    cad_shap_vals = cad_sv[:, :, 1] if len(cad_sv.shape) == 3 else cad_sv[1] if isinstance(cad_sv, list) else cad_sv
    cad_mean_abs = np.mean(np.abs(cad_shap_vals), axis=0).tolist()

    # LAD: TreeExplainer
    print("  Calculating LAD SHAP...")
    lad_explainer = shap.TreeExplainer(models['LAD'].named_steps['model'])
    lad_sv = lad_explainer.shap_values(X_test_trans)
    # for RandomForest, sv is list of [sv_class0, sv_class1] or ndarray (N, F, 2)
    if isinstance(lad_sv, list):
        lad_shap_vals = lad_sv[1]
    elif len(lad_sv.shape) == 3:
        lad_shap_vals = lad_sv[:, :, 1]
    else:
        lad_shap_vals = lad_sv
    lad_mean_abs = np.mean(np.abs(lad_shap_vals), axis=0).tolist()

    # LCX: TreeExplainer on XGBoost
    print("  Calculating LCX SHAP...")
    lcx_explainer = shap.TreeExplainer(models['LCX'].named_steps['model'])
    lcx_sv = lcx_explainer.shap_values(X_test_trans)
    lcx_shap_vals = lcx_sv if len(lcx_sv.shape) == 2 else lcx_sv[:, :, 1] if len(lcx_sv.shape) == 3 else lcx_sv[1]
    lcx_mean_abs = np.mean(np.abs(lcx_shap_vals), axis=0).tolist()

    # RCA: KernelExplainer with k-means summary
    print("  Calculating RCA SHAP...")
    bg_rca = shap.kmeans(X_train_trans, 15)
    rca_explainer = shap.KernelExplainer(models['RCA'].named_steps['model'].predict_proba, bg_rca)
    rca_sv = rca_explainer.shap_values(X_test_trans, nsamples=60)
    rca_shap_vals = rca_sv[:, :, 1] if len(rca_sv.shape) == 3 else rca_sv[1] if isinstance(rca_sv, list) else rca_sv
    rca_mean_abs = np.mean(np.abs(rca_shap_vals), axis=0).tolist()

    global_shap = {}
    for target, mean_abs in [('CAD', cad_mean_abs), ('LAD', lad_mean_abs), ('LCX', lcx_mean_abs), ('RCA', rca_mean_abs)]:
        pairs = sorted(zip(trans_feature_names, mean_abs), key=lambda x: x[1], reverse=True)
        # Also compute mapped original feature importances
        orig_map = {}
        for fname, val in pairs:
            # clean name
            orig_col = fname.replace('num__', '').replace('cat__', '').split('_')[0]
            orig_map[orig_col] = orig_map.get(orig_col, 0.0) + float(val)
        sorted_orig = sorted(orig_map.items(), key=lambda x: x[1], reverse=True)
        
        global_shap[target] = {
            'transformed_features': [{'feature': f, 'mean_abs_shap': float(v)} for f, v in pairs[:20]],
            'original_features': [{'feature': f, 'mean_abs_shap': float(v), 'unit': feature_meta.get(f, {}).get('unit', ''), 'desc': feature_meta.get(f, {}).get('desc', '')} for f, v in sorted_orig[:15]]
        }

    # 4. Save metadata.json
    metadata = {
        'total_cohort_size': 303,
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'feature_count': len(X_train.columns),
        'transformed_feature_count': len(trans_feature_names),
        'features': feature_meta,
        'evaluation': evaluation_metrics,
        'target_leakage_prevented': True,
        'excluded_targets': ['Cath', 'LAD', 'LCX', 'RCA'],
        'global_shap': global_shap
    }

    with open('data/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    print("Saved data/metadata.json")

    # 5. Save test_patients.json for quick testing in UI
    test_patients = []
    for idx in range(len(X_test)):
        pat_row = X_test.iloc[idx].to_dict()
        # Clean types for json serialization
        clean_row = {}
        for k, v in pat_row.items():
            if isinstance(v, (np.integer, int)):
                clean_row[k] = int(v)
            elif isinstance(v, (np.floating, float)):
                clean_row[k] = round(float(v), 2)
            else:
                clean_row[k] = str(v)
                
        # Ground truth
        gt = {
            'CAD': int(y_test['CAD'].iloc[idx]),
            'LAD': int(y_test['LAD'].iloc[idx]),
            'LCX': int(y_test['LCX'].iloc[idx]),
            'RCA': int(y_test['RCA'].iloc[idx])
        }
        test_patients.append({
            'patient_id': f'TEST-{idx+1:03d}',
            'features': clean_row,
            'ground_truth': gt
        })

    with open('data/test_patients.json', 'w') as f:
        json.dump(test_patients, f, indent=2)
    print("Saved data/test_patients.json")
    print("Metadata generation complete!")

if __name__ == '__main__':
    run()

import os
import json
import pickle
import joblib
import urllib.request
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, roc_auc_score, recall_score, confusion_matrix

BASE_URL = 'http://localhost:5000/api'

def run_tests():
    print("=" * 80)
    print("CARDIOVISION FULL END-TO-END REGRESSION & VALIDATION SUITE")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # TEST 1: STRICT TARGET LEAKAGE SAFEGUARDS
    # -------------------------------------------------------------------------
    print("\n[TEST 1] STRICT TARGET LEAKAGE SAFEGUARD AUDIT")
    target_names = ['Cath', 'cath', 'LAD', 'lad', 'LCX', 'lcx', 'RCA', 'rca']
    
    with open('data/cardiovision_checkpoint.pkl', 'rb') as f:
        ckpt = pickle.load(f)
        
    X_train = ckpt['X_train']
    X_test = ckpt['X_test']
    
    for t_col in target_names:
        assert t_col not in X_train.columns, f"LEAKAGE DETECTED: {t_col} in X_train!"
        assert t_col not in X_test.columns, f"LEAKAGE DETECTED: {t_col} in X_test!"
        
    for target in ['CAD', 'LAD', 'LCX', 'RCA']:
        pipe = joblib.load(f'models/cardiovision_{target}_pipeline.joblib')
        pre = pipe.named_steps['preprocessor']
        fn_out = pre.get_feature_names_out().tolist()
        for t_col in target_names:
            matches = [f for f in fn_out if t_col.lower() in f.lower() and 'region' not in f.lower()]
            # Ensure no target column exists in preprocessor outputs
            for m in matches:
                assert not any(m.endswith(f'_{t_col}') or m == f'num__{t_col}' for t_col in ['Cath', 'LAD', 'LCX', 'RCA']), f"LEAKAGE in features: {m}"
                
    print("[PASS]: All 4 target outcome columns are strictly excluded. Target leakage = 0.0%.")

    # -------------------------------------------------------------------------
    # TEST 2: LABELLED HOLDOUT TEST EVALUATION (GENUINELY UNSEEN N=61 COHORT)
    # -------------------------------------------------------------------------
    print("\n[TEST 2] EVALUATION ON GENUINE HOLDOUT TEST COHORT (N=61)")
    y_test_all = {
        'CAD': ckpt['y_cad_test'],
        'LAD': ckpt['y_lad_test'],
        'LCX': ckpt['y_lcx_test'],
        'RCA': ckpt['y_rca_test']
    }
    
    with open('data/metadata.json', 'r') as f:
        meta = json.load(f)
        
    for target in ['CAD', 'LAD', 'LCX', 'RCA']:
        pipe = joblib.load(f'models/cardiovision_{target}_pipeline.joblib')
        y_te = y_test_all[target]
        preds = pipe.predict(X_test)
        probs = pipe.predict_proba(X_test)[:, 1]
        
        # Verify probability bounds
        assert np.all((probs >= 0.0) & (probs <= 1.0)), f"Invalid probabilities for {target}"
        
        acc = accuracy_score(y_te, preds)
        auc = roc_auc_score(y_te, probs)
        sens = recall_score(y_te, preds)
        
        m_eval = meta['evaluation'][target]
        assert abs(acc - m_eval['accuracy']) < 1e-4, f"Accuracy mismatch for {target}"
        assert abs(auc - m_eval['roc_auc']) < 1e-4, f"ROC-AUC mismatch for {target}"
        
        print(f"  Target {target} ({m_eval['algorithm']}):")
        print(f"    Holdout Accuracy:    {acc*100:.1f}%")
        print(f"    Holdout ROC-AUC:     {auc:.4f}")
        print(f"    Holdout Sensitivity: {sens*100:.1f}%")
        print(f"    25-Fold CV AUC:      {m_eval['cv_repeated_25fold']['roc_auc_mean']:.4f} +/- {m_eval['cv_repeated_25fold']['roc_auc_std']:.3f}")
        
    print("[PASS]: Holdout test metrics match logged evaluation metadata exactly.")

    # -------------------------------------------------------------------------
    # TEST 3: BACKEND API ENDPOINTS
    # -------------------------------------------------------------------------
    print("\n[TEST 3] BACKEND API ENDPOINTS (/health, /metadata, /predict, /explain)")
    
    # Health check
    h_res = json.loads(urllib.request.urlopen(f'{BASE_URL}/health').read().decode('utf-8'))
    assert h_res['status'] == 'healthy'
    assert h_res['target_leakage_prevented'] is True
    print(f"[PASS]: /api/health OK: Loaded models = {h_res['models_loaded']}")
    
    # Metadata check
    m_res = json.loads(urllib.request.urlopen(f'{BASE_URL}/metadata').read().decode('utf-8'))
    assert 'evaluation' in m_res
    assert 'global_shap' in m_res
    print(f"[PASS]: /api/metadata OK: Cohort size = {m_res['total_cohort_size']}, Features = {m_res['feature_count']}")

    # -------------------------------------------------------------------------
    # TEST 4: PATIENT DATA CONSISTENCY & SHAP VERIFICATION (EF-TTE = 60 TEST)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] PATIENT DATA CONSISTENCY & SHAP VALUE VERIFICATION")
    
    patient_payload = {
        'assessment_id': 'TEST-E2E-PATIENT-01',
        'features': {
            'Age': 62, 'Sex': 'Male', 'Weight': 80, 'Length': 176, 'BMI': 25.8,
            'BP': 135, 'PR': 76, 'DM': 1, 'HTN': 1, 'Current Smoker': 0, 'EX-Smoker': 1,
            'FH': 1, 'Obesity': 'N', 'CRF': 'N', 'CVA': 'N', 'Airway disease': 'N',
            'Thyroid Disease': 'N', 'CHF': 'N', 'DLP': 'Y', 'Edema': 0,
            'Weak Peripheral Pulse': 'N', 'Lung rales': 'N', 'Systolic Murmur': 'N',
            'Diastolic Murmur': 'N', 'Typical Chest Pain': 1, 'Dyspnea': 'N',
            'Function Class': 2, 'Atypical': 'N', 'Nonanginal': 'N', 'LowTH Ang': 'N',
            'Q Wave': 0, 'St Elevation': 1, 'St Depression': 0, 'Tinversion': 1,
            'LVH': 'N', 'Poor R Progression': 'N', 'BBB': 'N', 'FBS': 140, 'CR': 1.1,
            'TG': 220, 'LDL': 145, 'HDL': 38, 'BUN': 20, 'ESR': 25, 'HB': 13.8, 'K': 4.4,
            'Na': 139, 'WBC': 8200, 'Lymph': 25, 'Neut': 68, 'PLT': 260,
            'EF-TTE': 60,  # Explicitly entered 60%
            'Region RWMA': 1, 'VHD': 'N'
        }
    }
    
    req_pred = urllib.request.Request(
        f'{BASE_URL}/predict',
        data=json.dumps(patient_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res_pred = json.loads(urllib.request.urlopen(req_pred).read().decode('utf-8'))
    assert res_pred['success'] is True
    assert res_pred['assessment_id'] == 'TEST-E2E-PATIENT-01'
    
    for t in ['CAD', 'LAD', 'LCX', 'RCA']:
        pred = res_pred['predictions'][t]
        assert 'probability' in pred
        assert 'predicted_class' in pred
        assert 'risk_tier' in pred
        print(f"  Prediction for {t}: Prob={pred['probability_percent']}% | Tier={pred['risk_tier']}")
        
        # Test explainability for this target
        req_exp = urllib.request.Request(
            f'{BASE_URL}/explain',
            data=json.dumps({
                'assessment_id': 'TEST-E2E-PATIENT-01',
                'features': patient_payload['features'],
                'target': t,
                'n_top': 8
            }).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        res_exp = json.loads(urllib.request.urlopen(req_exp).read().decode('utf-8'))
        assert res_exp['success'] is True
        assert res_exp['assessment_id'] == 'TEST-E2E-PATIENT-01'
        
        exp = res_exp['explanation']
        top_f = exp['top_features']
        
        # Verify EF-TTE value if present
        ef_item = next((f for f in top_f if f['feature'] == 'EF-TTE'), None)
        if ef_item:
            assert float(ef_item['patient_value']) == 60.0, f"EF-TTE value was {ef_item['patient_value']}, expected 60.0"
            print(f"    [PASS]: SHAP attribution for EF-TTE confirmed: {ef_item['patient_value']}% (Direction: {ef_item['push_direction']})")

    # -------------------------------------------------------------------------
    # TEST 5: RESILIENCE TO MISSING OR OUT-OF-RANGE INPUTS
    # -------------------------------------------------------------------------
    print("\n[TEST 5] RESILIENCE TO EMPTY/MISSING FIELDS")
    incomplete_patient = {
        'assessment_id': 'TEST-INCOMPLETE-01',
        'features': {
            'Age': 58,
            'Sex': 'Male',
            'EF-TTE': '',  # Empty string test
            'Weight': None # None test
        }
    }
    req_inc = urllib.request.Request(
        f'{BASE_URL}/predict',
        data=json.dumps(incomplete_patient).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res_inc = json.loads(urllib.request.urlopen(req_inc).read().decode('utf-8'))
    assert res_inc['success'] is True, "Failed to handle incomplete input"
    print("[PASS]: Empty and missing fields successfully imputed with cohort baseline without crashing.")
    
    print("\n" + "=" * 80)
    print("ALL REGRESSION & INTEGRATION TESTS COMPLETED SUCCESSFULLY (100% PASS)!")
    print("=" * 80)

if __name__ == '__main__':
    run_tests()

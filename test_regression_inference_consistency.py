import urllib.request
import json

BASE_URL = 'http://localhost:5000/api'

def test_inference_consistency():
    print("=========================================================================")
    print("REGRESSION TEST: PATIENT DATA & INFERENCE CONSISTENCY (EF-TTE TEST)")
    print("=========================================================================")

    # Test Case 1: Patient with EF-TTE = 60%
    patient_60 = {
        'assessment_id': 'TEST-PATIENT-EF60',
        'features': {
            'Age': 55, 'Sex': 'Male', 'Weight': 76, 'Length': 175, 'BMI': 24.8,
            'BP': 125, 'PR': 72, 'DM': 0, 'HTN': 1, 'Current Smoker': 0, 'EX-Smoker': 0,
            'FH': 0, 'Obesity': 'N', 'CRF': 'N', 'CVA': 'N', 'Airway disease': 'N',
            'Thyroid Disease': 'N', 'CHF': 'N', 'DLP': 'N', 'Edema': 0,
            'Weak Peripheral Pulse': 'N', 'Lung rales': 'N', 'Systolic Murmur': 'N',
            'Diastolic Murmur': 'N', 'Typical Chest Pain': 1, 'Dyspnea': 'N',
            'Function Class': 1, 'Atypical': 'N', 'Nonanginal': 'N', 'LowTH Ang': 'N',
            'Q Wave': 0, 'St Elevation': 0, 'St Depression': 0, 'Tinversion': 0,
            'LVH': 'N', 'Poor R Progression': 'N', 'BBB': 'N', 'FBS': 102, 'CR': 0.9,
            'TG': 150, 'LDL': 115, 'HDL': 44, 'BUN': 15, 'ESR': 14, 'HB': 14.2, 'K': 4.3,
            'Na': 141, 'WBC': 6800, 'Lymph': 32, 'Neut': 58, 'PLT': 235,
            'EF-TTE': 60,  # <-- Target test value
            'Region RWMA': 0, 'VHD': 'N'
        }
    }

    # 1. Test Prediction Endpoint
    req_pred = urllib.request.Request(
        f'{BASE_URL}/predict',
        data=json.dumps(patient_60).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res_pred = urllib.request.urlopen(req_pred)
    pred_data = json.loads(res_pred.read().decode('utf-8'))
    
    assert pred_data['success'] is True, "Prediction call failed"
    assert 'predictions' in pred_data, "Predictions missing"
    assert set(pred_data['predictions'].keys()) == {'CAD', 'LAD', 'LCX', 'RCA'}, "Target mismatch"
    print("PASS: /api/predict returned valid predictions for all 4 targets.")
    print(f"      Assessment ID returned: {pred_data.get('assessment_id')}")

    # 2. Test Explain Endpoint for all 4 targets
    for target in ['CAD', 'LAD', 'LCX', 'RCA']:
        req_exp = urllib.request.Request(
            f'{BASE_URL}/explain',
            data=json.dumps({
                'assessment_id': 'TEST-PATIENT-EF60',
                'features': patient_60['features'],
                'target': target,
                'n_top': 10
            }).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        res_exp = urllib.request.urlopen(req_exp)
        exp_data = json.loads(res_exp.read().decode('utf-8'))
        
        assert exp_data['success'] is True, f"Explain call failed for {target}"
        explanation = exp_data['explanation']
        top_features = explanation['top_features']
        
        # Search for EF-TTE in top features or all evaluated features
        ef_item = next((f for f in top_features if f['feature'] == 'EF-TTE'), None)
        if ef_item:
            print(f"PASS [{target}]: EF-TTE found in top SHAP attributions.")
            print(f"      Reported patient_value: {ef_item['patient_value']} {ef_item['unit']}")
            assert float(ef_item['patient_value']) == 60.0, f"Expected EF-TTE=60, got {ef_item['patient_value']}"
        else:
            print(f"INFO [{target}]: EF-TTE evaluated among {explanation['total_features_evaluated']} features.")

    # Test Case 2: Immediately submit second patient with EF-TTE = 35%
    patient_35 = {
        'assessment_id': 'TEST-PATIENT-EF35',
        'features': { **patient_60['features'], 'EF-TTE': 35 }
    }
    req_exp35 = urllib.request.Request(
        f'{BASE_URL}/explain',
        data=json.dumps({
            'assessment_id': 'TEST-PATIENT-EF35',
            'features': patient_35['features'],
            'target': 'LAD',
            'n_top': 10
        }).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res_exp35 = urllib.request.urlopen(req_exp35)
    exp35_data = json.loads(res_exp35.read().decode('utf-8'))
    ef35_item = next((f for f in exp35_data['explanation']['top_features'] if f['feature'] == 'EF-TTE'), None)
    
    if ef35_item:
        print(f"PASS [Second Patient]: EF-TTE correctly reflects updated patient value: {ef35_item['patient_value']}")
        assert float(ef35_item['patient_value']) == 35.0, f"Expected EF-TTE=35, got {ef35_item['patient_value']}"
    
    print("\nALL INFERENCE CONSISTENCY TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_inference_consistency()

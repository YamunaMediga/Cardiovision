import json
from backend.app import app

client = app.test_client()

# Test /api/health
res = client.get('/api/health')
print('Health status:', res.status_code, res.get_json())

# Test /api/patients
res = client.get('/api/patients')
pats = res.get_json()
print('Patients count:', pats['count'], pats['patients'][0]['patient_id'])

# Test /api/predict with patient 0
pat0 = pats['patients'][0]
res = client.post('/api/predict', json={'features': pat0['features']})
preds = res.get_json()
print('Prediction result for pat 0:')
for k, v in preds['predictions'].items():
    print(' ', k, 'prob:', v['probability'], 'status:', v['vessel_status'], 'tier:', v['risk_tier'])
print('Ground truth was:', pat0['ground_truth'])

# Test /api/explain for LAD
res = client.post('/api/explain', json={'features': pat0['features'], 'target': 'LAD'})
exp = res.get_json()
print('Explain LAD success! Top risk drivers:', len(exp['explanation']['top_risk_drivers']), 'Top protective:', len(exp['explanation']['top_protective_factors']))
for f in exp['explanation']['top_risk_drivers'][:3]:
    print('  +Driver:', f['feature'], f['patient_value'], f['unit'], f['shap_value'])

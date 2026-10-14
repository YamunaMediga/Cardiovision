import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add root directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, '..'))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from backend.model_service import ModelService

app = Flask(__name__)
CORS(app)

# Initialize ModelService
print("Starting CardioVision Backend Service with validated pipelines...")
service = ModelService(base_dir=parent_dir)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'CardioVision AI Prediction & Visualization API',
        'track': 'Track A: Cardiovascular Risk Visualization & Prediction',
        'models_loaded': list(service.models.keys()),
        'target_leakage_prevented': True
    })

@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    return jsonify(service.metadata)

@app.route('/api/patients', methods=['GET'])
def get_patients():
    return jsonify({
        'count': len(service.test_patients),
        'patients': service.test_patients
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.get_json() or {}
    patient_features = data.get('features', data)
    thresholds = data.get('thresholds', {'low': 0.35, 'high': 0.65})
    assessment_id = data.get('assessment_id', None)
    
    try:
        res = service.predict(patient_features, thresholds=thresholds, assessment_id=assessment_id)
        return jsonify({
            'success': True,
            'assessment_id': assessment_id,
            'predictions': res['predictions'],
            'thresholds_used': thresholds,
            'disclaimer': 'CardioVision is an experimental decision-support and educational prototype, not a substitute for formal diagnostic imaging or clinical assessment.'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/explain', methods=['POST'])
def explain():
    data = request.get_json() or {}
    patient_features = data.get('features', data)
    target = data.get('target', 'LAD')
    n_top = int(data.get('n_top', 8))
    assessment_id = data.get('assessment_id', None)
    
    if target not in ['CAD', 'LAD', 'LCX', 'RCA']:
        return jsonify({'success': False, 'error': f'Invalid target vessel: {target}. Must be CAD, LAD, LCX, or RCA'}), 400
        
    try:
        explanation = service.explain(patient_features, target=target, n_top=n_top, assessment_id=assessment_id)
        return jsonify({
            'success': True,
            'assessment_id': assessment_id,
            'target': target,
            'explanation': explanation
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/explain/global', methods=['GET'])
def explain_global():
    target = request.args.get('target', None)
    global_shap = service.metadata.get('global_shap', {})
    if target:
        if target in global_shap:
            return jsonify({'target': target, 'importance': global_shap[target]})
        return jsonify({'error': f'Invalid target: {target}'}), 400
    return jsonify({'global_shap': global_shap})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"CardioVision backend listening on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)

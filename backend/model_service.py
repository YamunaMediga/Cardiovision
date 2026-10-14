import os
import json
import pickle
import joblib
import numpy as np
import pandas as pd
import shap

class ModelService:
    def __init__(self, base_dir='.'):
        self.base_dir = base_dir
        self.data_dir = os.path.join(base_dir, 'data')
        self.models_dir = os.path.join(base_dir, 'models')
        
        # 1. Load metadata & test patients
        with open(os.path.join(self.data_dir, 'metadata.json'), 'r') as f:
            self.metadata = json.load(f)
            
        with open(os.path.join(self.data_dir, 'test_patients.json'), 'r') as f:
            self.test_patients = json.load(f)
            
        # 2. Load dataset checkpoint
        with open(os.path.join(self.data_dir, 'cardiovision_checkpoint.pkl'), 'rb') as f:
            self.checkpoint = pickle.load(f)
            
        # 3. Load validated unified pipelines
        print("Loading validated CardioVision pipelines...")
        self.models = {
            'CAD': joblib.load(os.path.join(self.models_dir, 'cardiovision_CAD_pipeline.joblib')),
            'LAD': joblib.load(os.path.join(self.models_dir, 'cardiovision_LAD_pipeline.joblib')),
            'LCX': joblib.load(os.path.join(self.models_dir, 'cardiovision_LCX_pipeline.joblib')),
            'RCA': joblib.load(os.path.join(self.models_dir, 'cardiovision_RCA_pipeline.joblib'))
        }
        
        # 4. Extract preprocessor and feature schema
        self.preprocessor = self.models['CAD'].named_steps['preprocessor']
        self.feature_names = list(self.checkpoint['X_train'].columns)
        self.trans_feature_names = self.preprocessor.get_feature_names_out().tolist()
        
        # 5. Initialize exact, fast SHAP explainers
        print("Initializing exact SHAP LinearExplainer and TreeExplainers...")
        X_train_trans = self.preprocessor.transform(self.checkpoint['X_train'])
        self.masker = shap.maskers.Independent(X_train_trans, max_samples=150)
        
        # CAD is Linear (L1 LogisticRegression) -> LinearExplainer
        self.cad_explainer = shap.LinearExplainer(self.models['CAD'].named_steps['model'], self.masker)
        # LAD, LCX are Random Forest -> TreeExplainer
        self.lad_explainer = shap.TreeExplainer(self.models['LAD'].named_steps['model'])
        self.lcx_explainer = shap.TreeExplainer(self.models['LCX'].named_steps['model'])
        # RCA is XGBoost -> TreeExplainer
        self.rca_explainer = shap.TreeExplainer(self.models['RCA'].named_steps['model'])
        
        print("ModelService ready with zero-leakage validated pipelines!")

    def prepare_dataframe(self, input_data):
        """Converts raw input dict or DataFrame to strictly aligned feature DataFrame with robust types."""
        if isinstance(input_data, dict):
            row = {}
            for col in self.feature_names:
                meta = self.metadata['features'].get(col, {})
                col_type = meta.get('type', 'numeric')
                default_val = meta.get('default', 0)
                raw_val = input_data.get(col, default_val)
                
                # Check for empty string, None, or whitespace
                if raw_val is None or (isinstance(raw_val, str) and raw_val.strip() == ''):
                    raw_val = default_val
                    
                if col_type == 'numeric':
                    try:
                        row[col] = float(raw_val)
                    except (ValueError, TypeError):
                        row[col] = float(default_val)
                elif col_type == 'binary':
                    try:
                        row[col] = int(raw_val)
                    except (ValueError, TypeError):
                        row[col] = int(default_val)
                else:
                    row[col] = str(raw_val).strip()
            df = pd.DataFrame([row], columns=self.feature_names)
        elif isinstance(input_data, pd.DataFrame):
            df = input_data[self.feature_names].copy()
        else:
            df = pd.DataFrame(input_data, columns=self.feature_names)
        return df

    def predict(self, input_data, thresholds=None, assessment_id=None):
        """Predicts CAD, LAD, LCX, RCA probabilities and statuses with calibrated decisions."""
        if thresholds is None:
            thresholds = {'low': 0.35, 'high': 0.65}
            
        df = self.prepare_dataframe(input_data)
        results = {}
        
        for target in ['CAD', 'LAD', 'LCX', 'RCA']:
            model = self.models[target]
            prob = float(model.predict_proba(df)[0, 1])
            pred_class = int(prob >= 0.5)
            
            # Risk stratification tier
            if prob < thresholds['low']:
                risk_tier = 'Low Stenosis Risk / Normal'
                vessel_status = 'normal'
            elif prob <= thresholds['high']:
                risk_tier = 'Intermediate / Borderline Stenosis'
                vessel_status = 'borderline'
            else:
                risk_tier = 'High Stenosis Risk / Significant Narrowing'
                vessel_status = 'stenosis'
                
            eval_meta = self.metadata['evaluation'].get(target, {})
            results[target] = {
                'probability': round(prob, 4),
                'probability_percent': round(prob * 100, 1),
                'predicted_class': pred_class,
                'class_label': 'Significant Disease / Stenosis' if pred_class == 1 else 'Normal / Non-significant',
                'risk_tier': risk_tier,
                'vessel_status': vessel_status,
                'algorithm': eval_meta.get('algorithm', target),
                'metrics': {
                    'accuracy': eval_meta.get('accuracy', 0.0),
                    'balanced_accuracy': eval_meta.get('balanced_accuracy', 0.0),
                    'roc_auc': eval_meta.get('roc_auc', 0.0),
                    'f1_score': eval_meta.get('f1_score', 0.0),
                    'sensitivity': eval_meta.get('sensitivity_recall', 0.0),
                    'specificity': eval_meta.get('specificity', 0.0),
                    'brier_score': eval_meta.get('brier_score', 0.0)
                }
            }
            
        return {
            'assessment_id': assessment_id,
            'predictions': results
        }

    def explain(self, input_data, target='LAD', n_top=8, assessment_id=None):
        """Calculates exact local SHAP explanation for the patient record."""
        df = self.prepare_dataframe(input_data)
        X_trans = self.preprocessor.transform(df)
        
        if target == 'CAD':
            sv = self.cad_explainer.shap_values(X_trans)
            shap_row = sv[0] if len(sv.shape) == 2 else sv
        elif target == 'LAD':
            sv = self.lad_explainer.shap_values(X_trans)
            if isinstance(sv, list):
                shap_row = sv[1][0]
            elif len(sv.shape) == 3:
                shap_row = sv[0, :, 1]
            else:
                shap_row = sv[0]
        elif target == 'LCX':
            sv = self.lcx_explainer.shap_values(X_trans)
            if isinstance(sv, list):
                shap_row = sv[1][0]
            elif len(sv.shape) == 3:
                shap_row = sv[0, :, 1]
            else:
                shap_row = sv[0]
        elif target == 'RCA':
            sv = self.rca_explainer.shap_values(X_trans)
            shap_row = sv[0] if len(sv.shape) == 2 else sv
        else:
            raise ValueError(f"Unknown target: {target}")
                
        # Map transformed feature SHAP back to physiological features
        transformed_attributions = []
        feature_attributions = {}
        
        for idx, (tname, sval) in enumerate(zip(self.trans_feature_names, shap_row)):
            sval_float = float(sval)
            transformed_attributions.append({
                'transformed_feature': tname,
                'shap_value': round(sval_float, 4)
            })
            
            # Extract root feature name
            root_name = tname.replace('num__', '').replace('cat__', '').split('_')[0]
            if root_name not in feature_attributions:
                feature_attributions[root_name] = 0.0
            feature_attributions[root_name] += sval_float

        # Get exact patient values submitted for this assessment
        patient_raw_vals = df.iloc[0].to_dict()
        
        # Build ranked feature explanations
        explained_features = []
        for feat, total_shap in feature_attributions.items():
            meta = self.metadata['features'].get(feat, {})
            pval = patient_raw_vals.get(feat, '')
            push_dir = 'Increases Risk (+)' if total_shap > 0 else 'Lowers Risk (-)'
            
            explained_features.append({
                'feature': feat,
                'category': meta.get('category', 'General'),
                'description': meta.get('desc', feat),
                'patient_value': pval,
                'unit': meta.get('unit', ''),
                'shap_value': round(total_shap, 4),
                'abs_shap': abs(round(total_shap, 4)),
                'push_direction': push_dir,
                'direction_sign': 1 if total_shap > 0 else -1
            })
            
        explained_features.sort(key=lambda x: x['abs_shap'], reverse=True)
        
        top_positive = [f for f in explained_features if f['shap_value'] > 0][:n_top]
        top_negative = [f for f in explained_features if f['shap_value'] < 0][:n_top]
        
        eval_meta = self.metadata['evaluation'].get(target, {})
        return {
            'assessment_id': assessment_id,
            'target': target,
            'algorithm': eval_meta.get('algorithm', target),
            'top_features': explained_features[:n_top * 2],
            'top_risk_drivers': top_positive,
            'top_protective_factors': top_negative,
            'total_features_evaluated': len(explained_features),
            'disclaimer': 'SHAP values reflect statistical local feature attribution within the trained model, not biological causation or formal medical diagnosis.'
        }

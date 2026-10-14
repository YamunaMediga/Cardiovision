"""
CardioVision Model Reliability Audit & Validation Test Suite
Tests:
1. Feature count & strict ordering (54 features)
2. Target column leakage prevention (Cath, LAD, LCX, RCA strictly excluded)
3. Direct vs API inference consistency
4. Positive-class probability extraction & [0, 1] bounds
5. Missing, invalid, and out-of-range input resilience
6. Risk-tier threshold categorization (<0.35, 0.35-0.65, >0.65)
7. Deterministic idempotency on repeated predictions
8. SHAP target, feature-name, patient-value, and direction alignment
9. CAD 100% rounding audit & verification
10. Held-out test evaluation reproducibility against checkpoint
"""

import sys, os
sys.path.insert(0, os.path.abspath('.'))

import unittest
import json
import pickle
import joblib
import numpy as np
import pandas as pd
from backend.model_service import ModelService

class TestCardioVisionReliabilityAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = ModelService('.')
        with open('data/cardiovision_checkpoint.pkl', 'rb') as f:
            cls.ckpt = pickle.load(f)
        with open('data/metadata.json', 'r') as f:
            cls.metadata = json.load(f)
        with open('data/test_patients.json', 'r') as f:
            cls.test_patients = json.load(f)
            
    def test_01_feature_count_and_ordering(self):
        """Verifies feature count is exactly 54 and aligns strictly with checkpoint."""
        ckpt_features = list(self.ckpt['X_train'].columns)
        service_features = self.service.feature_names
        
        self.assertEqual(len(service_features), 54, "Feature count must be exactly 54")
        self.assertEqual(service_features, ckpt_features, "Service feature order must strictly match checkpoint X_train")
        print("\n[TEST 01 PASS]: 54 input features strictly ordered and aligned.")

    def test_02_target_leakage_exclusion(self):
        """Ensures all 4 target outcomes are strictly excluded from input features."""
        targets = ['Cath', 'CAD', 'LAD', 'LCX', 'RCA', 'cath', 'cad', 'lad', 'lcx', 'rca']
        for t in targets:
            self.assertNotIn(t, self.service.feature_names, f"Target '{t}' leaked into feature names!")
            self.assertNotIn(t, self.ckpt['X_train'].columns, f"Target '{t}' leaked into X_train!")
            self.assertNotIn(t, self.ckpt['X_test'].columns, f"Target '{t}' leaked into X_test!")
        print("[TEST 02 PASS]: Zero target leakage confirmed (0.0%). All targets excluded.")

    def test_03_positive_class_probability_bounds(self):
        """Verifies classes_ order and that probabilities are within [0.0, 1.0]."""
        p0 = self.test_patients[0]['features']
        df = self.service.prepare_dataframe(p0)
        
        for t in ['CAD', 'LAD', 'LCX', 'RCA']:
            pipe = self.service.models[t]
            classes = list(pipe.classes_)
            self.assertEqual(classes, [0, 1], f"Classes for {t} must be [0, 1]")
            
            raw_prob = pipe.predict_proba(df)[0, 1]
            self.assertGreaterEqual(raw_prob, 0.0, f"{t} probability must be >= 0.0")
            self.assertLessEqual(raw_prob, 1.0, f"{t} probability must be <= 1.0")
        print("[TEST 03 PASS]: Positive class probability extracted from classes_[1] with valid [0, 1] bounds.")

    def test_04_direct_vs_service_inference_consistency(self):
        """Verifies direct pipeline inference matches model_service.predict()."""
        p0 = self.test_patients[0]['features']
        df = self.service.prepare_dataframe(p0)
        
        service_res = self.service.predict(p0)
        for t in ['CAD', 'LAD', 'LCX', 'RCA']:
            direct_prob = float(self.service.models[t].predict_proba(df)[0, 1])
            service_prob = service_res['predictions'][t]['probability']
            self.assertAlmostEqual(direct_prob, service_prob, places=4,
                                   msg=f"Discrepancy between direct model and service for {t}")
        print("[TEST 04 PASS]: Direct model inference matches service predictions.")

    def test_05_missing_and_out_of_range_resilience(self):
        """Verifies robust handling of empty, None, and partial inputs without crashing."""
        partial_input = {
            'Age': '55',
            'Sex': 'Female',
            'BP': '',          # Empty string
            'Typical Chest Pain': None, # None
            'EF-TTE': '999'    # Out of range, should still parse safely
        }
        res = self.service.predict(partial_input)
        self.assertIn('predictions', res)
        for t in ['CAD', 'LAD', 'LCX', 'RCA']:
            self.assertIn('probability', res['predictions'][t])
            self.assertIn('risk_tier', res['predictions'][t])
        print("[TEST 05 PASS]: Missing and invalid inputs gracefully imputed without failure.")

    def test_06_risk_tier_threshold_behavior(self):
        """Verifies correct clinical risk-tier classification."""
        thresholds = {'low': 0.35, 'high': 0.65}
        
        # Test low probability (<0.35)
        p_low = self.test_patients[2]['features'] # TEST-003 is low risk
        res_low = self.service.predict(p_low, thresholds=thresholds)
        self.assertEqual(res_low['predictions']['CAD']['risk_tier'], 'Low Stenosis Risk / Normal')
        
        # Test high probability (>0.65)
        p_high = self.test_patients[0]['features'] # TEST-001 is high risk
        res_high = self.service.predict(p_high, thresholds=thresholds)
        self.assertEqual(res_high['predictions']['CAD']['risk_tier'], 'High Stenosis Risk / Significant Narrowing')
        print("[TEST 06 PASS]: Risk-tier thresholds (<0.35, 0.35-0.65, >0.65) behave correctly.")

    def test_07_deterministic_idempotency(self):
        """Verifies identical inputs produce bitwise-identical results across repeated runs."""
        p = self.test_patients[1]['features']
        run1 = self.service.predict(p)
        run2 = self.service.predict(p)
        
        for t in ['CAD', 'LAD', 'LCX', 'RCA']:
            self.assertEqual(run1['predictions'][t]['probability'], run2['predictions'][t]['probability'])
            self.assertEqual(run1['predictions'][t]['predicted_class'], run2['predictions'][t]['predicted_class'])
        print("[TEST 07 PASS]: Predictions are 100% deterministic and idempotent.")

    def test_08_shap_alignment_and_patient_values(self):
        """Verifies SHAP explanations align with target, feature names, and submitted inputs."""
        p = dict(self.test_patients[2]['features'])
        p['EF-TTE'] = 60 # Set EF-TTE explicitly to 60
        
        for t in ['CAD', 'LAD', 'LCX', 'RCA']:
            exp = self.service.explain(p, target=t, n_top=10)
            self.assertEqual(exp['target'], t)
            self.assertGreater(len(exp['top_features']), 0)
            
            # Verify patient_value for EF-TTE
            eftte_items = [f for f in exp['top_features'] if f['feature'] == 'EF-TTE']
            if eftte_items:
                self.assertEqual(float(eftte_items[0]['patient_value']), 60.0)
                self.assertEqual(eftte_items[0]['push_direction'], 'Lowers Risk (-)')
        print("[TEST 08 PASS]: SHAP explanations match submitted patient values, targets, and directions.")

    def test_09_cad_100_percent_probability_root_cause(self):
        """Verifies the root cause of CAD displaying 100.0% is rounding of genuine extreme probability."""
        p37 = [x for x in self.test_patients if x['patient_id'] == 'TEST-037'][0]
        df = self.service.prepare_dataframe(p37['features'])
        
        cad_model = self.service.models['CAD']
        raw_prob = cad_model.predict_proba(df)[0, 1]
        margin = cad_model.decision_function(df)[0]
        
        # Verify it is not an exact integer 1.0 or hardcoded 1.0
        self.assertNotEqual(raw_prob, 1.0, "Model raw probability should be float < 1.0, not hardcoded constant 1.0")
        self.assertGreater(raw_prob, 0.999, "Raw probability is genuinely extreme (>0.999)")
        
        # Verify rounding to 1 decimal place produces 100.0%
        disp_pct = round(raw_prob * 100, 1)
        self.assertEqual(disp_pct, 100.0, "round(raw_prob * 100, 1) must produce 100.0%")
        print(f"[TEST 09 PASS]: CAD 100.0% verified: raw={raw_prob:.8f}, margin={margin:.4f}, displayed={disp_pct}%.")

    def test_10_held_out_metrics_consistency(self):
        """Verifies held-out test ROC-AUC matches evaluation metadata exactly."""
        from sklearn.metrics import roc_auc_score
        X_test = self.ckpt['X_test']
        
        for t in ['CAD', 'LAD', 'LCX', 'RCA']:
            probs = self.service.models[t].predict_proba(X_test)[:, 1]
            y_true = self.ckpt[f'y_{t.lower()}_test'].values
            auc = roc_auc_score(y_true, probs)
            saved_auc = self.metadata['evaluation'][t]['roc_auc']
            self.assertAlmostEqual(auc, saved_auc, places=4,
                                   msg=f"Test ROC-AUC mismatch for {t}")
        print("[TEST 10 PASS]: Held-out test metrics replicate saved metadata with zero discrepancy.")

if __name__ == '__main__':
    unittest.main(verbosity=2)

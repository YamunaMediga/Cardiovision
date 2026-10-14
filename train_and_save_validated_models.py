import os
import shutil
import json
import pickle
import joblib
import numpy as np
import pandas as pd
import sklearn
import xgboost
import shap

from sklearn.model_selection import StratifiedKFold, RepeatedStratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, roc_auc_score,
    f1_score, recall_score, precision_score, brier_score_loss, confusion_matrix
)

def create_preprocessor(X):
    num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = X.select_dtypes(exclude=[np.number]).columns.tolist()
    
    num_pipe = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    cat_pipe = Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    
    pre = ColumnTransformer([
        ('num', num_pipe, num_cols),
        ('cat', cat_pipe, cat_cols)
    ])
    return pre

def main():
    print("=========================================================================")
    print("TRAINING AND VALIDATING NEW CARDIOVISION ML PIPELINES")
    print("=========================================================================")
    
    # 1. Backup existing models
    backup_dir = 'models/backup_v1'
    os.makedirs(backup_dir, exist_ok=True)
    for f in os.listdir('models'):
        if f.endswith('.joblib'):
            src = os.path.join('models', f)
            dst = os.path.join(backup_dir, f)
            if not os.path.exists(dst):
                shutil.copy2(src, dst)
    print(f"Backed up existing models to {backup_dir}")

    # 2. Load dataset checkpoint
    with open('data/cardiovision_checkpoint.pkl', 'rb') as f:
        ckpt = pickle.load(f)
        
    X_train = ckpt['X_train']
    X_test = ckpt['X_test']
    
    y_train = {
        'CAD': ckpt['y_cad_train'],
        'LAD': ckpt['y_lad_train'],
        'LCX': ckpt['y_lcx_train'],
        'RCA': ckpt['y_rca_train']
    }
    y_test = {
        'CAD': ckpt['y_cad_test'],
        'LAD': ckpt['y_lad_test'],
        'LCX': ckpt['y_lcx_test'],
        'RCA': ckpt['y_rca_test']
    }
    
    print(f"Cohort partitions: Train N={len(X_train)} (80%), Holdout Test N={len(X_test)} (20%)")
    
    # 3. Define the optimal validated models
    scale_pos_rca = float(np.sum(y_train['RCA'] == 0) / np.sum(y_train['RCA'] == 1)) # 1.574
    
    models_def = {
        'CAD': {
            'name': 'L1-Regularized Logistic Regression',
            'type': 'linear',
            'estimator': LogisticRegression(
                C=0.3, penalty='l1', solver='saga', class_weight='balanced',
                max_iter=2000, random_state=42
            )
        },
        'LAD': {
            'name': 'Balanced Random Forest (Depth 5)',
            'type': 'tree',
            'estimator': RandomForestClassifier(
                n_estimators=250, max_depth=5, min_samples_leaf=2,
                class_weight='balanced', random_state=42
            )
        },
        'LCX': {
            'name': 'Balanced Random Forest (Depth 5)',
            'type': 'tree',
            'estimator': RandomForestClassifier(
                n_estimators=200, max_depth=5, min_samples_leaf=3,
                class_weight='balanced', random_state=42
            )
        },
        'RCA': {
            'name': 'Regularized Light XGBoost',
            'type': 'tree',
            'estimator': XGBClassifier(
                n_estimators=80, max_depth=2, learning_rate=0.04,
                scale_pos_weight=scale_pos_rca, reg_alpha=0.8, reg_lambda=1.0,
                eval_metric='logloss', random_state=42
            )
        }
    }
    
    # Fit unified preprocessor on X_train only
    preprocessor = create_preprocessor(X_train)
    preprocessor.fit(X_train)
    trans_feature_names = preprocessor.get_feature_names_out().tolist()
    
    # Stratified cross-validation strategies
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    rskf = RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=42)
    
    evaluation_metadata = {}
    saved_pipelines = {}
    
    for target in ['CAD', 'LAD', 'LCX', 'RCA']:
        m_info = models_def[target]
        est = m_info['estimator']
        y_tr = y_train[target]
        y_te = y_test[target]
        
        # Build complete Pipeline
        pipe = Pipeline([
            ('preprocessor', create_preprocessor(X_train)),
            ('model', est)
        ])
        
        # Cross-validation on X_train (5-fold)
        cv5 = cross_validate(
            pipe, X_train, y_tr, cv=skf,
            scoring=['accuracy', 'balanced_accuracy', 'roc_auc', 'recall', 'f1', 'precision']
        )
        
        # Repeated cross-validation (5x5 = 25 evaluations)
        cv25 = cross_validate(
            pipe, X_train, y_tr, cv=rskf,
            scoring=['accuracy', 'balanced_accuracy', 'roc_auc', 'recall', 'f1']
        )
        
        # Fit on full training set
        pipe.fit(X_train, y_tr)
        saved_pipelines[target] = pipe
        
        # Evaluate on untouched holdout test set (N=61)
        y_te_pred = pipe.predict(X_test)
        y_te_prob = pipe.predict_proba(X_test)[:, 1]
        
        acc = float(accuracy_score(y_te, y_te_pred))
        bal = float(balanced_accuracy_score(y_te, y_te_pred))
        auc = float(roc_auc_score(y_te, y_te_prob))
        sens = float(recall_score(y_te, y_te_pred))
        prec = float(precision_score(y_te, y_te_pred, zero_division=0))
        f1 = float(f1_score(y_te, y_te_pred, zero_division=0))
        brier = float(brier_score_loss(y_te, y_te_prob))
        cm = confusion_matrix(y_te, y_te_pred)
        tn, fp, fn, tp = [int(v) for v in cm.ravel()]
        spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
        
        evaluation_metadata[target] = {
            'algorithm': m_info['name'],
            'model_type': m_info['type'],
            'accuracy': acc,
            'balanced_accuracy': bal,
            'precision': prec,
            'sensitivity_recall': sens,
            'specificity': spec,
            'f1_score': f1,
            'roc_auc': auc,
            'brier_score': brier,
            'confusion_matrix': {
                'tn': tn, 'fp': fp, 'fn': fn, 'tp': tp,
                'true_positive': tp, 'false_positive': fp,
                'false_negative': fn, 'true_negative': tn,
                'total': int(len(y_te))
            },
            'cv_5fold': {
                'accuracy_mean': float(cv5['test_accuracy'].mean()),
                'accuracy_std': float(cv5['test_accuracy'].std()),
                'roc_auc_mean': float(cv5['test_roc_auc'].mean()),
                'roc_auc_std': float(cv5['test_roc_auc'].std()),
                'balanced_accuracy_mean': float(cv5['test_balanced_accuracy'].mean()),
                'sensitivity_mean': float(cv5['test_recall'].mean()),
                'f1_mean': float(cv5['test_f1'].mean())
            },
            'cv_repeated_25fold': {
                'accuracy_mean': float(cv25['test_accuracy'].mean()),
                'accuracy_std': float(cv25['test_accuracy'].std()),
                'roc_auc_mean': float(cv25['test_roc_auc'].mean()),
                'roc_auc_std': float(cv25['test_roc_auc'].std()),
                'balanced_accuracy_mean': float(cv25['test_balanced_accuracy'].mean()),
                'sensitivity_mean': float(cv25['test_recall'].mean()),
                'f1_mean': float(cv25['test_f1'].mean())
            },
            'test_support': {
                'class_0_normal': int(np.sum(y_te == 0)),
                'class_1_stenosis': int(np.sum(y_te == 1))
            }
        }
        
        print(f"\nTarget {target} ({m_info['name']}):")
        print(f"  Holdout Test (N=61): Acc={acc:.4f} ({acc*100:.1f}%), AUC={auc:.4f}, Sens={sens:.4f}, Spec={spec:.4f}, F1={f1:.4f}, Brier={brier:.4f}")
        print(f"  Confusion Matrix:    TP={tp}, FP={fp}, FN={fn}, TN={tn}")
        print(f"  CV 25-fold Mean:     Acc={cv25['test_accuracy'].mean():.4f}±{cv25['test_accuracy'].std():.3f}, AUC={cv25['test_roc_auc'].mean():.4f}±{cv25['test_roc_auc'].std():.3f}, Sens={cv25['test_recall'].mean():.4f}")
        
        # Save model pipeline
        save_path = f"models/cardiovision_{target}_{m_info['type'].capitalize()}.joblib"
        # Also save with standard predictable filenames
        joblib.dump(pipe, f"models/cardiovision_{target}_pipeline.joblib")
        print(f"  Saved pipeline to models/cardiovision_{target}_pipeline.joblib")

    # 4. Compute Global SHAP feature importances on test cohort
    print("\nComputing Global SHAP feature importances on holdout cohort...")
    X_train_trans = preprocessor.transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    masker = shap.maskers.Independent(X_train_trans, max_samples=150)
    
    global_shap = {}
    
    # Load existing feature metadata
    with open('data/metadata.json', 'r') as f:
        existing_meta = json.load(f)
    feature_meta = existing_meta.get('features', {})
    
    for target in ['CAD', 'LAD', 'LCX', 'RCA']:
        pipe = saved_pipelines[target]
        model = pipe.named_steps['model']
        m_type = models_def[target]['type']
        
        if m_type == 'linear':
            explainer = shap.LinearExplainer(model, masker)
            sv = explainer.shap_values(X_test_trans)
            mean_abs = np.mean(np.abs(sv), axis=0).tolist()
        else: # tree models
            explainer = shap.TreeExplainer(model)
            sv = explainer.shap_values(X_test_trans)
            if isinstance(sv, list):
                sv_c1 = sv[1]
            elif len(sv.shape) == 3:
                sv_c1 = sv[:, :, 1]
            else:
                sv_c1 = sv
            mean_abs = np.mean(np.abs(sv_c1), axis=0).tolist()
            
        pairs = sorted(zip(trans_feature_names, mean_abs), key=lambda x: x[1], reverse=True)
        orig_map = {}
        for fname, val in pairs:
            orig_col = fname.replace('num__', '').replace('cat__', '').split('_')[0]
            orig_map[orig_col] = orig_map.get(orig_col, 0.0) + float(val)
        sorted_orig = sorted(orig_map.items(), key=lambda x: x[1], reverse=True)
        
        global_shap[target] = {
            'transformed_features': [{'feature': f, 'mean_abs_shap': float(v)} for f, v in pairs[:20]],
            'original_features': [{'feature': f, 'mean_abs_shap': float(v), 'unit': feature_meta.get(f, {}).get('unit', ''), 'desc': feature_meta.get(f, {}).get('desc', '')} for f, v in sorted_orig[:15]]
        }
    print("Global SHAP importances computed.")

    # 5. Save updated metadata.json
    updated_metadata = {
        'total_cohort_size': 303,
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'feature_count': len(X_train.columns),
        'transformed_feature_count': len(trans_feature_names),
        'features': feature_meta,
        'evaluation': evaluation_metadata,
        'target_leakage_prevented': True,
        'excluded_targets': ['Cath', 'LAD', 'LCX', 'RCA'],
        'global_shap': global_shap,
        'pipeline_environment': {
            'scikit_learn_version': sklearn.__version__,
            'xgboost_version': xgboost.__version__,
            'shap_version': shap.__version__,
            'numpy_version': np.__version__,
            'random_seed': 42
        }
    }
    
    with open('data/metadata.json', 'w') as f:
        json.dump(updated_metadata, f, indent=2)
    print("Saved updated data/metadata.json successfully.")

    # 6. Save updated checkpoint with trained models and predictions
    ckpt_updated = ckpt.copy()
    ckpt_updated['best_models'] = {t: models_def[t]['name'] for t in models_def}
    for target in ['CAD', 'LAD', 'LCX', 'RCA']:
        pipe = saved_pipelines[target]
        ckpt_updated[f'{target.lower()}_test_pred'] = pipe.predict(X_test)
        ckpt_updated[f'{target.lower()}_test_prob'] = pipe.predict_proba(X_test)[:, 1]
        
    with open('data/cardiovision_checkpoint.pkl', 'wb') as f:
        pickle.dump(ckpt_updated, f)
    print("Saved updated data/cardiovision_checkpoint.pkl")
    print("Model training and validation complete!")

if __name__ == '__main__':
    main()

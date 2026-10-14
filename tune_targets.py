import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, RepeatedStratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, HistGradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, roc_auc_score,
    f1_score, recall_score, precision_score, brier_score_loss, confusion_matrix
)

def build_preprocessor(X):
    num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = X.select_dtypes(exclude=[np.number]).columns.tolist()
    
    pre = ColumnTransformer([
        ('num', Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ]), num_cols),
        ('cat', Pipeline([
            ('imputer', SimpleImputer(strategy='most_frequent')),
            ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ]), cat_cols)
    ])
    return pre

def tune_and_evaluate(target_name, X_train, y_train, X_test, y_test, candidate_pipes):
    pre = build_preprocessor(X_train)
    rskf = RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=42)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    print(f"\n{'='*75}")
    print(f"EVALUATING CANDIDATES FOR TARGET: {target_name}")
    print(f"Train samples: {len(X_train)} (Pos={np.sum(y_train==1)}, Neg={np.sum(y_train==0)})")
    print(f"Test samples:  {len(X_test)} (Pos={np.sum(y_test==1)}, Neg={np.sum(y_test==0)})")
    print(f"{'='*75}")
    
    results = []
    
    for name, estimator in candidate_pipes.items():
        pipe = Pipeline([
            ('preprocessor', pre),
            ('model', estimator)
        ])
        
        # 1. Repeated 5x5 CV on X_train
        cv_res = cross_validate(
            pipe, X_train, y_train, cv=rskf,
            scoring=['accuracy', 'balanced_accuracy', 'roc_auc', 'recall', 'f1']
        )
        
        cv_acc_m = cv_res['test_accuracy'].mean()
        cv_acc_s = cv_res['test_accuracy'].std()
        cv_bal_m = cv_res['test_balanced_accuracy'].mean()
        cv_auc_m = cv_res['test_roc_auc'].mean()
        cv_auc_s = cv_res['test_roc_auc'].std()
        cv_sens_m = cv_res['test_recall'].mean()
        cv_f1_m = cv_res['test_f1'].mean()
        
        # 2. Fit on full X_train and evaluate on holdout X_test (N=61)
        pipe.fit(X_train, y_train)
        y_test_pred = pipe.predict(X_test)
        y_test_prob = pipe.predict_proba(X_test)[:, 1]
        
        test_acc = accuracy_score(y_test, y_test_pred)
        test_bal = balanced_accuracy_score(y_test, y_test_pred)
        test_auc = roc_auc_score(y_test, y_test_prob)
        test_sens = recall_score(y_test, y_test_pred)
        test_prec = precision_score(y_test, y_test_pred, zero_division=0)
        test_f1 = f1_score(y_test, y_test_pred, zero_division=0)
        test_brier = brier_score_loss(y_test, y_test_prob)
        cm = confusion_matrix(y_test, y_test_pred)
        tn, fp, fn, tp = cm.ravel()
        test_spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        
        results.append({
            'name': name,
            'pipe': pipe,
            'cv_acc': cv_acc_m, 'cv_acc_std': cv_acc_s,
            'cv_bal': cv_bal_m,
            'cv_auc': cv_auc_m, 'cv_auc_std': cv_auc_s,
            'cv_sens': cv_sens_m,
            'cv_f1': cv_f1_m,
            'test_acc': test_acc,
            'test_bal': test_bal,
            'test_auc': test_auc,
            'test_sens': test_sens,
            'test_spec': test_spec,
            'test_prec': test_prec,
            'test_f1': test_f1,
            'test_brier': test_brier,
            'cm': (tn, fp, fn, tp)
        })
        
        print(f"Model: {name:<28}")
        print(f"  CV (25x): Acc={cv_acc_m:.4f}±{cv_acc_s:.3f} | BalAcc={cv_bal_m:.4f} | AUC={cv_auc_m:.4f}±{cv_auc_s:.3f} | Sens={cv_sens_m:.4f} | F1={cv_f1_m:.4f}")
        print(f"  Test:     Acc={test_acc:.4f} ({test_acc*100:.1f}%) | BalAcc={test_bal:.4f} | AUC={test_auc:.4f} | Sens={test_sens:.4f} | Spec={test_spec:.4f} | F1={test_f1:.4f} | Brier={test_brier:.4f}")
        print(f"  CM:       TN={tn}, FP={fp}, FN={fn}, TP={tp}\n")
        
    # Sort by cross-validated ROC-AUC and balanced accuracy
    sorted_res = sorted(results, key=lambda x: (x['cv_auc'] + x['cv_bal']), reverse=True)
    best = sorted_res[0]
    print(f"--> RECOMMENDED OPTIMAL MODEL FOR {target_name}: {best['name']}")
    print(f"    CV AUC: {best['cv_auc']:.4f}, CV BalAcc: {best['cv_bal']:.4f}, Test Acc: {best['test_acc']:.4f}, Test AUC: {best['test_auc']:.4f}, Test Brier: {best['test_brier']:.4f}")
    return sorted_res

def main():
    with open('data/cardiovision_checkpoint.pkl', 'rb') as f:
        ckpt = pickle.load(f)
        
    X_train = ckpt['X_train']
    X_test = ckpt['X_test']
    
    # -------------------------------------------------------------------------
    # TARGET 1: CAD (Cath) - Systemic Multi-vessel CAD
    # -------------------------------------------------------------------------
    cad_candidates = {
        'Baseline_SVC_RBF': SVC(C=1.0, kernel='rbf', gamma='scale', class_weight='balanced', probability=True, random_state=42),
        'Calibrated_SVC_Linear_C01': CalibratedClassifierCV(SVC(C=0.1, kernel='linear', class_weight='balanced', random_state=42), cv=5),
        'Calibrated_SVC_Linear_C02': CalibratedClassifierCV(SVC(C=0.2, kernel='linear', class_weight='balanced', random_state=42), cv=5),
        'LogisticRegression_L1_C03': LogisticRegression(C=0.3, penalty='l1', solver='saga', class_weight='balanced', max_iter=2000, random_state=42),
        'LogisticRegression_L2_C05': LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42),
        'Calibrated_LogReg_C05': CalibratedClassifierCV(LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42), cv=5),
        'RandomForest_Balanced_300': RandomForestClassifier(n_estimators=300, max_depth=6, min_samples_leaf=2, class_weight='balanced', random_state=42),
        'ExtraTrees_Balanced_200': ExtraTreesClassifier(n_estimators=200, max_depth=6, min_samples_leaf=2, class_weight='balanced', random_state=42),
    }
    tune_and_evaluate('CAD', X_train, ckpt['y_cad_train'], X_test, ckpt['y_cad_test'], cad_candidates)
    
    # -------------------------------------------------------------------------
    # TARGET 2: LAD - Left Anterior Descending
    # -------------------------------------------------------------------------
    lad_candidates = {
        'Baseline_RandomForest_300': RandomForestClassifier(n_estimators=300, max_depth=None, min_samples_leaf=1, class_weight='balanced', random_state=42),
        'RandomForest_Tuned_MD5': RandomForestClassifier(n_estimators=250, max_depth=5, min_samples_leaf=2, class_weight='balanced', random_state=42),
        'ExtraTrees_Tuned_MD6': ExtraTreesClassifier(n_estimators=250, max_depth=6, min_samples_leaf=2, class_weight='balanced', random_state=42),
        'SVC_RBF_Tuned_C1': SVC(C=1.0, kernel='rbf', gamma='scale', class_weight='balanced', probability=True, random_state=42),
        'Calibrated_SVC_Linear_C02': CalibratedClassifierCV(SVC(C=0.2, kernel='linear', class_weight='balanced', random_state=42), cv=5),
        'LogisticRegression_L1_C03': LogisticRegression(C=0.3, penalty='l1', solver='saga', class_weight='balanced', max_iter=2000, random_state=42),
        'XGBoost_Light_MD2': XGBClassifier(n_estimators=100, max_depth=2, learning_rate=0.05, reg_alpha=0.5, reg_lambda=1.0, scale_pos_weight=99/143, eval_metric='logloss', random_state=42),
    }
    tune_and_evaluate('LAD', X_train, ckpt['y_lad_train'], X_test, ckpt['y_lad_test'], lad_candidates)
    
    # -------------------------------------------------------------------------
    # TARGET 3: LCX - Left Circumflex
    # -------------------------------------------------------------------------
    scale_pos_lcx = 149 / 93 # 1.60
    lcx_candidates = {
        'Baseline_XGBoost_300': XGBClassifier(colsample_bytree=0.8, learning_rate=0.03, max_depth=3, n_estimators=300, eval_metric='logloss', random_state=42),
        'Calibrated_SVC_Linear_C01': CalibratedClassifierCV(SVC(C=0.1, kernel='linear', class_weight='balanced', random_state=42), cv=5),
        'Calibrated_SVC_Linear_C02': CalibratedClassifierCV(SVC(C=0.2, kernel='linear', class_weight='balanced', random_state=42), cv=5),
        'LogisticRegression_L2_C05': LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42),
        'Calibrated_LogReg_C05': CalibratedClassifierCV(LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42), cv=5),
        'RandomForest_Balanced_200': RandomForestClassifier(n_estimators=200, max_depth=5, min_samples_leaf=3, class_weight='balanced', random_state=42),
        'XGBoost_Balanced_Light': XGBClassifier(n_estimators=80, max_depth=2, learning_rate=0.04, scale_pos_weight=scale_pos_lcx, reg_alpha=1.0, reg_lambda=1.0, eval_metric='logloss', random_state=42),
    }
    tune_and_evaluate('LCX', X_train, ckpt['y_lcx_train'], X_test, ckpt['y_lcx_test'], lcx_candidates)
    
    # -------------------------------------------------------------------------
    # TARGET 4: RCA - Right Coronary Artery
    # -------------------------------------------------------------------------
    scale_pos_rca = 148 / 94 # 1.57
    rca_candidates = {
        'Baseline_SVC_RBF': SVC(C=1.0, kernel='rbf', gamma='scale', class_weight='balanced', probability=True, random_state=42),
        'Calibrated_SVC_Linear_C01': CalibratedClassifierCV(SVC(C=0.1, kernel='linear', class_weight='balanced', random_state=42), cv=5),
        'Calibrated_SVC_Linear_C02': CalibratedClassifierCV(SVC(C=0.2, kernel='linear', class_weight='balanced', random_state=42), cv=5),
        'LogisticRegression_L2_C03': LogisticRegression(C=0.3, class_weight='balanced', max_iter=1000, random_state=42),
        'LogisticRegression_L2_C05': LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42),
        'Calibrated_LogReg_C05': CalibratedClassifierCV(LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42), cv=5),
        'RandomForest_Balanced_200': RandomForestClassifier(n_estimators=200, max_depth=5, min_samples_leaf=3, class_weight='balanced', random_state=42),
        'XGBoost_Balanced_Light': XGBClassifier(n_estimators=80, max_depth=2, learning_rate=0.04, scale_pos_weight=scale_pos_rca, reg_alpha=0.8, reg_lambda=1.0, eval_metric='logloss', random_state=42),
    }
    tune_and_evaluate('RCA', X_train, ckpt['y_rca_train'], X_test, ckpt['y_rca_test'], rca_candidates)

if __name__ == '__main__':
    main()

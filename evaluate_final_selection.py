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
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
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

def main():
    with open('data/cardiovision_checkpoint.pkl', 'rb') as f:
        ckpt = pickle.load(f)
        
    X_train = ckpt['X_train']
    X_test = ckpt['X_test']
    
    pre = build_preprocessor(X_train)
    rskf = RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=42)
    
    # Selected candidate configurations
    configs = {
        'CAD': {
            'L1_LogisticRegression': LogisticRegression(C=0.3, penalty='l1', solver='saga', class_weight='balanced', max_iter=2000, random_state=42),
            'L2_LogisticRegression': LogisticRegression(C=0.5, penalty='l2', class_weight='balanced', max_iter=1000, random_state=42),
            'Tuned_ExtraTrees': ExtraTreesClassifier(n_estimators=200, max_depth=6, min_samples_leaf=2, class_weight='balanced', random_state=42)
        },
        'LAD': {
            'Tuned_RandomForest': RandomForestClassifier(n_estimators=250, max_depth=5, min_samples_leaf=2, class_weight='balanced', random_state=42),
            'Tuned_ExtraTrees': ExtraTreesClassifier(n_estimators=250, max_depth=6, min_samples_leaf=2, class_weight='balanced', random_state=42),
            'L1_LogisticRegression': LogisticRegression(C=0.3, penalty='l1', solver='saga', class_weight='balanced', max_iter=2000, random_state=42)
        },
        'LCX': {
            'Tuned_RandomForest': RandomForestClassifier(n_estimators=200, max_depth=5, min_samples_leaf=3, class_weight='balanced', random_state=42),
            'Light_XGBoost': XGBClassifier(n_estimators=80, max_depth=2, learning_rate=0.04, scale_pos_weight=149/93, reg_alpha=1.0, reg_lambda=1.0, eval_metric='logloss', random_state=42),
            'L2_LogisticRegression': LogisticRegression(C=0.5, penalty='l2', class_weight='balanced', max_iter=1000, random_state=42)
        },
        'RCA': {
            'Light_XGBoost': XGBClassifier(n_estimators=80, max_depth=2, learning_rate=0.04, scale_pos_weight=148/94, reg_alpha=0.8, reg_lambda=1.0, eval_metric='logloss', random_state=42),
            'Tuned_RandomForest': RandomForestClassifier(n_estimators=200, max_depth=5, min_samples_leaf=3, class_weight='balanced', random_state=42),
            'L2_LogisticRegression': LogisticRegression(C=0.3, penalty='l2', class_weight='balanced', max_iter=1000, random_state=42)
        }
    }
    
    y_train_all = {
        'CAD': ckpt['y_cad_train'],
        'LAD': ckpt['y_lad_train'],
        'LCX': ckpt['y_lcx_train'],
        'RCA': ckpt['y_rca_train']
    }
    
    y_test_all = {
        'CAD': ckpt['y_cad_test'],
        'LAD': ckpt['y_lad_test'],
        'LCX': ckpt['y_lcx_test'],
        'RCA': ckpt['y_rca_test']
    }
    
    print("=" * 90)
    print("FINAL MODEL SELECTION: 25-FOLD CV ON TRAIN (N=242) & EVALUATION ON TEST (N=61)")
    print("=" * 90)
    
    for target in ['CAD', 'LAD', 'LCX', 'RCA']:
        y_tr = y_train_all[target]
        y_te = y_test_all[target]
        print(f"\n>>> TARGET: {target} (Train Pos={np.sum(y_tr==1)}, Neg={np.sum(y_tr==0)} | Test Pos={np.sum(y_te==1)}, Neg={np.sum(y_te==0)})")
        
        for m_name, est in configs[target].items():
            pipe = Pipeline([
                ('preprocessor', pre),
                ('model', est)
            ])
            
            # Cross-Validation on X_train
            cv = cross_validate(pipe, X_train, y_tr, cv=rskf, scoring=['accuracy', 'balanced_accuracy', 'roc_auc', 'recall', 'f1'])
            
            # Fit on full X_train and evaluate on untouched holdout X_test
            pipe.fit(X_train, y_tr)
            y_pred = pipe.predict(X_test)
            y_prob = pipe.predict_proba(X_test)[:, 1]
            
            acc = accuracy_score(y_te, y_pred)
            bal = balanced_accuracy_score(y_te, y_pred)
            auc = roc_auc_score(y_te, y_prob)
            sens = recall_score(y_te, y_pred)
            prec = precision_score(y_te, y_pred, zero_division=0)
            f1 = f1_score(y_te, y_pred, zero_division=0)
            brier = brier_score_loss(y_te, y_prob)
            cm = confusion_matrix(y_te, y_pred)
            tn, fp, fn, tp = cm.ravel()
            spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
            
            print(f"  [{m_name}]")
            print(f"    CV 25x : Acc={cv['test_accuracy'].mean():.4f}±{cv['test_accuracy'].std():.3f} | BalAcc={cv['test_balanced_accuracy'].mean():.4f} | AUC={cv['test_roc_auc'].mean():.4f}±{cv['test_roc_auc'].std():.3f} | Sens={cv['test_recall'].mean():.4f} | F1={cv['test_f1'].mean():.4f}")
            print(f"    Test 61: Acc={acc:.4f} ({acc*100:.1f}%) | BalAcc={bal:.4f} | AUC={auc:.4f} | Sens={sens:.4f} | Spec={spec:.4f} | Prec={prec:.4f} | F1={f1:.4f} | Brier={brier:.4f}")
            print(f"    Test CM: TN={tn}, FP={fp}, FN={fn}, TP={tp}")

if __name__ == '__main__':
    main()

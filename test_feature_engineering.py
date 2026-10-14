import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from xgboost import XGBClassifier

def add_clinical_features(df):
    X = df.copy()
    
    # 1. Rate-Pressure Product (index of myocardial oxygen demand)
    if 'BP' in X.columns and 'PR' in X.columns:
        X['RPP'] = (X['BP'].astype(float) * X['PR'].astype(float)) / 100.0
        
    # 2. TG / HDL Ratio (atherogenic dyslipidemia & small dense LDL marker)
    if 'TG' in X.columns and 'HDL' in X.columns:
        hdl = X['HDL'].astype(float).replace(0, np.nan)
        X['TG_HDL_Ratio'] = X['TG'].astype(float) / hdl
        
    # 3. LDL / HDL Ratio (classic atherogenic index)
    if 'LDL' in X.columns and 'HDL' in X.columns:
        hdl = X['HDL'].astype(float).replace(0, np.nan)
        X['LDL_HDL_Ratio'] = X['LDL'].astype(float) / hdl
        
    # 4. Neutrophil to Lymphocyte Ratio (NLR - inflammatory vascular plaque marker)
    if 'Neut' in X.columns and 'Lymph' in X.columns:
        lymph = X['Lymph'].astype(float).replace(0, np.nan)
        X['NLR'] = X['Neut'].astype(float) / lymph
        
    # 5. BUN to Creatinine Ratio (cardiorenal index)
    if 'BUN' in X.columns and 'CR' in X.columns:
        cr = X['CR'].astype(float).replace(0, np.nan)
        X['BUN_CR_Ratio'] = X['BUN'].astype(float) / cr
        
    # 6. Ischemic ECG / Symptom Score
    ecg_symptom_cols = ['Typical Chest Pain', 'Q Wave', 'St Elevation', 'St Depression', 'Tinversion']
    present_cols = [c for c in ecg_symptom_cols if c in X.columns]
    if len(present_cols) > 0:
        X['Ischemic_Burden_Score'] = X[present_cols].astype(float).sum(axis=1)
        
    # 7. Localized Wall Motion Deficit (RWMA present)
    if 'Region RWMA' in X.columns:
        X['RWMA_Present'] = (X['Region RWMA'].astype(float) > 0).astype(int)
        
    return X

def test_feature_engineering():
    with open('data/cardiovision_checkpoint.pkl', 'rb') as f:
        ckpt = pickle.load(f)
        
    X_train_raw = ckpt['X_train']
    X_train_fe = add_clinical_features(X_train_raw)
    
    print(f"Original feature count: {X_train_raw.shape[1]}")
    print(f"Engineered feature count: {X_train_fe.shape[1]}")
    print(f"Added features: {[c for c in X_train_fe.columns if c not in X_train_raw.columns]}")
    
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    targets = {
        'CAD': ckpt['y_cad_train'],
        'LAD': ckpt['y_lad_train'],
        'LCX': ckpt['y_lcx_train'],
        'RCA': ckpt['y_rca_train']
    }
    
    models = {
        'CAD': LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42),
        'LAD': RandomForestClassifier(n_estimators=200, max_depth=5, min_samples_leaf=2, class_weight='balanced', random_state=42),
        'LCX': LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42),
        'RCA': LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42)
    }
    
    print("\n=== COMPARISON: RAW VS CLINICALLY ENGINEERED FEATURES (5-Fold CV) ===")
    for t, y in targets.items():
        clf = models[t]
        
        # 1. Raw
        num_raw = X_train_raw.select_dtypes(include=[np.number]).columns.tolist()
        cat_raw = X_train_raw.select_dtypes(exclude=[np.number]).columns.tolist()
        pipe_raw = Pipeline([
            ('pre', ColumnTransformer([
                ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('scl', StandardScaler())]), num_raw),
                ('cat', Pipeline([('imp', SimpleImputer(strategy='most_frequent')), ('enc', OneHotEncoder(handle_unknown='ignore', sparse_output=False))]), cat_raw)
            ])),
            ('clf', clf)
        ])
        cv_raw = cross_validate(pipe_raw, X_train_raw, y, cv=skf, scoring=['accuracy', 'balanced_accuracy', 'roc_auc', 'f1'])
        
        # 2. Engineered
        num_fe = X_train_fe.select_dtypes(include=[np.number]).columns.tolist()
        cat_fe = X_train_fe.select_dtypes(exclude=[np.number]).columns.tolist()
        pipe_fe = Pipeline([
            ('pre', ColumnTransformer([
                ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('scl', StandardScaler())]), num_fe),
                ('cat', Pipeline([('imp', SimpleImputer(strategy='most_frequent')), ('enc', OneHotEncoder(handle_unknown='ignore', sparse_output=False))]), cat_fe)
            ])),
            ('clf', clf)
        ])
        cv_fe = cross_validate(pipe_fe, X_train_fe, y, cv=skf, scoring=['accuracy', 'balanced_accuracy', 'roc_auc', 'f1'])
        
        print(f"\nTarget: {t}")
        print(f"  Raw:        Acc={cv_raw['test_accuracy'].mean():.4f}±{cv_raw['test_accuracy'].std():.3f} | BalAcc={cv_raw['test_balanced_accuracy'].mean():.4f} | AUC={cv_raw['test_roc_auc'].mean():.4f} | F1={cv_raw['test_f1'].mean():.4f}")
        print(f"  Engineered: Acc={cv_fe['test_accuracy'].mean():.4f}±{cv_fe['test_accuracy'].std():.3f} | BalAcc={cv_fe['test_balanced_accuracy'].mean():.4f} | AUC={cv_fe['test_roc_auc'].mean():.4f} | F1={cv_fe['test_f1'].mean():.4f}")

if __name__ == '__main__':
    test_feature_engineering()

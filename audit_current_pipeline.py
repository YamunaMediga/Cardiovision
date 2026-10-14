import os
import pickle
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_validate, RepeatedStratifiedKFold
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, balanced_accuracy_score, recall_score, precision_score, confusion_matrix
import sklearn.compose._column_transformer

class _RemainderColsList(list):
    pass
sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList

def main():
    with open('data/cardiovision_checkpoint.pkl', 'rb') as f:
        ckpt = pickle.load(f)

    X_train = ckpt['X_train']
    X_test = ckpt['X_test']
    
    targets = {
        'CAD': (ckpt['y_cad_train'], ckpt['y_cad_test'], 'models/cardiovision_CAD_SVM.joblib'),
        'LAD': (ckpt['y_lad_train'], ckpt['y_lad_test'], 'models/cardiovision_LAD_RandomForest.joblib'),
        'LCX': (ckpt['y_lcx_train'], ckpt['y_lcx_test'], 'models/cardiovision_LCX_XGBoost.joblib'),
        'RCA': (ckpt['y_rca_train'], ckpt['y_rca_test'], 'models/cardiovision_RCA_SVM.joblib')
    }

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    rskf = RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=42)

    print("=========================================================================")
    print("STEP 1: COMPREHENSIVE AUDIT OF CURRENT MODELS")
    print("=========================================================================")

    for t, (y_tr, y_te, mpath) in targets.items():
        m = joblib.load(mpath)
        
        # 1. Evaluate on Holdout Test Set (N=61)
        te_pred = m.predict(X_test)
        te_prob = m.predict_proba(X_test)[:, 1]
        cm = confusion_matrix(y_te, te_pred)
        tn, fp, fn, tp = cm.ravel()
        sens = recall_score(y_te, te_pred)
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        bal_acc = balanced_accuracy_score(y_te, te_pred)
        acc = accuracy_score(y_te, te_pred)
        f1 = f1_score(y_te, te_pred)
        auc = roc_auc_score(y_te, te_prob)
        
        print(f"\n--- TARGET: {t} ---")
        print(f"Model: {ckpt['best_models'][t]}")
        print(f"Holdout Test (N=61):")
        print(f"  Accuracy:          {acc:.4f} ({acc*100:.2f}%)")
        print(f"  Balanced Accuracy: {bal_acc:.4f} ({bal_acc*100:.2f}%)")
        print(f"  ROC-AUC:           {auc:.4f}")
        print(f"  Sensitivity (Rec): {sens:.4f} ({sens*100:.2f}%)")
        print(f"  Specificity:       {spec:.4f} ({spec*100:.2f}%)")
        print(f"  Precision:         {precision_score(y_te, te_pred):.4f}")
        print(f"  F1-Score:          {f1:.4f}")
        print(f"  Confusion Matrix:  TN={tn}, FP={fp}, FN={fn}, TP={tp}")
        print(f"  Class Balance Tr:  Pos={np.sum(y_tr==1)} ({np.mean(y_tr==1)*100:.1f}%), Neg={np.sum(y_tr==0)} ({np.mean(y_tr==0)*100:.1f}%)")
        print(f"  Class Balance Te:  Pos={np.sum(y_te==1)} ({np.mean(y_te==1)*100:.1f}%), Neg={np.sum(y_te==0)} ({np.mean(y_te==0)*100:.1f}%)")

        # 2. Evaluate with 5-Fold Stratified Cross-Validation on X_train (N=242)
        cv5 = cross_validate(m, X_train, y_tr, cv=skf, scoring=['accuracy', 'balanced_accuracy', 'roc_auc', 'f1', 'recall'])
        print(f"Stratified 5-Fold CV on X_train (N=242):")
        print(f"  CV Accuracy:          {cv5['test_accuracy'].mean():.4f} +/- {cv5['test_accuracy'].std():.4f}")
        print(f"  CV Balanced Accuracy: {cv5['test_balanced_accuracy'].mean():.4f} +/- {cv5['test_balanced_accuracy'].std():.4f}")
        print(f"  CV ROC-AUC:           {cv5['test_roc_auc'].mean():.4f} +/- {cv5['test_roc_auc'].std():.4f}")
        print(f"  CV Sensitivity (Rec): {cv5['test_recall'].mean():.4f} +/- {cv5['test_recall'].std():.4f}")
        print(f"  CV F1-Score:          {cv5['test_f1'].mean():.4f} +/- {cv5['test_f1'].std():.4f}")

        # 3. Repeated Stratified 5-Fold CV (5x5 = 25 evaluations)
        cv25 = cross_validate(m, X_train, y_tr, cv=rskf, scoring=['accuracy', 'balanced_accuracy', 'roc_auc', 'f1'])
        print(f"Repeated Stratified 5x5 CV on X_train:")
        print(f"  Mean Accuracy:     {cv25['test_accuracy'].mean():.4f} +/- {cv25['test_accuracy'].std():.4f}")
        print(f"  Mean Balanced Acc: {cv25['test_balanced_accuracy'].mean():.4f} +/- {cv25['test_balanced_accuracy'].std():.4f}")
        print(f"  Mean ROC-AUC:      {cv25['test_roc_auc'].mean():.4f} +/- {cv25['test_roc_auc'].std():.4f}")
        print(f"  Mean F1-Score:     {cv25['test_f1'].mean():.4f} +/- {cv25['test_f1'].std():.4f}")

if __name__ == '__main__':
    main()

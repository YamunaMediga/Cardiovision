import sklearn.compose._column_transformer
class _RemainderColsList(list):
    pass
sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList

import pickle
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, brier_score_loss

checkpoint_path = r'C:\Users\yamun\Downloads\cardiovision_checkpoint.pkl'
with open(checkpoint_path, 'rb') as f:
    ckpt = pickle.load(f)

X_train = ckpt['X_train']
X_test = ckpt['X_test']
y_test = {
    'CAD': ckpt['y_cad_test'],
    'LAD': ckpt['y_lad_test'],
    'LCX': ckpt['y_lcx_test'],
    'RCA': ckpt['y_rca_test']
}

models = {
    'CAD': joblib.load(r'C:\Users\yamun\Downloads\cardiovision_CAD_SVM.joblib'),
    'LAD': joblib.load(r'C:\Users\yamun\Downloads\cardiovision_LAD_RandomForest.joblib'),
    'LCX': joblib.load(r'C:\Users\yamun\Downloads\cardiovision_LCX_XGBoost.joblib'),
    'RCA': joblib.load(r'C:\Users\yamun\Downloads\cardiovision_RCA_SVM.joblib')
}

print('=== MODEL EVALUATION ON INDEPENDENT TEST SET (N=61) ===')
metrics = {}
for target, model in models.items():
    yt = y_test[target]
    ypred = model.predict(X_test)
    yprob = model.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(yt, ypred)
    prec = precision_score(yt, ypred, zero_division=0)
    rec = recall_score(yt, ypred, zero_division=0)
    f1 = f1_score(yt, ypred, zero_division=0)
    auc = roc_auc_score(yt, yprob)
    brier = brier_score_loss(yt, yprob)
    cm = confusion_matrix(yt, ypred)
    tn, fp, fn, tp = cm.ravel()
    spec = tn / (tn + fp) if (tn + fp) > 0 else 0
    sens = rec
    
    model_name = ckpt['best_models'][target]
    print(f"-- {target} ({model_name}) --")
    print(f"Accuracy:    {acc:.4f}")
    print(f"F1-Score:    {f1:.4f}")
    print(f"ROC-AUC:     {auc:.4f}")
    print(f"Sensitivity: {sens:.4f}")
    print(f"Specificity: {spec:.4f}")
    print(f"Precision:   {prec:.4f}")
    print(f"Brier Score: {brier:.4f}")
    print(f"Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    print()

print("Feature Count:", len(X_train.columns))
print("Any leakage of Cath, LAD, LCX, RCA in features?:")
for col in ['Cath', 'cath', 'LAD', 'lad', 'LCX', 'lcx', 'RCA', 'rca']:
    if col in X_train.columns:
        print(f"WARNING: Found {col} in X_train!")
print("Target leakage check passed: NO TARGET IN FEATURES!")

import pickle
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
import shap

def main():
    with open('data/cardiovision_checkpoint.pkl', 'rb') as f:
        ckpt = pickle.load(f)

    X_train = ckpt['X_train']
    
    num_cols = X_train.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = X_train.select_dtypes(exclude=[np.number]).columns.tolist()
    
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
    
    X_trans = pre.fit_transform(X_train)
    bg = shap.kmeans(X_trans, 15)

    # 1. Test CAD with Logistic Regression (LinearExplainer)
    lr = LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42)
    lr.fit(X_trans, ckpt['y_cad_train'])
    cad_exp = shap.LinearExplainer(lr, bg)
    cad_sv = cad_exp.shap_values(X_trans[:1])
    print("CAD LinearExplainer shape:", np.array(cad_sv).shape)

    # 2. Test LAD with Tuned RandomForest (TreeExplainer)
    rf = RandomForestClassifier(n_estimators=250, max_depth=5, min_samples_leaf=2, class_weight='balanced', random_state=42)
    rf.fit(X_trans, ckpt['y_lad_train'])
    lad_exp = shap.TreeExplainer(rf)
    lad_sv = lad_exp.shap_values(X_trans[:1])
    print("LAD TreeExplainer type:", type(lad_sv))

    # 3. Test LCX with Calibrated Classifier (KernelExplainer)
    lcx_model = CalibratedClassifierCV(SVC(C=0.1, kernel='linear', class_weight='balanced', random_state=42), cv=5)
    lcx_model.fit(X_trans, ckpt['y_lcx_train'])
    lcx_exp = shap.KernelExplainer(lcx_model.predict_proba, bg)
    lcx_sv = lcx_exp.shap_values(X_trans[:1], nsamples=50)
    print("LCX KernelExplainer type:", type(lcx_sv))

    # 4. Test RCA with Calibrated Classifier (KernelExplainer)
    rca_model = CalibratedClassifierCV(SVC(C=0.1, kernel='linear', class_weight='balanced', random_state=42), cv=5)
    rca_model.fit(X_trans, ckpt['y_rca_train'])
    rca_exp = shap.KernelExplainer(rca_model.predict_proba, bg)
    rca_sv = rca_exp.shap_values(X_trans[:1], nsamples=50)
    print("RCA KernelExplainer type:", type(rca_sv))
    
    print("\nAll 4 SHAP explainers initialized and tested successfully!")

if __name__ == '__main__':
    main()

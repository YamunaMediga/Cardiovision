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
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, GradientBoostingClassifier, HistGradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, roc_auc_score, f1_score, recall_score, precision_score, brier_score_loss

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

def evaluate_models_for_target(X_train, y_train, target_name):
    preprocessor = create_preprocessor(X_train)
    
    pos_count = int(np.sum(y_train == 1))
    neg_count = int(np.sum(y_train == 0))
    scale_pos = neg_count / max(1, pos_count)
    
    candidates = {
        'LogisticRegression_L2': Pipeline([
            ('pre', preprocessor),
            ('clf', LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42))
        ]),
        'LogisticRegression_L1': Pipeline([
            ('pre', preprocessor),
            ('clf', LogisticRegression(C=0.3, penalty='l1', solver='saga', class_weight='balanced', max_iter=2000, random_state=42))
        ]),
        'SVC_RBF_Balanced': Pipeline([
            ('pre', preprocessor),
            ('clf', SVC(C=1.0, kernel='rbf', gamma='scale', class_weight='balanced', probability=True, random_state=42))
        ]),
        'SVC_RBF_Tuned_C05': Pipeline([
            ('pre', preprocessor),
            ('clf', SVC(C=0.5, kernel='rbf', gamma='scale', class_weight='balanced', probability=True, random_state=42))
        ]),
        'SVC_Linear': Pipeline([
            ('pre', preprocessor),
            ('clf', SVC(C=0.1, kernel='linear', class_weight='balanced', probability=True, random_state=42))
        ]),
        'RandomForest_Balanced': Pipeline([
            ('pre', preprocessor),
            ('clf', RandomForestClassifier(n_estimators=200, max_depth=5, min_samples_leaf=3, class_weight='balanced', random_state=42))
        ]),
        'RandomForest_Deep': Pipeline([
            ('pre', preprocessor),
            ('clf', RandomForestClassifier(n_estimators=300, max_depth=None, min_samples_leaf=1, class_weight='balanced', random_state=42))
        ]),
        'ExtraTrees_Balanced': Pipeline([
            ('pre', preprocessor),
            ('clf', ExtraTreesClassifier(n_estimators=200, max_depth=6, min_samples_leaf=2, class_weight='balanced', random_state=42))
        ]),
        'GradientBoosting': Pipeline([
            ('pre', preprocessor),
            ('clf', GradientBoostingClassifier(n_estimators=100, learning_rate=0.05, max_depth=3, random_state=42))
        ]),
        'HistGradientBoosting': Pipeline([
            ('pre', preprocessor),
            ('clf', HistGradientBoostingClassifier(max_iter=100, learning_rate=0.05, max_depth=3, random_state=42))
        ]),
        'XGBoost_Tuned': Pipeline([
            ('pre', preprocessor),
            ('clf', XGBClassifier(n_estimators=150, max_depth=3, learning_rate=0.03, colsample_bytree=0.8, subsample=0.8, scale_pos_weight=scale_pos, eval_metric='logloss', random_state=42))
        ]),
        'XGBoost_Light': Pipeline([
            ('pre', preprocessor),
            ('clf', XGBClassifier(n_estimators=80, max_depth=2, learning_rate=0.05, reg_alpha=0.5, reg_lambda=1.0, scale_pos_weight=scale_pos, eval_metric='logloss', random_state=42))
        ]),
        'Calibrated_SVC_Linear': Pipeline([
            ('pre', preprocessor),
            ('clf', CalibratedClassifierCV(SVC(C=0.2, kernel='linear', class_weight='balanced', random_state=42), cv=3))
        ]),
        'Calibrated_Logistic': Pipeline([
            ('pre', preprocessor),
            ('clf', CalibratedClassifierCV(LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000, random_state=42), cv=3))
        ])
    }
    
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    results = []
    print(f"\n=======================================================")
    print(f"BENCHMARKING TARGET: {target_name} (Pos={pos_count}, Neg={neg_count})")
    print(f"=======================================================")
    print(f"{'Model':<25} | {'CV Acc':<14} | {'CV BalAcc':<14} | {'CV AUC':<14} | {'CV Sens':<14} | {'CV F1':<14}")
    print("-" * 105)
    
    for name, pipe in candidates.items():
        try:
            cv_res = cross_validate(
                pipe, X_train, y_train, cv=skf,
                scoring=['accuracy', 'balanced_accuracy', 'roc_auc', 'recall', 'f1']
            )
            acc_m, acc_s = cv_res['test_accuracy'].mean(), cv_res['test_accuracy'].std()
            bal_m, bal_s = cv_res['test_balanced_accuracy'].mean(), cv_res['test_balanced_accuracy'].std()
            auc_m, auc_s = cv_res['test_roc_auc'].mean(), cv_res['test_roc_auc'].std()
            rec_m, rec_s = cv_res['test_recall'].mean(), cv_res['test_recall'].std()
            f1_m, f1_s = cv_res['test_f1'].mean(), cv_res['test_f1'].std()
            
            print(f"{name:<25} | {acc_m:.4f}±{acc_s:.3f} | {bal_m:.4f}±{bal_s:.3f} | {auc_m:.4f}±{auc_s:.3f} | {rec_m:.4f}±{rec_s:.3f} | {f1_m:.4f}±{f1_s:.3f}")
            results.append({
                'model': name,
                'acc_mean': acc_m, 'acc_std': acc_s,
                'bal_acc_mean': bal_m, 'bal_acc_std': bal_s,
                'auc_mean': auc_m, 'auc_std': auc_s,
                'sens_mean': rec_m, 'sens_std': rec_s,
                'f1_mean': f1_m, 'f1_std': f1_s
            })
        except Exception as e:
            print(f"{name:<25} | ERROR: {e}")
            
    res_df = pd.DataFrame(results).sort_values(by='auc_mean', ascending=False)
    return res_df

def main():
    with open('data/cardiovision_checkpoint.pkl', 'rb') as f:
        ckpt = pickle.load(f)
        
    X_train = ckpt['X_train']
    
    targets = {
        'CAD': ckpt['y_cad_train'],
        'LAD': ckpt['y_lad_train'],
        'LCX': ckpt['y_lcx_train'],
        'RCA': ckpt['y_rca_train']
    }
    
    for t_name, y_tr in targets.items():
        evaluate_models_for_target(X_train, y_tr, t_name)

if __name__ == '__main__':
    main()

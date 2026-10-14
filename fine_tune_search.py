import sys, os
sys.path.insert(0, os.path.abspath('.'))
from backend.model_service import ModelService
import pandas as pd
import numpy as np

service = ModelService('.')

base = {
    'Age': 38, 'Sex': 'Male', 'Weight': 74.0, 'Length': 165.0, 'BMI': 27.18,
    'BP': 100, 'PR': 107, 'DM': 0, 'HTN': 0, 'Current Smoker': 0, 'EX-Smoker': 0,
    'FH': 0, 'Obesity': 'N', 'CRF': 'N', 'CVA': 'N', 'Airway disease': 'N',
    'Thyroid Disease': 'N', 'CHF': 'N', 'DLP': 'N', 'Edema': 0,
    'Weak Peripheral Pulse': 'N', 'Lung rales': 'N', 'Systolic Murmur': 'N',
    'Diastolic Murmur': 'N', 'Typical Chest Pain': 0, 'Dyspnea': 'Y',
    'Function Class': 0, 'Atypical': 'N', 'Nonanginal': 'Y', 'LowTH Ang': 'N',
    'Q Wave': 0, 'St Elevation': 0, 'St Depression': 0, 'Tinversion': 0,
    'LVH': 'N', 'Poor R Progression': 'N', 'BBB': 'N', 'FBS': 250, 'CR': 0.8,
    'TG': 120, 'LDL': 120, 'HDL': 42.0, 'BUN': 45, 'ESR': 45, 'HB': 13.5, 'K': 5.0,
    'Na': 140, 'WBC': 7500, 'Lymph': 56, 'Neut': 56, 'PLT': 56, 'EF-TTE': 45,
    'Region RWMA': 0, 'VHD': 'N'
}

rows = []
for tg in range(80, 140, 5):
    for ldl in range(90, 150, 5):
        for cr in [0.7, 0.8, 0.9, 1.0]:
            for wbc in range(5000, 9500, 500):
                for hdl in [38, 40, 42, 44, 46]:
                    r = dict(base)
                    r['TG'] = tg
                    r['LDL'] = ldl
                    r['CR'] = cr
                    r['WBC'] = wbc
                    r['HDL'] = hdl
                    rows.append(r)

df_all = pd.DataFrame(rows)
print(f"Generated {len(df_all)} candidate rows.")

p_cad = service.models['CAD'].predict_proba(df_all)[:, 1]
p_lad = service.models['LAD'].predict_proba(df_all)[:, 1]
p_lcx = service.models['LCX'].predict_proba(df_all)[:, 1]
p_rca = service.models['RCA'].predict_proba(df_all)[:, 1]

cad_pct = np.round(p_cad * 100, 1)
lad_pct = np.round(p_lad * 100, 1)
lcx_pct = np.round(p_lcx * 100, 1)
rca_pct = np.round(p_rca * 100, 1)

matches = (cad_pct == 8.3) & (lad_pct == 48.8) & (lcx_pct == 45.6) & (rca_pct == 16.2)
idx_matches = np.where(matches)[0]
print("Exact matches count:", len(idx_matches))

if len(idx_matches) > 0:
    best_idx = idx_matches[0]
    matched_row = rows[best_idx]
    print("EXACT MATCH FOUND at index", best_idx)
    print("Features:", matched_row)
    print("Exact Probs:", {
        'CAD': float(p_cad[best_idx]),
        'LAD': float(p_lad[best_idx]),
        'LCX': float(p_lcx[best_idx]),
        'RCA': float(p_rca[best_idx])
    })
else:
    err = np.abs(cad_pct - 8.3) + np.abs(lad_pct - 48.8) + np.abs(lcx_pct - 45.6) + np.abs(rca_pct - 16.2)
    min_idx = np.argmin(err)
    print(f"Closest match (err={err[min_idx]:.2f}) at index {min_idx}:")
    print("Features:", rows[min_idx])
    print("Probs:", {
        'CAD': float(cad_pct[min_idx]),
        'LAD': float(lad_pct[min_idx]),
        'LCX': float(lcx_pct[min_idx]),
        'RCA': float(rca_pct[min_idx])
    })

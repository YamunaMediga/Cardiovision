import sys, os
sys.path.insert(0, os.path.abspath('.'))
from backend.model_service import ModelService

service = ModelService('.')

form_data = {
    'Age': 38, 'Sex': 'Male', 'Weight': '', 'Length': '', 'BMI': '',
    'BP': 100, 'PR': 107, 'DM': 0, 'HTN': 0, 'Current Smoker': 0, 'EX-Smoker': 0,
    'FH': 0, 'Obesity': 'N', 'CRF': 'N', 'CVA': 'N', 'Airway disease': 'N',
    'Thyroid Disease': 'N', 'CHF': 'N', 'DLP': 'N', 'Edema': 0,
    'Weak Peripheral Pulse': 'N', 'Lung rales': 'N', 'Systolic Murmur': 'N',
    'Diastolic Murmur': 'N', 'Typical Chest Pain': 0, 'Dyspnea': 'N',
    'Function Class': 0, 'Atypical': 'N', 'Nonanginal': 'N', 'LowTH Ang': 'N',
    'Q Wave': 0, 'St Elevation': 0, 'St Depression': 0, 'Tinversion': 0,
    'LVH': 'N', 'Poor R Progression': 'N', 'BBB': 'N', 'FBS': 250, 'CR': '',
    'TG': '', 'LDL': '', 'HDL': '', 'BUN': 45, 'ESR': 45, 'HB': '', 'K': 5.0,
    'Na': '', 'WBC': '', 'Lymph': 56, 'Neut': 56, 'PLT': 56, 'EF-TTE': 45,
    'Region RWMA': 0, 'VHD': 'N'
}

matches = []
for dyspnea in ['N', 'Y']:
    for atypical in ['N', 'Y']:
        for tg in range(60, 140, 5):
            for ldl in range(70, 150, 10):
                for wbc in [5000, 6000, 7000, 8000, 9000, 10000]:
                    cand = dict(form_data)
                    cand['Dyspnea'] = dyspnea
                    cand['Atypical'] = atypical
                    cand['TG'] = tg
                    cand['LDL'] = ldl
                    cand['WBC'] = wbc
                    df = service.prepare_dataframe(cand)
                    probs = {t: round(service.models[t].predict_proba(df)[0, 1]*100, 1) for t in ['CAD', 'LAD', 'LCX', 'RCA']}
                    if probs['CAD'] == 8.3 and probs['LAD'] == 48.8 and probs['LCX'] == 45.6 and probs['RCA'] == 16.2:
                        print("EXACT BITWISE MATCH FOUND!")
                        print("Params:", cand)
                        print("Probs:", probs)
                        matches.append(cand)
                        break
                if matches: break
            if matches: break
        if matches: break
    if matches: break

if not matches:
    print("Exact 4-way match not found in grid, let's search with closer tolerances:")
    best_dist = 999
    best_cand = None
    best_p = None
    for dyspnea in ['N', 'Y']:
        for atypical in ['N', 'Y']:
            for tg in range(60, 120, 5):
                for ldl in range(80, 130, 5):
                    for cr in [0.7, 0.8, 0.9, 1.0]:
                        cand = dict(form_data)
                        cand['Dyspnea'] = dyspnea
                        cand['Atypical'] = atypical
                        cand['TG'] = tg
                        cand['LDL'] = ldl
                        cand['CR'] = cr
                        df = service.prepare_dataframe(cand)
                        p = {t: round(service.models[t].predict_proba(df)[0, 1]*100, 1) for t in ['CAD', 'LAD', 'LCX', 'RCA']}
                        dist = abs(p['CAD'] - 8.3) + abs(p['LAD'] - 48.8) + abs(p['LCX'] - 45.6) + abs(p['RCA'] - 16.2)
                        if dist < best_dist:
                            best_dist = dist
                            best_cand = cand
                            best_p = p
    print(f"Closest match (dist={best_dist}): {best_p}")
    print("Closest params:", {k: best_cand[k] for k in ['Dyspnea', 'Atypical', 'TG', 'LDL', 'CR']})

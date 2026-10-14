import sys, os
sys.path.insert(0, os.path.abspath('.'))
from backend.model_service import ModelService
import numpy as np

service = ModelService('.')

# Fixed inputs from user
fixed = {
    'Age': 38, 'PR': 107, 'BP': 100, 'FBS': 250, 'ESR': 45,
    'K': 5.0, 'BUN': 45, 'EF-TTE': 45, 'Region RWMA': 0,
    'Lymph': 56, 'Neut': 56, 'PLT': 56
}

# The initial empty fields in App.jsx formData:
# 'Weight', 'Length', 'CR', 'TG', 'LDL', 'HDL', 'HB', 'Na', 'WBC'
# If a user entered standard or round numbers, e.g.
# Weight: [60, 65, 70, 75, 80]
# Length: [160, 165, 170, 175]
# CR: [0.8, 0.9, 1.0, 1.1]
# TG: [80, 90, 100, 110, 120, 150]
# LDL: [80, 90, 100, 110, 120]
# HDL: [35, 40, 45, 50]
# HB: [12, 13, 14, 15]
# Na: [135, 138, 140, 142]
# WBC: [6000, 7000, 8000, 9000]

base_form = {
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

# Let's check what default prepare_dataframe produces if some are left empty vs filled:
# Let's inspect the target probabilities:
# CAD: 8.3%, LAD: 48.8%, LCX: 45.6%, RCA: 16.2%
print("Testing various filled combinations...")

found = []
for tg in [75, 80, 85, 90, 95, 100, 105, 110]:
    for ldl in [85, 90, 95, 100, 105, 110]:
        for cr in [0.8, 0.9, 1.0]:
            for hdl in [40, 45, 50]:
                for wbc in [6000, 7000, 7500, 8000]:
                    cand = dict(base_form)
                    cand['TG'] = tg
                    cand['LDL'] = ldl
                    cand['CR'] = cr
                    cand['HDL'] = hdl
                    cand['WBC'] = wbc
                    df = service.prepare_dataframe(cand)
                    
                    p_cad = service.models['CAD'].predict_proba(df)[0, 1]
                    p_lad = service.models['LAD'].predict_proba(df)[0, 1]
                    p_lcx = service.models['LCX'].predict_proba(df)[0, 1]
                    p_rca = service.models['RCA'].predict_proba(df)[0, 1]
                    
                    cad_pct = round(p_cad * 100, 1)
                    lad_pct = round(p_lad * 100, 1)
                    lcx_pct = round(p_lcx * 100, 1)
                    rca_pct = round(p_rca * 100, 1)
                    
                    if cad_pct == 8.3 and lad_pct == 48.8 and lcx_pct == 45.6 and rca_pct == 16.2:
                        print("FOUND EXACT HIT:")
                        print("TG:", tg, "LDL:", ldl, "CR:", cr, "HDL:", hdl, "WBC:", wbc)
                        print("Raw CAD:", p_cad, "LAD:", p_lad, "LCX:", p_lcx, "RCA:", p_rca)
                        found.append((cand, p_cad, p_lad, p_lcx, p_rca))
                        break
                if found: break
            if found: break
        if found: break
    if found: break

if not found:
    print("No hit with base_form. What if Sex='Fmale'?")
    for tg in [75, 80, 85, 90, 95, 100, 105, 110]:
        for ldl in [85, 90, 95, 100, 105, 110]:
            cand = dict(base_form)
            cand['Sex'] = 'Fmale'
            cand['TG'] = tg
            cand['LDL'] = ldl
            df = service.prepare_dataframe(cand)
            cad_pct = round(service.models['CAD'].predict_proba(df)[0, 1] * 100, 1)
            lad_pct = round(service.models['LAD'].predict_proba(df)[0, 1] * 100, 1)
            lcx_pct = round(service.models['LCX'].predict_proba(df)[0, 1] * 100, 1)
            rca_pct = round(service.models['RCA'].predict_proba(df)[0, 1] * 100, 1)
            if cad_pct == 8.3 or lad_pct == 48.8 or rca_pct == 16.2:
                print(f"Fmale TG={tg}, LDL={ldl} -> CAD={cad_pct}%, LAD={lad_pct}%, LCX={lcx_pct}%, RCA={rca_pct}%")

with open(r'C:\Users\yamun\.gemini\antigravity\brain\1c7c12f7-ee7e-4b5d-ba07-50516ed042a9\.system_generated\steps\298\content.md', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re
matches = set(re.findall(r'https?://[^\s"\'<>]+?\.glb', text))
print('GLB URLs count:', len(matches))
for m in matches:
    if 'heart' in m.lower():
        print('Heart GLB:', m)

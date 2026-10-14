with open(r'C:\Users\yamun\.gemini\antigravity\brain\1c7c12f7-ee7e-4b5d-ba07-50516ed042a9\.system_generated\steps\276\content.md', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re
print("Searching for occurrences of glb in context:")
for m in re.finditer(r'.{0,80}(?:glb|\.glb).{0,120}', text, re.IGNORECASE):
    print("MATCH:", m.group(0))

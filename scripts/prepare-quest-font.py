"""Convert the complete OFL font to WOFF2 without subsetting future Chinese tasks.
Requires fonttools[woff]==4.59.0 and brotli==1.1.0. Original TTF is preserved.
"""
from pathlib import Path
import hashlib
import json
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
source = root / 'assets/source/fonts/ZCOOLKuaiLe-Regular.ttf'
target = root / 'assets/delivery/zcool-kuaile.woff2'
font = TTFont(source)
cmap = font.getBestCmap()
sample = '今天给你买一杯奶茶这周记得摸摸葵的脑袋给自己放一天假一起去看星星'
missing = sorted({c for c in sample if ord(c) not in cmap})
if missing:
    raise ValueError(f'Missing task glyphs: {missing}')
font.flavor = 'woff2'
font.save(target)
report = {'font': 'ZCOOL KuaiLe', 'license': 'SIL OFL 1.1', 'sourceUrl': 'https://github.com/google/fonts/tree/main/ofl/zcoolkuaile', 'formatOnlyConversion': True, 'subset': False, 'encodedCharacters': len(cmap), 'sourceBytes': source.stat().st_size, 'deliveryBytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'taskGlyphsComplete': True}
(root / 'assets/quest-font-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))

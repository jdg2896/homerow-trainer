"""Bundle src/ and data/ into one self-contained page: dist/index.html."""
from pathlib import Path
root = Path(__file__).parent
read = lambda p: (root / p).read_text()
body = f'''<title>Homerow Trainer</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>{read("src/style.css")}</style>
<div id="app"></div>
<script>window.HOMEROW_WORDS={read("data/words.json")};window.HOMEROW_DEFAULT_LAYOUT={read("data/default-layout.json")};</script>
<script>{read("src/engine.js")}</script>
<script>{read("src/ui.js")}</script>
'''
html = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + body + '</body></html>')
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/index.html').write_text(html)
print(f'dist/index.html  {len(html):,} bytes')

"""QA-only comparison artifacts. No automatic similarity/visual-match score."""
import argparse
import hashlib
import html
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--captures', required=True)
parser.add_argument('--reference', required=True)
parser.add_argument('--out', required=True)
args = parser.parse_args()
captures, reference, out = map(lambda p: Path(p).resolve(), [args.captures, args.reference, args.out])
out.mkdir(parents=True, exist_ok=True)
manifest = json.loads((captures / 'capture-manifest.json').read_text())
rows = sorted(manifest['records'], key=lambda r: r['screen'])
boards = sorted(reference.glob('*.png'))
assert len(boards) == 10, 'Ten original approved boards required'
font_file = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = ImageFont.truetype(font_file, 22) if Path(font_file).exists() else ImageFont.load_default()
small = ImageFont.truetype(font_file, 16) if Path(font_file).exists() else ImageFont.load_default()
# Broad panel crops preserve varying generated frame positions. Number strips are
# reference-document chrome, not UI to implement. Originals remain byte-exact.
boxes = [(8, 45, 833, 507), (840, 45, 1665, 507), (8, 482, 833, 914), (840, 482, 1665, 914)]
provenance = []
entries = []

def place_contained(canvas, source, box):
    image = source.convert('RGB').copy()
    image.thumbnail((box[2]-box[0], box[3]-box[1]), Image.Resampling.LANCZOS)
    canvas.paste(image, (box[0]+(box[2]-box[0]-image.width)//2, box[1]))

for row in rows:
    number = row['screen']
    board = boards[(number-1)//4]
    crop = Image.open(board).crop(boxes[(number-1)%4]).convert('RGB')
    crop_name = f'{number:02d}-approved-frame.png'
    crop.save(out / crop_name)
    current = Image.open(captures / row['file'])
    pair = Image.new('RGB', (1700, 650), '#F3F7FB')
    draw = ImageDraw.Draw(pair)
    draw.text((20, 12), f'{number:02d} {row["name"]} | approved frame vs {manifest["profile"]} actual app', fill='#18334B', font=font)
    draw.text((20, 45), 'Structural comparison. Reference includes documentation number strips, not product UI. No pixel-match claim.', fill='#526E86', font=small)
    draw.text((20, 80), 'APPROVED CONCEPT', fill='#18334B', font=small)
    draw.text((865, 80), 'ACTUAL APP — SYNTHETIC QA AUTH / DATA', fill='#18334B', font=small)
    place_contained(pair, crop, (20, 112, 830, 620))
    place_contained(pair, current, (865, 112, 1680, 620))
    pair_name = f'{number:02d}-comparison.png'
    pair.save(out / pair_name)
    source_hash = hashlib.sha256(board.read_bytes()).hexdigest()
    provenance.append({'screen': number, 'original': str(board), 'originalSha256': source_hash, 'cropBox': boxes[(number-1)%4], 'derivedCrop': crop_name, 'current': str(captures / row['file']), 'currentSha256': row['sha256'], 'comparison': pair_name})
    entries.append({'screen': number, 'name': row['name'], 'reference': crop_name, 'current': os.path.relpath(captures / row['file'], out), 'full': os.path.relpath(captures / row['fullFile'], out), 'comparison': pair_name, 'exception': row.get('exception', '')})

by_number = {row['screen']: row for row in rows}
for index, board in enumerate(boards):
    numbers = range(index*4+1, index*4+5)
    if not any(n in by_number for n in numbers):
        continue
    sheet = Image.new('RGB', (3384, 1160), '#F3F7FB')
    draw = ImageDraw.Draw(sheet)
    draw.text((18, 12), f'Board {index+1:02d} — APPROVED ORIGINAL', fill='#18334B', font=font)
    draw.text((1712, 12), 'ACTUAL APP — synthetic QA Auth/data; see manual review', fill='#18334B', font=font)
    place_contained(sheet, Image.open(board), (18, 52, 1690, 1100))
    for offset, number in enumerate(numbers):
        x = 1712 + (offset % 2)*830
        y = 62 + (offset // 2)*540
        if number not in by_number:
            draw.text((x, y), f'{number:02d} not captured', fill='#A12626', font=font)
            continue
        row = by_number[number]
        draw.text((x, y), f'{number:02d} {row["name"]}', fill='#18334B', font=font)
        place_contained(sheet, Image.open(captures / row['file']), (x, y+34, x+815, y+542))
    sheet.save(out / f'board-{index+1:02d}-comparison.png')

(out / 'comparison-provenance.json').write_text(json.dumps({'captureManifest': str(captures / 'capture-manifest.json'), 'conceptCommit': manifest['conceptCommit'], 'status': 'Images assembled for human review; no automatic match verdict.', 'frames': provenance}, indent=2)+'\n')
options = ''.join(f'<option value="{i}">{row["screen"]:02d} {html.escape(row["name"])}</option>' for i, row in enumerate(entries))
data = json.dumps(entries).replace('<', '\\u003c')
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GeoMath 40-screen visual comparison</title>
<style>body{margin:0;background:#F3F7FB;color:#18334B;font:15px system-ui}header{position:sticky;top:0;background:white;border-bottom:1px solid #BCD0E3;padding:14px 20px;z-index:2}button,select,a{font:inherit}button,select{min-height:44px;padding:8px 14px}button{cursor:pointer}nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.note{font-size:13px;margin:8px 0 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px}figure{margin:0;min-width:0}figcaption{font-weight:700;margin-bottom:10px}img{display:block;width:100%;height:auto;border:1px solid #BCD0E3;background:white}#exception{padding:0 16px 20px}@media(max-width:760px){.grid{grid-template-columns:1fr}}</style>
<header><nav><b>GeoMath approved / actual</b><button id="previous">Previous</button><select id="screen">OPTIONS</select><button id="next">Next</button><a id="full" target="_blank">Open full content</a><a id="pair" target="_blank">Open pair image</a></nav><p class="note">Human image review required. Capture success and function tests do not establish visual match. Actual app uses labelled synthetic QA Auth/data.</p></header><div class="grid"><figure><figcaption>Approved concept frame</figcaption><img id="reference"></figure><figure><figcaption id="current-title">Actual application</figcaption><img id="current"></figure></div><p id="exception"></p>
<script>const entries=DATA;let index=0;const select=document.getElementById('screen');function render(){const row=entries[index];select.value=String(index);document.getElementById('reference').src=row.reference;document.getElementById('current').src=row.current;document.getElementById('full').href=row.full;document.getElementById('pair').href=row.comparison;document.getElementById('current-title').textContent=String(row.screen).padStart(2,'0')+' '+row.name;document.getElementById('exception').textContent=row.exception?'Contract exception / truthful state: '+row.exception:'';history.replaceState(null,'','#'+row.screen);}select.onchange=()=>{index=Number(select.value);render()};document.getElementById('previous').onclick=()=>{index=(index+entries.length-1)%entries.length;render()};document.getElementById('next').onclick=()=>{index=(index+1)%entries.length;render()};document.addEventListener('keydown',event=>{if(event.target.matches('select,button'))return;if(event.key==='ArrowRight')document.getElementById('next').click();if(event.key==='ArrowLeft')document.getElementById('previous').click()});const initial=entries.findIndex(row=>row.screen===Number(location.hash.slice(1)));if(initial>=0)index=initial;render();</script></html>'''.replace('OPTIONS', options).replace('DATA', data)
(out / 'index.html').write_text(page)
print(f'{len(rows)} comparison pairs, board contact sheets and reviewer gallery: {out}')

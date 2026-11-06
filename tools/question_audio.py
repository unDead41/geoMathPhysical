#!/usr/bin/env python3
"""Export/check GeoDecoder's offline ElevenLabs script pack; never generate speech."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

IDS = tuple(f'{prefix}{n}' for prefix in ('P', 'C', 'K', 'B', 'S') for n in range(1, 4))
KINDS = ('soalan', 'hint')
STATUSES = ('awaiting_generation', 'generated_pending_listen', 'approved')


def parse_bank(text):
    """Read the current literal initializer, failing closed on an unfamiliar format."""
    body = text.split('const Question QUESTIONS[] = {', 1)[1].split('\n};', 1)[0]
    string = r'"(?:[^"\\]|\\.)*"'
    rows = rf'\{{\s*{string}\s*,\s*{string}\s*,\s*{string}\s*\}}'
    reason = rf'\{{\s*{string}\s*,\s*{string}\s*\}}'
    pattern = re.compile(
        rf'\{{\s*(?P<id>{string})\s*,\s*Shape::(?P<answer>[A-Z]+)\s*,'
        rf'\s*QuestionFocus::(?P<focus>SOLID|NET)\s*,\s*(?P<question>{rows})\s*,'
        rf'\s*(?P<hint>{rows})\s*,\s*(?P<full>{string})\s*,'
        rf'\s*(?P<reason>{reason})\s*\}}')
    matches = list(pattern.finditer(body))
    if re.sub(r'[\s,]', '', pattern.sub('', body)):
        raise ValueError('Bank initializer format changed; review it before exporting scripts.')
    bank = {}
    for match in matches:
        qid = json.loads(match['id'])
        if qid in bank:
            raise ValueError('Duplicate runtime ID: ' + qid)
        bank[qid] = {
            'answer_enum': match['answer'],
            'focus': match['focus'],
            'explanation_lcd': json.loads('[' + match['reason'][1:-1] + ']'),
            'question_lcd': json.loads('[' + match['question'][1:-1] + ']'),
            'hint_lcd': json.loads('[' + match['hint'][1:-1] + ']'),
            'question_full_text': json.loads(match['full']),
        }
    if set(bank) != set(IDS):
        raise ValueError('Runtime must contain the 15 agreed stable IDs.')
    return bank


def load_manifest(root):
    folder = root / 'audio' / 'elevenlabs'
    data = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
    if data['schema_version'] != 2:
        raise ValueError('Unsupported manifest schema.')
    raw_bank = (root / 'main' / 'question_bank.h').read_bytes()
    reference = data['reference']
    sha256 = hashlib.sha256(raw_bank).hexdigest()
    blob = hashlib.sha1(b'blob ' + str(len(raw_bank)).encode() + b'\0' + raw_bank).hexdigest()
    if sha256 != reference['bank_sha256'] or blob != reference['bank_git_blob']:
        raise ValueError('Runtime bank drift: compare LCD/answers/IDs and report before editing meanings.')
    bank = parse_bank(raw_bank.decode('utf-8'))
    records = data['questions']
    if tuple(q['id'] for q in records) != IDS:
        raise ValueError('Manifest must contain each agreed ID once in P/C/K/B/S export order.')
    for q in records:
        qid = q['id']
        if q['runtime'] != bank[qid]:
            raise ValueError(qid + ': runtime snapshot mismatch.')
        for rows in (q['runtime']['question_lcd'], q['runtime']['hint_lcd']):
            if len(rows) != 3 or any(not row.isascii() or len(row) > 20 for row in rows):
                raise ValueError(qid + ': invalid 3 x 20 ASCII LCD rows.')
        for kind in KINDS:
            clip = q[kind]
            if clip['filename'] != f'{qid}_{kind}.mp3':
                raise ValueError(qid + ': wrong canonical filename.')
            text = clip['text']
            if not isinstance(text, str) or not text or text != text.strip() or '\n' in text:
                raise ValueError(qid + ': speech must be one nonempty paragraph.')
            if re.search(r'\b(?:piramid|kon|kubus|kuboid|silinder|prisma)\b', text, re.I):
                raise ValueError(qid + ': answer name in speech.')
            if re.search(r'\b[PCKBS][1-3]\b|\.mp3\b|^(?:Soalan|Hint)\s*:', text):
                raise ValueError(qid + ': management label in speech.')
            if clip['status'] not in STATUSES:
                raise ValueError(qid + ': unknown recording status.')
    return data


def render_exports(data):
    scripts = ['# Skrip bacaan GeoDecoder', '',
               'Hanya isi dalam blok teks dibaca. ID dan label fail ialah rujukan pengurusan.',
               'Sumber: `audio/elevenlabs/manifest.json`. Eksport dengan `python tools/question_audio.py --write`.', '']
    mapping = ['# Pemetaan LCD, suara dan fail', '',
               'Tiga baris LCD disalin tepat; `<br>` memisahkan baris fizikal. Header pusingan bukan ID audio.',
               'Fokus SOLID: R1 bongkah kemudian R2 bentangan. Fokus NET: R2 bentangan kemudian R1 bongkah.',
               'Sumber: `audio/elevenlabs/manifest.json`; jangan edit eksport secara berasingan.', '']
    out = {}
    csv_buffer = io.StringIO(newline='')
    writer = csv.writer(csv_buffer, lineterminator='\n')
    writer.writerow(['id', 'jenis', 'lcd_baris_1', 'lcd_baris_2', 'lcd_baris_3',
                     'teks_penuh_runtime_soalan', 'skrip_suara', 'fail_audio'])
    for q in data['questions']:
        qid = q['id']
        scripts.extend([f'## {qid}', ''])
        mapping.extend([f'## {qid}', '', 'Fokus: ' + q['runtime']['focus'] + '.', '', '| Jenis | Teks asal LCD | Skrip suara | Fail audio |',
                        '|---|---|---|---|'])
        for kind in KINDS:
            clip = q[kind]
            rows = q['runtime']['question_lcd' if kind == 'soalan' else 'hint_lcd']
            label = kind.capitalize()
            scripts.extend([f'{label} — `{clip["filename"]}`', '', '```text', clip['text'], '```', ''])
            safe_rows = '<br>'.join(row.replace('|', '\\|') for row in rows)
            safe_text = clip['text'].replace('|', '\\|')
            mapping.append(f'| {label} | {safe_rows} | {safe_text} | `{clip["filename"]}` |')
            writer.writerow([qid, kind, *rows,
                             q['runtime']['question_full_text'] if kind == 'soalan' else '',
                             clip['text'], clip['filename']])
            out[f'audio/elevenlabs/scripts/{qid}_{kind}.txt'] = clip['text'] + '\n'
        mapping.append('')
    out['docs/audio/SCRIPTS.md'] = '\n'.join(scripts).rstrip() + '\n'
    out['docs/audio/MAPPING.md'] = '\n'.join(mapping).rstrip() + '\n'
    out['audio/elevenlabs/mapping.csv'] = csv_buffer.getvalue()
    return out


def check_audio(folder, data, required):
    expected = {q[k]['filename'] for q in data['questions'] for k in KINDS}
    actual = {p.name for p in folder.iterdir() if p.is_file() and p.suffix.lower() == '.mp3'} if folder.is_dir() else set()
    extra = actual - expected
    if extra:
        raise ValueError('Unexpected MP3 names: ' + ', '.join(sorted(extra)))
    for name in actual:
        if (folder / name).stat().st_size == 0:
            raise ValueError('Empty MP3: ' + name)
    missing = expected - actual
    if required and missing:
        raise ValueError(f'{len(missing)}/30 audio clips missing: ' + ', '.join(sorted(missing)))
    if required:
        ffprobe = shutil.which('ffprobe')
        if not ffprobe:
            raise ValueError('Install FFmpeg/ffprobe for MP3 codec and duration verification.')
        for name in sorted(expected):
            result = subprocess.run([ffprobe, '-v', 'error', '-show_entries',
                                     'stream=codec_type,codec_name:format=duration',
                                     '-of', 'json', str(folder / name)],
                                    capture_output=True, text=True, check=True, timeout=15)
            info = json.loads(result.stdout)
            audio = [s for s in info.get('streams', []) if s.get('codec_type') == 'audio']
            if len(audio) != 1 or audio[0].get('codec_name') != 'mp3' or float(info.get('format', {}).get('duration', 0)) <= 0:
                raise ValueError('Invalid MP3 stream/duration: ' + name)
    approved = sum(q[k]['status'] == 'approved' for q in data['questions'] for k in KINDS)
    print(f'[AUDIO {"PENDING" if missing else "PRESENT"}] {len(actual)}/30 files; {approved}/30 manually approved.')
    if required:
        print('[AUDIO FORMAT OK] 30 MP3 streams have a positive duration; listen to every clip separately.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--write', action='store_true', help='export scripts and mapping from the reviewed manifest')
    parser.add_argument('--audio-dir', type=Path, help='folder containing the 30 canonical MP3 files')
    parser.add_argument('--require-audio', action='store_true', help='fail unless all 30 real MP3 files pass ffprobe')
    args = parser.parse_args()
    try:
        root = args.root.resolve()
        data = load_manifest(root)
        expected = render_exports(data)
        script_folder = root / 'audio/elevenlabs/scripts'
        expected_scripts = {Path(p).name for p in expected if p.endswith('.txt')}
        if script_folder.exists() and {p.name for p in script_folder.glob('*.txt')} - expected_scripts:
            raise ValueError('Unexpected script files; remove/rename only after review.')
        for path, content in expected.items():
            target = root / path
            if args.write:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content.encode('utf-8'))
            elif not target.is_file() or target.read_bytes() != content.encode('utf-8'):
                raise ValueError('Export differs or is missing: ' + path + '; review manifest, then use --write.')
        check_audio(args.audio_dir or root / 'audio/elevenlabs/clips', data, args.require_audio)
        print('[SCRIPTS OK] 15 runtime IDs, 30 speech-only scripts, original LCD/answers and filenames match.')
        return 0
    except (OSError, ValueError, KeyError, TypeError, IndexError, subprocess.SubprocessError) as error:
        print('[QUESTION AUDIO ERROR] ' + str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())

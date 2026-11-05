"""Operate and capture the installed production APK through Android's real UI.

Never synthesizes a screen or reads app secrets. All captures use ADB screencap;
XML evidence records controls actually found, their labels and visible bounds.
"""
import argparse
import hashlib
import json
import pathlib
import re
import struct
import subprocess
import time
import xml.etree.ElementTree as ET

PROFILES = (
    (320, 720, 'ms', 'light', 100, False),
    (390, 844, 'en', 'dark', 125, False),
    (430, 932, 'ms', 'dark', 150, True),
    (768, 1024, 'en', 'light', 150, True),
)


def label_pattern(value):
    # Flutter merges the setting title, value and hint with commas in Android's
    # real accessibility tree; navigation labels use newlines.
    return re.compile(r'(^|[\n,])\s*' + re.escape(value) + r'(?=\s*($|[\n,]))', re.I)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--device', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = pathlib.Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    prefix = ['adb', '-s', args.device]
    captures = []
    current_profile = 'startup'
    action_sequence = 0

    def adb(*parts, timeout=45):
        return subprocess.check_output([*prefix, *parts], timeout=timeout)

    def hierarchy():
        nonlocal action_sequence
        action_sequence += 1
        remote = f'/sdcard/geomath-integration-{action_sequence}.xml'
        dumped = adb('shell', 'uiautomator', 'dump', remote)
        (output / f'{current_profile}-{action_sequence:03d}-dump.txt').write_bytes(dumped)
        try:
            raw = adb('exec-out', 'cat', remote)
        finally:
            try:
                adb('shell', 'rm', '-f', remote, timeout=8)
            except subprocess.SubprocessError:
                pass
        root = ET.fromstring(raw)
        (output / f'{current_profile}-{action_sequence:03d}-hierarchy.xml').write_bytes(raw)
        return root

    def dimensions():
        sizes = re.findall(r'(\d+)x(\d+)', adb('shell', 'wm', 'size').decode())
        return tuple(map(int, sizes[-1]))

    def swipe(direction='up', side=False):
        width, height = dimensions()
        x = width * 97 // 100 if side else width // 2
        start, end = (height * 3 // 4, height // 3)
        if direction == 'down':
            start, end = end, start
        adb('shell', 'input', 'swipe', str(x), str(start), str(x), str(end), '350')
        time.sleep(.5)

    def label(node):
        return '\n'.join((item.get('content-desc', '') + '\n' + item.get('text', '')).strip()
                         for item in node.iter('node')).strip()

    def bounds(node):
        numbers = [int(n) for n in re.findall(r'\d+', node.get('bounds', ''))]
        if len(numbers) == 4 and numbers[2] > numbers[0] and numbers[3] > numbers[1]:
            return numbers
        return None

    def find(labels, *, bottom=False, scroll=False, toggle=False, optional=False):
        patterns = [label_pattern(value) for value in labels]
        for attempt in range(12 if scroll else 8):
            try:
                root = hierarchy()
                candidates = []
                for node in root.iter('node'):
                    box = bounds(node)
                    if not box or node.get('enabled') != 'true':
                        continue
                    if toggle:
                        if not any(item.get('checkable') == 'true' for item in node.iter('node')):
                            continue
                    elif node.get('clickable') != 'true':
                        continue
                    text = label(node)
                    if any(pattern.search(text) for pattern in patterns):
                        # Prefer the smallest actual clickable control, except
                        # tab selection deliberately chooses bottommost bounds.
                        candidates.append((box, node))
                if candidates:
                    if bottom:
                        candidates.sort(key=lambda item: (-item[0][1],
                            (item[0][2]-item[0][0])*(item[0][3]-item[0][1])))
                    else:
                        candidates.sort(key=lambda item:
                            (item[0][2]-item[0][0])*(item[0][3]-item[0][1]))
                    return candidates[0]
                if scroll:
                    swipe()
            except (subprocess.SubprocessError, ET.ParseError):
                pass
            time.sleep(1)
        if optional:
            return None
        raise RuntimeError(f'Actual Android control {labels!r} was not found.')

    def tap(labels, **kwargs):
        result = find(labels, **kwargs)
        if result is None:
            return False
        box, _ = result
        adb('shell', 'input', 'tap', str((box[0]+box[2])//2), str((box[1]+box[3])//2))
        time.sleep(1)
        return True

    def tab(ms, en):
        tap([ms, en], bottom=True)
        time.sleep(1)

    def launch():
        adb('shell', 'am', 'force-stop', 'com.geomath.dev')
        adb('shell', 'am', 'start', '-n', 'com.geomath.dev/.MainActivity')
        find(['Tetapan', 'Settings'])

    def shot(name, scope):
        data = adb('exec-out', 'screencap', '-p')
        if not data.startswith(b'\x89PNG\r\n\x1a\n'):
            raise RuntimeError('ADB screencap did not return a PNG image.')
        width, height = struct.unpack('>II', data[16:24])
        filename = f'{current_profile}-{name}.png'
        (output / filename).write_bytes(data)
        captures.append({'path': filename, 'scope': scope,
                         'width_px': width, 'height_px': height,
                         'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})

    def choice(row_labels, option_labels):
        # Scroll back to top for language/theme/text controls on small phones.
        for _ in range(3):
            swipe('down')
        tap(row_labels, scroll=True)
        tap(option_labels)
        time.sleep(1)

    def switch(labels, value):
        result = find(labels, scroll=True, toggle=True)
        _, node = result
        checked = next((item.get('checked') for item in node.iter('node')
                        if item.get('checkable') == 'true'), None)
        if checked is None:
            raise RuntimeError(f'Actual Android switch {labels!r} is not checkable.')
        if (checked == 'true') != value:
            box, _ = result
            adb('shell', 'input', 'tap', str((box[0]+box[2])//2), str((box[1]+box[3])//2))
            time.sleep(1)

    def wait_for_model():
        deadline = time.monotonic()+90
        while time.monotonic() < deadline:
            root = hierarchy()
            loaded = False
            for node in root.iter('node'):
                text = label(node).casefold()
                if ('offline learning module is unavailable' in text or
                        'modul pembelajaran luar talian tidak tersedia' in text):
                    raise RuntimeError('Installed production APK reports offline module unavailable.')
                description = (node.get('content-desc', '')+' '+node.get('text', '')).casefold()
                if ('model interaktif kubus' in description or
                        'interactive cube model' in description or
                        (('kubus, bongkah 3d' in description or 'cube, 3d solid' in description)
                         and node.get('class') == 'android.widget.Image')):
                    loaded = True
                    box = bounds(node)
                    if box and box[2]-box[0] >= 128 and box[3]-box[1] >= 200:
                        time.sleep(1)
                        return
            if loaded:
                swipe(side=True)
            time.sleep(1)
        raise RuntimeError('Actual canonical cube canvas did not become visible in Android.')

    initial_size = adb('shell', 'wm', 'size').decode()
    initial_density = adb('shell', 'wm', 'density').decode()
    try:
        for width, height, language, theme, scale, contrast in PROFILES:
            current_profile = f'{width}dp-{language}-{theme}-{scale}-contrast{int(contrast)}'
            adb('shell', 'wm', 'density', '320')
            adb('shell', 'wm', 'size', f'{width*2}x{height*2}')
            time.sleep(2)
            launch()
            tap(['Tetapan', 'Settings'])
            choice(['Bahasa', 'Language'], ['English' if language == 'en' else 'Bahasa Melayu'])
            choice(['Tema', 'Theme'], ['Dark', 'Gelap'] if theme == 'dark' else ['Light', 'Cerah'])
            choice(['Saiz teks', 'Text size'], [f'{scale}%'])
            switch(['Kontras tinggi', 'High contrast'], contrast)
            switch(['Kurangkan gerakan', 'Reduce motion'], True)
            shot('37-settings', 'production preferences saved through Android UI')
            adb('shell', 'input', 'keyevent', '4')
            time.sleep(1)
            launch()
            shot('01-home-offline', 'normal main cold reopen, persisted preferences, airplane mode')
            tab('Belajar', 'Learn')
            find(['Mula teroka', 'Start exploring'], scroll=True)
            shot('41-learning-hub', 'production learning hub')
            tap(['Mula teroka', 'Start exploring'], scroll=True)
            wait_for_model()
            shot('25-explore-cube', 'real offline Android WebView canonical cube canvas')
            adb('shell', 'input', 'keyevent', '4')
            time.sleep(1)
            tab('Main', 'Play')
            find(['Mula bermain', 'Start playing'], scroll=True)
            shot('02-solo-setup', 'production offline guest Solo setup')
            tap(['Duel dua pemain', 'Two-player Duel'], scroll=True)
            time.sleep(1)
            shot('10-duel-unconfigured', 'production Duel capability/online-required state')
            adb('shell', 'input', 'keyevent', '4')
            time.sleep(1)
            tab('Kelas', 'Classes')
            shot('classes-guest', 'production classroom guest/capability state')
            tab('Profil', 'Profile')
            shot('profile-guest', 'production profile guest sign-in state')
    finally:
        adb('shell', 'wm', 'size', 'reset')
        adb('shell', 'wm', 'density', 'reset')
        (output / 'production-captures.json').write_text(json.dumps({
            'schema_version': 1, 'source': 'actual Android ADB screencap of installed production main APK',
            'device': args.device, 'initial_size': initial_size, 'initial_density': initial_density,
            'profiles': [{'width_dp':p[0], 'height_dp':p[1], 'language':p[2], 'theme':p[3],
                          'text_percent':p[4], 'high_contrast':p[5], 'reduced_motion':True} for p in PROFILES],
            'captures': captures, 'manual_talkback_and_visual_review':'pending',
        }, indent=2)+'\n')
    print(json.dumps({'actual_production_screenshots':len(captures),'device':args.device}))


if __name__ == '__main__':
    main()

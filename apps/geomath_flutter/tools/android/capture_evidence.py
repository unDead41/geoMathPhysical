"""Capture the real installed guest app with ADB; never render replacement UI."""
import argparse
import json
import pathlib
import re
import subprocess
import time
import xml.etree.ElementTree as ET


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--device', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = pathlib.Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    prefix = ['adb', '-s', args.device]

    def adb(*parts, timeout=30):
        return subprocess.check_output([*prefix, *parts], timeout=timeout)

    def hierarchy():
        adb('shell', 'uiautomator', 'dump', '/sdcard/geomath-foundation.xml')
        raw = adb('exec-out', 'cat', '/sdcard/geomath-foundation.xml')
        return raw, ET.fromstring(raw)

    def find_button(labels, *, scroll=False, evidence_name='control'):
        for _ in range(8):
            try:
                raw, root = hierarchy()
                (output/f'{evidence_name}-hierarchy.xml').write_bytes(raw)
                for node in root.iter('node'):
                    text = node.get('content-desc', '') + ' ' + node.get('text', '')
                    if node.get('clickable') == 'true' and any(label in text for label in labels):
                        points = [int(v) for v in re.findall(r'\d+', node.get('bounds', ''))]
                        if len(points) == 4 and points[2] > points[0] and points[3] > points[1]:
                            return raw, ((points[0]+points[2])//2, (points[1]+points[3])//2)
                if scroll:
                    # Small phones put the hero CTA below the first viewport.
                    # Operate the actual scroll view; an off-screen node cannot
                    # be found or tapped through Android accessibility.
                    sizes = re.findall(r'(\d+)x(\d+)', adb('shell', 'wm', 'size').decode())
                    width, height = map(int, sizes[-1])
                    adb('shell', 'input', 'swipe', str(width//2), str(height*3//4),
                        str(width//2), str(height//3), '350')
            except (subprocess.SubprocessError, ET.ParseError):
                pass
            time.sleep(2)
        raise RuntimeError(f'Expected GeoMath control {labels!r} was not found in the real Android UI.')

    def shot(name):
        data = adb('exec-out', 'screencap', '-p')
        if not data.startswith(b'\x89PNG\r\n\x1a\n'):
            raise RuntimeError('ADB did not return a PNG screenshot.')
        (output/name).write_bytes(data)

    def wait_for_model():
        # A screenshot file can exist while the real WebView is still loading.
        # Wait for the canonical canvas's accessibility label, and retain the
        # actual Android hierarchy used to establish its visible bounds.
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            try:
                raw, root = hierarchy()
                (output/'module-hierarchy.xml').write_bytes(raw)
                canvas_loaded = False
                for node in root.iter('node'):
                    label = (node.get('content-desc', '') + ' ' + node.get('text', '')).casefold()
                    if 'modul pembelajaran luar talian tidak tersedia' in label or 'offline learning module is unavailable' in label:
                        raise RuntimeError('The normal app reports a failed offline module load.')
                    # The canonical renderer replaces the static HTML label
                    # with this live description after selecting its model.
                    if ('model interaktif kubus' in label or
                            ('kubus, bongkah 3d' in label and node.get('class') == 'android.widget.Image')):
                        canvas_loaded = True
                        bounds = [int(v) for v in re.findall(r'\d+', node.get('bounds', ''))]
                        if len(bounds) == 4 and bounds[2]-bounds[0] >= 128 and bounds[3]-bounds[1] >= 384:
                            time.sleep(2)
                            return
                if canvas_loaded:
                    # The canonical sidebar and shape controls precede its
                    # canvas on a phone. Scroll the real document's side
                    # margin, outside the canvas's drag-to-rotate region.
                    sizes = re.findall(r'(\d+)x(\d+)', adb('shell', 'wm', 'size').decode())
                    width, height = map(int, sizes[-1])
                    adb('shell', 'input', 'swipe', str(width*97//100), str(height*3//4),
                        str(width*97//100), str(height//3), '350')
            except (subprocess.SubprocessError, ET.ParseError):
                pass
            time.sleep(2)
        raise RuntimeError('Canonical model canvas did not become visible in the normal Android app.')

    # Caller installs the main application APK, not an integration-test runner.
    adb('shell', 'am', 'force-stop', 'com.geomath.dev')
    adb('shell', 'am', 'start', '-n', 'com.geomath.dev/.MainActivity')
    raw, settings = find_button(['Tetapan', 'Settings'], evidence_name='home')
    (output/'home-hierarchy.xml').write_bytes(raw)
    shot('01-home-offline.png')
    adb('shell', 'input', 'tap', str(settings[0]), str(settings[1]))
    time.sleep(3)
    shot('37-settings.png')
    adb('shell', 'input', 'keyevent', '4')
    _, explore = find_button(['Teroka model 3D', 'Explore the 3D model'],
                             scroll=True, evidence_name='home-actions')
    shot('01-home-actions.png')
    adb('shell', 'input', 'tap', str(explore[0]), str(explore[1]))
    wait_for_model()
    shot('module-preview.png')
    (output/'webview.txt').write_bytes(adb('shell', 'dumpsys', 'webviewupdate'))
    device = {name: adb('shell', 'getprop', prop).decode().strip() for name, prop in {
        'model': 'ro.product.model', 'android': 'ro.build.version.release',
        'api': 'ro.build.version.sdk', 'boot_completed': 'sys.boot_completed',
    }.items()}
    device['device_id'] = args.device
    device['display_size'] = adb('shell', 'wm', 'size').decode().strip()
    device['display_density'] = adb('shell', 'wm', 'density').decode().strip()
    device['airplane_mode'] = adb('shell', 'settings', 'get', 'global', 'airplane_mode_on').decode().strip()
    (output/'device.json').write_text(json.dumps(device, indent=2)+'\n')
    print(json.dumps({'screenshots': ['01-home-offline.png','37-settings.png','module-preview.png'],
        'device': device, 'source': 'actual ADB screen capture'}))


if __name__ == '__main__':
    main()

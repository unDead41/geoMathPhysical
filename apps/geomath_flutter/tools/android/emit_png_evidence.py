"""Export a small, fixed guest screenshot set through private CI text logs.

This is a binary-access fallback for evidence review. It does not change the
Android suite result, render a substitute image, or include arbitrary app data.
"""
import base64
import hashlib
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
for name in (
    'last-screen.png',
    '320dp-ms-light-100-contrast0-01-home-offline.png',
    '320dp-ms-light-100-contrast0-25-explore-cube.png',
    '390dp-en-dark-125-contrast0-25-explore-cube.png',
):
    path = root / name
    if not path.is_file():
        continue
    data = path.read_bytes()
    if not data.startswith(b'\x89PNG\r\n\x1a\n') or len(data) > 1024 * 1024:
        continue
    encoded = base64.b64encode(data).decode('ascii')
    print('GEOMATH_PNG_BEGIN', name, len(data), hashlib.sha256(data).hexdigest())
    for offset in range(0, len(encoded), 4096):
        print('GEOMATH_PNG_CHUNK', encoded[offset:offset + 4096])
    print('GEOMATH_PNG_END', name)

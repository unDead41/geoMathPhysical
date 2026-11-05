"""Conservative paint guard for ADB PNG captures; never changes returned pixels.

A current XML state and stable painted title are independent requirements.
This rejects a Flutter splash while accessibility already exposes the next UI.
It does not prove that a WebView model, form, or hosted service works: callers
must require that state's own semantic labels before invoking this guard.
Only non-interlaced 8-bit RGB/RGBA ADB PNGs are supported, using the stdlib.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import binascii
import struct
import subprocess
import time
from typing import Callable, Sequence
import xml.etree.ElementTree as ET
import zlib


class PaintReadinessError(RuntimeError):
    """No independently corroborated painted state appeared within the budget."""


@dataclass(frozen=True)
class PaintSample:
    width: int
    height: int
    header_ink_fraction: float
    signature: bytes

    @property
    def has_painted_header(self) -> bool:
        # A title/icon needs visible ink away from the Android status bar.
        return self.header_ink_fraction >= 0.002


def _paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
    return a if pa <= pb and pa <= pc else b if pb <= pc else c


def sample_png(data: bytes) -> PaintSample:
    """Decode an original ADB PNG and sample its title and content regions."""
    if not isinstance(data, bytes) or not data.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Capture is not a PNG.')
    width = height = channels = 0
    compressed = bytearray()
    position = 8
    ended = False
    while position + 12 <= len(data):
        size = struct.unpack_from('>I', data, position)[0]
        kind = data[position+4:position+8]
        end = position + 12 + size
        if end > len(data):
            raise ValueError('PNG chunk is truncated.')
        payload = data[position+8:position+8+size]
        expected_crc = struct.unpack_from('>I', data, position+8+size)[0]
        if binascii.crc32(kind+payload) & 0xffffffff != expected_crc:
            raise ValueError('PNG chunk checksum failed.')
        if kind == b'IHDR':
            if width or size != 13:
                raise ValueError('Invalid PNG header.')
            width, height, depth, colour, compression, filtering, interlace = struct.unpack(
                '>IIBBBBB', payload)
            if (depth != 8 or colour not in (2, 6) or compression or filtering or interlace):
                raise ValueError('Unsupported ADB PNG encoding.')
            if width < 32 or height < 64 or width * height > 16_000_000:
                raise ValueError('PNG dimensions are outside the capture budget.')
            channels = 4 if colour == 6 else 3
        elif kind == b'IDAT':
            if not width:
                raise ValueError('PNG pixels precede the header.')
            compressed.extend(payload)
            if len(compressed) > 32_000_000:
                raise ValueError('PNG compressed pixels exceed the capture budget.')
        elif kind == b'IEND':
            ended = True
            break
        position = end
    if not ended or not compressed or not width:
        raise ValueError('PNG is incomplete.')
    stride = width * channels
    expected = height * (stride + 1)
    decoder = zlib.decompressobj()
    try:
        raw = decoder.decompress(bytes(compressed), expected + 1)
    except zlib.error as error:
        raise ValueError('PNG pixels cannot be decompressed.') from error
    if len(raw) != expected or not decoder.eof:
        raise ValueError('PNG pixel length is invalid.')
    pixels = bytearray(height * stride)
    cursor = 0
    previous = bytearray(stride)
    for y in range(height):
        method = raw[cursor]
        cursor += 1
        row = bytearray(raw[cursor:cursor+stride])
        cursor += stride
        if method not in (0, 1, 2, 3, 4):
            raise ValueError('Unknown PNG row filter.')
        for x in range(stride):
            a = row[x-channels] if x >= channels else 0
            b = previous[x]
            c = previous[x-channels] if x >= channels else 0
            predictor = (0 if method == 0 else a if method == 1 else b if method == 2
                         else (a+b)//2 if method == 3 else _paeth(a, b, c))
            row[x] = (row[x] + predictor) & 255
        pixels[y*stride:(y+1)*stride] = row
        previous = row

    def pixel(x: int, y: int) -> tuple[int, int, int]:
        offset = y*stride + x*channels
        rgb = tuple(pixels[offset:offset+3])
        if channels == 4:
            alpha = pixels[offset+3]
            rgb = tuple((c*alpha + 255*(255-alpha))//255 for c in rgb)
        return rgb

    # Header: exclude Android status bar and bottom/system navigation. A splash
    # logo in the middle cannot satisfy this separate title-region requirement.
    header = [pixel(int(width*(.05 + .90*x/95)), int(height*(.04 + .14*y/23)))
              for y in range(24) for x in range(96)]
    dominant = Counter(tuple(c//16 for c in rgb) for rgb in header).most_common(1)[0][0]
    background = tuple(c*16 + 8 for c in dominant)
    ink = sum(max(abs(a-b) for a, b in zip(rgb, background)) > 48 for rgb in header)
    # A fixed-size signature excludes status-clock and OS navigation pixels.
    signature = bytes(c for y in range(48) for x in range(32)
                      for c in pixel(int(width*(.05+.90*x/31)),
                                     int(height*(.06+.80*y/47))))
    return PaintSample(width, height, ink/len(header), signature)


def hierarchy_matches(
    hierarchy: bytes | str | ET.Element,
    expected_label_groups: Sequence[Sequence[str]],
) -> bool:
    """Every required group needs one actual label; alternatives are localized."""
    if not expected_label_groups or any(not group for group in expected_label_groups):
        raise ValueError('Explicit expected XML labels are required.')
    root = hierarchy if isinstance(hierarchy, ET.Element) else ET.fromstring(hierarchy)
    labels = set()
    for node in root.iter('node'):
        for value in (node.get('text', ''), node.get('content-desc', '')):
            labels.update(line.strip().casefold() for line in value.splitlines() if line.strip())
    return all(any(value.strip().casefold() in labels for value in group)
               for group in expected_label_groups)


def samples_are_stable(a: PaintSample, b: PaintSample) -> bool:
    if (a.width, a.height) != (b.width, b.height):
        return False
    difference = sum(abs(x-y) for x, y in zip(a.signature, b.signature)) / len(a.signature)
    return difference <= 1.5


def wait_for_painted_screen(
    capture_png: Callable[[], bytes],
    read_hierarchy: Callable[[], bytes | str | ET.Element],
    expected_label_groups: Sequence[Sequence[str]],
    *,
    timeout_seconds: float = 15,
    poll_seconds: float = .35,
    clock: Callable[[], float] = time.monotonic,
    sleep: Callable[[float], None] = time.sleep,
    on_observation: Callable[[dict], None] | None = None,
) -> bytes:
    """Return the last ORIGINAL PNG only after XML+header+two stable samples.

    Callbacks must perform fresh reads and have their own bounded subprocess
    timeouts. Empty/transient XML and malformed PNGs retry inside this budget.
    No fallback image, screenshot mutation or success on title ink alone occurs.
    """
    if timeout_seconds <= 0 or timeout_seconds > 60 or poll_seconds <= 0:
        raise ValueError('Paint wait must have a positive bounded budget.')
    # Validate caller intent before retrying transient device reads.
    if not expected_label_groups or any(not group for group in expected_label_groups):
        raise ValueError('Explicit expected XML labels are required.')
    deadline = clock() + timeout_seconds
    previous = None
    last = {'xml_ready': False, 'painted_header': False, 'stable': False}
    while clock() < deadline:
        try:
            xml_ready = hierarchy_matches(read_hierarchy(), expected_label_groups)
            if xml_ready:
                original = capture_png()
                sample = sample_png(original)
                stable = previous is not None and samples_are_stable(previous, sample)
                last = {'xml_ready': True, 'painted_header': sample.has_painted_header,
                        'header_ink_fraction': round(sample.header_ink_fraction, 6), 'stable': stable}
                if clock() >= deadline:
                    break
                if sample.has_painted_header and stable:
                    if on_observation:
                        on_observation(last)
                    return original
                previous = sample if sample.has_painted_header else None
            else:
                previous = None
                last = {'xml_ready': False, 'painted_header': False, 'stable': False}
        except (ValueError, ET.ParseError, OSError, subprocess.SubprocessError) as error:
            previous = None
            last = {'xml_ready': False, 'painted_header': False, 'stable': False,
                    'transient_error': type(error).__name__}
        if on_observation:
            on_observation(last)
        remaining = deadline - clock()
        if remaining > 0:
            sleep(min(poll_seconds, remaining))
    raise PaintReadinessError(f'Expected XML and stable painted UI were not corroborated: {last}')

"""Small synthetic parser fixtures only; no generated UI or deliverable images."""
import binascii
import importlib.util
from pathlib import Path
import struct
import sys
import unittest
import zlib

SPEC = importlib.util.spec_from_file_location('paint_readiness', Path(__file__).parents[1]/'paint_readiness.py')
paint = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = paint
SPEC.loader.exec_module(paint)


def png(*, title=False, logo=False, dark=False, colour=6, method=0):
    width, height = 96, 160
    channels = 4 if colour == 6 else 3
    background = (16, 24, 32) if dark else (255, 255, 255)
    ink = (250, 250, 250) if dark else (20, 40, 60)
    rows = []
    for y in range(height):
        row = bytearray()
        for x in range(width):
            rgb = ink if title and 12 <= y < 20 and 10 <= x < 60 else background
            if logo and 65 <= y < 95 and 35 <= x < 60:
                rgb = (40, 160, 220)
            row.extend((*rgb, 255) if channels == 4 else rgb)
        rows.append(row)
    raw = bytearray()
    previous = bytearray(width*channels)
    for row in rows:
        raw.append(method)
        for x, value in enumerate(row):
            a = row[x-channels] if x >= channels else 0
            b = previous[x]
            c = previous[x-channels] if x >= channels else 0
            predictor = (0 if method == 0 else a if method == 1 else b if method == 2
                         else (a+b)//2 if method == 3 else paint._paeth(a, b, c))
            raw.append((value-predictor)&255)
        previous = row
    def chunk(kind, payload):
        return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',binascii.crc32(kind+payload)&0xffffffff)
    return (b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,colour,0,0,0))
            +chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))


XML = b'<hierarchy><node text="GeoMath"/><node content-desc="Ready&#10;Explore"/></hierarchy>'
GROUPS = (('GeoMath',), ('Ready', 'Sedia'))


class Timer:
    def __init__(self): self.value = 0
    def clock(self): return self.value
    def sleep(self, value): self.value += value


class PaintReadinessTest(unittest.TestCase):
    def test_all_png_filters_and_rgb_rgba_decode_the_same_actual_pixels(self):
        expected = paint.sample_png(png(title=True))
        for colour in (2, 6):
            for method in range(5):
                with self.subTest(colour=colour,method=method):
                    self.assertEqual(paint.sample_png(png(title=True,colour=colour,method=method)),expected)

    def test_truncated_or_checksum_failed_png_is_not_accepted(self):
        original = png(title=True)
        for broken in (original[:30], original[:-10], original[:60]+b'x'+original[61:]):
            with self.assertRaises(ValueError): paint.sample_png(broken)

    def test_center_splash_logo_cannot_satisfy_painted_header(self):
        self.assertFalse(paint.sample_png(png(logo=True)).has_painted_header)
        self.assertTrue(paint.sample_png(png(title=True)).has_painted_header)
        self.assertTrue(paint.sample_png(png(title=True,dark=True)).has_painted_header)

    def test_xml_labels_are_required_independently_of_visible_header(self):
        self.assertTrue(paint.hierarchy_matches(XML,GROUPS))
        self.assertFalse(paint.hierarchy_matches(XML,(('Other screen',),)))
        with self.assertRaises(ValueError): paint.hierarchy_matches(XML,())

    def test_stale_ready_xml_and_splash_retry_then_return_original_stable_bytes(self):
        timer = Timer()
        loaded = png(title=True)
        frames = iter([png(logo=True), loaded, loaded])
        observations = []
        result = paint.wait_for_painted_screen(lambda:next(frames),lambda:XML,GROUPS,
            clock=timer.clock,sleep=timer.sleep,on_observation=observations.append)
        self.assertIs(result,loaded)
        self.assertFalse(observations[0]['painted_header'])
        self.assertTrue(observations[-1]['stable'])
        self.assertGreaterEqual(timer.value,.7)

    def test_header_alone_without_expected_xml_never_succeeds(self):
        timer = Timer()
        with self.assertRaises(paint.PaintReadinessError):
            paint.wait_for_painted_screen(lambda:png(title=True),lambda:XML,(('Missing',),),
                timeout_seconds=1,clock=timer.clock,sleep=timer.sleep)
        self.assertEqual(timer.value,1)

    def test_empty_xml_is_transient_and_wait_is_bounded(self):
        timer = Timer()
        with self.assertRaises(paint.PaintReadinessError):
            paint.wait_for_painted_screen(lambda:png(title=True),lambda:b'',GROUPS,
                timeout_seconds=1,clock=timer.clock,sleep=timer.sleep)
        self.assertEqual(timer.value,1)

    def test_unstable_paint_never_succeeds_with_expected_xml(self):
        timer = Timer(); counter = [0]
        def capture():
            counter[0] += 1
            return png(title=True,dark=counter[0]%2==0)
        with self.assertRaises(paint.PaintReadinessError):
            paint.wait_for_painted_screen(capture,lambda:XML,GROUPS,
                timeout_seconds=1,clock=timer.clock,sleep=timer.sleep)


if __name__ == '__main__': unittest.main()

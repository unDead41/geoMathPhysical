"""Replay exact recorded PNG/XML fixtures; does not create or edit any image."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

SPEC = importlib.util.spec_from_file_location('paint_readiness', Path(__file__).parents[1]/'paint_readiness.py')
paint = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = paint
SPEC.loader.exec_module(paint)


class Timer:
    def __init__(self): self.now = 0
    def clock(self): return self.now
    def sleep(self, seconds): self.now += seconds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--evidence',type=Path,required=True)
    parser.add_argument('--receipt',type=Path,required=True)
    args = parser.parse_args()
    prefix = '320dp-ms-light-100-contrast0-'
    cases = [
        ('splash_despite_home_xml', '01-home-offline.png', '014-hierarchy.xml',
         (('GeoMath',), ('Hai, peneroka!',)), False),
        ('actual_settings', '37-settings.png', '012-hierarchy.xml',
         (('Tetapan',), ('Kontras tinggi',)), True),
        ('actual_learning_hub', '41-learning-hub.png', '017-hierarchy.xml',
         (('Belajar',), ('Mula teroka',)), True),
    ]
    results=[]
    for name, image, xml, groups, accepted in cases:
        png_path=args.evidence/(prefix+image)
        xml_path=args.evidence/(prefix+xml)
        original=png_path.read_bytes()
        hierarchy=xml_path.read_bytes()
        sample=paint.sample_png(original)
        xml_ready=paint.hierarchy_matches(hierarchy,groups)
        assert xml_ready, name
        timer=Timer()
        returned=None
        try:
            returned=paint.wait_for_painted_screen(lambda:original,lambda:hierarchy,groups,
                timeout_seconds=1,clock=timer.clock,sleep=timer.sleep)
            actual=True
        except paint.PaintReadinessError:
            actual=False
        assert actual == accepted,(name,actual,accepted)
        if returned is not None:
            assert returned is original
        results.append({
            'case':name,'png':png_path.name,'png_sha256':hashlib.sha256(original).hexdigest(),
            'xml':xml_path.name,'xml_sha256':hashlib.sha256(hierarchy).hexdigest(),
            'xml_ready':xml_ready,'header_ink_fraction':sample.header_ink_fraction,
            'expected_accepted':accepted,'accepted':actual,
            'original_bytes_returned':None if returned is None else returned is original,
            'result':'passed',
        })
    receipt={
        'schema_version':1,
        'fixture_source_commit':(args.evidence/'source-commit.txt').read_text().strip(),
        'fixture_ci_run':42053609842,
        'scope':'Recorded actual PNG/XML regression; same recorded loaded PNG is replayed for two stable samples. This does not prove live-device paint stability or fix the failed source.',
        'command':'python3 tools/android/tests/regression_paint_from_evidence.py --evidence <extracted-deceaaf-artifact> --receipt docs/handoffs/app-integration/paint-guard-regression.json',
        'exit_code':0,'passed':len(results),'failed':0,'cases':results,
        'image_mutations':0,'new_deliverable_images':0,
    }
    args.receipt.parent.mkdir(parents=True,exist_ok=True)
    args.receipt.write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps({'passed':len(results),'failed':0,'receipt':str(args.receipt)}))


if __name__=='__main__':main()

#!/usr/bin/env python3
"""Exercise the real current bank and fail-closed script-pack validation."""
from pathlib import Path
import importlib.util
import json
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('question_audio', ROOT / 'tools/question_audio.py')
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


class CurrentAudioPackTests(unittest.TestCase):
    def test_real_bank_preserves_focus_and_wrong_answer_explanation(self):
        bank = audio.parse_bank((ROOT / 'main/question_bank.h').read_text())
        self.assertEqual(len(bank), 15)
        self.assertEqual({qid for qid, q in bank.items() if q['focus'] == 'NET'},
                         {'P3', 'C3', 'K3', 'B3', 'S3'})
        self.assertEqual(bank['P1']['focus'], 'SOLID')
        self.assertEqual(bank['P1']['explanation_lcd'], ['Tapak persegi dan', '4 muka segi tiga.'])

    def test_legacy_numeric_reader_format_is_rejected(self):
        bank = (ROOT / 'main/question_bank.h').read_text().replace('QuestionFocus::SOLID', '0', 1)
        with self.assertRaisesRegex(ValueError, 'format changed'):
            audio.parse_bank(bank)

    def test_current_exports_and_speech_are_exact(self):
        data = audio.load_manifest(ROOT)
        outputs = audio.render_exports(data)
        self.assertEqual(sum(p.endswith('.txt') for p in outputs), 30)
        for path, text in outputs.items():
            self.assertEqual((ROOT / path).read_bytes(), text.encode(), path)

    def test_changed_runtime_bank_cannot_silently_refresh_scripts(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            (root / 'main').mkdir()
            (root / 'audio/elevenlabs').mkdir(parents=True)
            (root / 'audio/elevenlabs/manifest.json').write_bytes((ROOT / 'audio/elevenlabs/manifest.json').read_bytes())
            (root / 'main/question_bank.h').write_bytes((ROOT / 'main/question_bank.h').read_bytes() + b'// drift')
            with self.assertRaisesRegex(ValueError, 'Runtime bank drift'):
                audio.load_manifest(root)


if __name__ == '__main__':
    unittest.main()

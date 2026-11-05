"""Protocol/bounds fixtures; these do not simulate successful Android scrolling."""
import importlib.util
from pathlib import Path
import sys
import unittest
import xml.etree.ElementTree as ET

SPEC = importlib.util.spec_from_file_location('module_scroll',Path(__file__).parents[1]/'module_scroll.py')
scroll = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name]=scroll
SPEC.loader.exec_module(scroll)


def fixture(*, canvas='[44,1051][576,1185]', outer='[0,571][640,1184]', inner='[0,571][640,1185]'):
    return ET.fromstring(f'''<hierarchy><node class="android.widget.ScrollView" bounds="[0,192][640,569]"/>
      <node class="android.webkit.WebView" bounds="{outer}">
      <node class="android.webkit.WebView" bounds="{inner}">
      <node class="android.widget.Image" content-desc="Kubus, Bongkah 3D, muka berwarna" bounds="{canvas}"/>
      </node></node></hierarchy>''')


class ModuleScrollTest(unittest.TestCase):
    def test_both_endpoints_use_actual_webview_and_never_native_header_or_canvas(self):
        root=fixture();canvas=list(root.iter('node'))[-1]
        gesture=scroll.module_margin_swipe(root,canvas)
        self.assertEqual(gesture.webview_bounds,(0,571,640,1184))
        self.assertEqual(gesture.canvas_bounds,(44,1051,576,1185))
        self.assertLess(gesture.x,44)
        self.assertGreater(gesture.end_y,571)
        self.assertLess(gesture.start_y,1184)
        self.assertGreater(gesture.start_y,gesture.end_y)
        self.assertNotEqual(gesture.end_y,1440//3)  # Old gesture left WebView.

    def test_right_gutter_is_used_when_left_margin_is_absent(self):
        root=fixture(canvas='[0,1051][576,1185]')
        gesture=scroll.module_margin_swipe(root,list(root.iter('node'))[-1])
        self.assertGreater(gesture.x,576)
        self.assertLess(gesture.x,640)

    def test_missing_webview_bounds_fails_explicitly(self):
        root=ET.fromstring('<hierarchy><node class="android.widget.Image" content-desc="Cube, 3D solid" bounds="[44,1051][576,1185]"/></hierarchy>')
        with self.assertRaisesRegex(RuntimeError,'no Android WebView'):
            scroll.module_margin_swipe(root,list(root.iter('node'))[-1])
        root=fixture(outer='')
        with self.assertRaisesRegex(RuntimeError,'no usable visible bounds'):
            scroll.module_margin_swipe(root,list(root.iter('node'))[-1])

    def test_canvas_filling_width_has_no_safe_scroll_margin(self):
        root=fixture(canvas='[0,1051][640,1185]')
        with self.assertRaisesRegex(RuntimeError,'No visible document margin'):
            scroll.module_margin_swipe(root,list(root.iter('node'))[-1])

    def test_native_label_or_stale_canvas_never_supplies_scroll_coordinates(self):
        root=fixture();canvas=list(root.iter('node'))[-1]
        canvas.set('class','android.view.View')
        with self.assertRaisesRegex(RuntimeError,'real canonical cube image'):
            scroll.module_margin_swipe(root,canvas)
        stale=fixture();stale_canvas=list(stale.iter('node'))[-1]
        with self.assertRaisesRegex(RuntimeError,'current Android hierarchy'):
            scroll.module_margin_swipe(root,stale_canvas)


if __name__=='__main__':unittest.main()

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



class CubeReadinessTest(unittest.TestCase):
    def tree(self, *, canvas='[44,575][576,1121]', picker='true', enabled='true',
             description='Kubus, Bongkah 3D, muka berwarna'):
        root=fixture(canvas=canvas)
        button=ET.SubElement(root,'node',{'class':'android.widget.Button',
             'content-desc':'Bongkah\nKubus','clickable':picker,'enabled':enabled,
             'bounds':'[24,488][616,569]'})
        list(root.iter('node'))[-2].set('content-desc',description)
        return root

    def test_full_canvas_and_native_picker_are_both_required(self):
        self.assertTrue(scroll.inspect_cube(self.tree()).ready)
        for clickable, enabled in [('false','true'),('true','false'),('','true')]:
            state=scroll.inspect_cube(self.tree(picker=clickable,enabled=enabled))
            self.assertFalse(state.ready)
            self.assertEqual(state.picker_state,'not_ready')
        root=fixture(canvas='[44,575][576,1121]')
        self.assertEqual(scroll.inspect_cube(root).picker_state,'missing')

    def test_webview_button_cannot_impersonate_native_picker(self):
        root=self.tree()
        button=list(root)[-1]
        root.remove(button)
        list(root)[1].append(button)
        self.assertEqual(scroll.inspect_cube(root).picker_state,'missing')

    def test_placeholder_never_counts_as_loaded(self):
        state=scroll.inspect_cube(self.tree(description='Interactive cube model'))
        self.assertFalse(state.ready)
        self.assertIsNone(state.canvas)

    def test_visible_height_alone_does_not_accept_clipped_canvas(self):
        for bounds in ('[44,1051][576,1185]', '[44,571][576,1117]'):
            self.assertFalse(scroll.inspect_cube(self.tree(canvas=bounds)).ready)

    def test_adaptive_up_drag_aligns_top_without_full_viewport_fling(self):
        root=fixture(canvas='[44,1149][716,1433]',outer='[0,665][780,1432]',inner='[0,665][780,1433]')
        gesture=scroll.module_margin_swipe(root,list(root.iter('node'))[-1])
        self.assertEqual(gesture.start_y-gesture.end_y,468)
        self.assertEqual(gesture.duration_ms,1000)
        self.assertLess(gesture.x,44)

    def test_top_clipped_canvas_uses_downward_drag(self):
        root=fixture(canvas='[44,571][576,1000]')
        gesture=scroll.module_margin_swipe(root,list(root.iter('node'))[-1])
        self.assertGreater(gesture.end_y,gesture.start_y)
        self.assertEqual(gesture.end_y-gesture.start_y,168)

    def test_both_clipped_edges_fail_explicitly(self):
        root=fixture(canvas='[44,571][576,1185]')
        with self.assertRaisesRegex(RuntimeError,'both viewport edges'):
            scroll.module_margin_swipe(root,list(root.iter('node'))[-1])


if __name__=='__main__':unittest.main()

"""Choose a document-scroll gesture inside the current WebView, off its canvas."""
from dataclasses import dataclass
import re
import xml.etree.ElementTree as ET


def node_bounds(node):
    values = tuple(int(value) for value in re.findall(r'-?\d+', node.get('bounds', '')))
    if len(values) != 4 or values[2] <= values[0] or values[3] <= values[1]:
        raise RuntimeError('Actual Android node has no usable visible bounds.')
    return values


@dataclass(frozen=True)
class ModuleSwipe:
    x: int
    start_y: int
    end_y: int
    webview_bounds: tuple[int, int, int, int]
    canvas_bounds: tuple[int, int, int, int]
    duration_ms: int = 1000


def module_viewport(root: ET.Element, canvas: ET.Element):
    """Use fresh XML ancestry; never fall back to a screen-wide/native swipe."""
    description = (canvas.get('content-desc', '')+' '+canvas.get('text', '')).casefold()
    names = ('model interaktif kubus', 'interactive cube model',
             'kubus, bongkah 3d', 'cube, 3d solid')
    if canvas.get('class') != 'android.widget.Image' or not any(name in description for name in names):
        raise RuntimeError('A real canonical cube image is required for module scrolling.')
    parents = {child: parent for parent in root.iter() for child in parent}
    if canvas not in parents:
        raise RuntimeError('Canvas does not belong to the current Android hierarchy.')
    views = []
    current = canvas
    while current in parents:
        current = parents[current]
        if current.get('class') == 'android.webkit.WebView':
            views.append(node_bounds(current))
    if not views:
        raise RuntimeError('Current canonical canvas has no Android WebView bounds.')
    # Nested WebView nodes can differ by a clipped pixel. Both touch endpoints
    # must stay inside every actual containing viewport, away from native UI.
    viewport = (max(box[0] for box in views), max(box[1] for box in views),
                min(box[2] for box in views), min(box[3] for box in views))
    left, top, right, bottom = viewport
    model = node_bounds(canvas)
    if (right-left < 32 or bottom-top < 64 or model[2] <= left or model[0] >= right
            or model[3] <= top or model[1] >= bottom):
        raise RuntimeError('Current canvas and WebView do not share a usable visible viewport.')
    return viewport, model


def module_margin_swipe(root: ET.Element, canvas: ET.Element) -> ModuleSwipe:
    """Align the clipped canvas in a safe gutter; never fling by screen height."""
    viewport, model = module_viewport(root, canvas)
    left, top, right, bottom = viewport
    top_clipped = model[1] < top+2
    bottom_clipped = model[3] > bottom-2
    if top_clipped and bottom_clipped:
        raise RuntimeError("Canonical canvas spans both viewport edges; full-canvas capture is unavailable.")
    if bottom_clipped:
        distance = model[1]-(top+16)
        direction = -1
    elif top_clipped:
        distance = (bottom-16)-model[3]
        direction = 1
    else:
        raise RuntimeError("Canonical canvas is already vertically contained; no scroll is needed.")
    if distance <= 0:
        raise RuntimeError("Canonical canvas cannot be aligned within the current WebView.")
    inset = max(4, min(12, (right-left)//80))
    # Prefer the left document gutter, avoiding the canvas' rotate handler and
    # the browser scrollbar at the right edge. Use right only if left is absent.
    gutters = ((left+inset, min(model[0]-inset, right-inset)),
               (max(model[2]+inset, left+inset), right-inset))
    gutter = next(((a, b) for a, b in gutters if b-a >= 4), None)
    if gutter is None:
        raise RuntimeError('No visible document margin outside the canonical canvas is available.')
    x = (gutter[0]+gutter[1])//2
    padding = 12
    distance = min(distance, bottom-top-2*padding)
    start = bottom-padding if direction < 0 else top+padding
    end = start+direction*distance
    if not (left < x < right and top < min(start, end) < max(start, end) < bottom
            and (x < model[0] or x > model[2])):
        raise RuntimeError('Computed module gesture would leave its WebView or touch the canvas.')
    return ModuleSwipe(x, start, end, viewport, model)


@dataclass(frozen=True)
class CubeReadiness:
    canvas: ET.Element | None
    picker_state: str
    fully_visible: bool
    reason: str

    @property
    def ready(self):
        return self.picker_state == 'ready' and self.fully_visible


def inspect_cube(root: ET.Element) -> CubeReadiness:
    """Bounded XML precondition, not proof that the raster contains geometry.

    Flutter exposes a disabled dropdown as enabled=true, clickable=false, so
    both attributes are required. Placeholder image labels are never ready.
    """
    parents = {child: parent for parent in root.iter() for child in parent}
    picker_state = 'missing'
    canvas = None
    for node in root.iter('node'):
        text = (node.get('content-desc', '')+' '+node.get('text', '')).casefold()
        if node.get('class') == 'android.widget.Button':
            words = text.split()
            if words in (['solid', 'cube'], ['bongkah', 'kubus']):
                current = node
                inside_webview = False
                while current in parents:
                    current = parents[current]
                    if current.get('class') == 'android.webkit.WebView':
                        inside_webview = True
                if not inside_webview:
                    try:
                        node_bounds(node)
                        visible = True
                    except RuntimeError:
                        visible = False
                    picker_state = ('ready' if visible and node.get('enabled') == 'true' and
                                    node.get('clickable') == 'true' else 'not_ready')
        if (node.get('class') == 'android.widget.Image' and
                any(name in text for name in ('kubus, bongkah 3d', 'cube, 3d solid'))):
            canvas = node
    if canvas is None:
        return CubeReadiness(None, picker_state, False, 'final canonical cube description absent')
    viewport, box = module_viewport(root, canvas)
    left, top, right, bottom = viewport
    full = (box[2]-box[0] >= 128 and box[3]-box[1] >= 200 and
            left+2 <= box[0] and box[2] <= right-2 and
            top+2 <= box[1] and box[3] <= bottom-2)
    reason = ('ready XML preconditions' if full and picker_state == 'ready' else
              f'native picker {picker_state}; full canvas {full}')
    return CubeReadiness(canvas, picker_state, full, reason)

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


def module_margin_swipe(root: ET.Element, canvas: ET.Element) -> ModuleSwipe:
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
    inset = max(4, min(12, (right-left)//80))
    # Prefer the left document gutter, avoiding the canvas' rotate handler and
    # the browser scrollbar at the right edge. Use right only if left is absent.
    gutters = ((left+inset, min(model[0]-inset, right-inset)),
               (max(model[2]+inset, left+inset), right-inset))
    gutter = next(((a, b) for a, b in gutters if b-a >= 4), None)
    if gutter is None:
        raise RuntimeError('No visible document margin outside the canonical canvas is available.')
    x = (gutter[0]+gutter[1])//2
    padding = max(12, (bottom-top)//10)
    start, end = bottom-padding, top+padding
    if not (left < x < right and top < end < start < bottom
            and (x < model[0] or x > model[2])):
        raise RuntimeError('Computed module gesture would leave its WebView or touch the canvas.')
    return ModuleSwipe(x, start, end, viewport, model)

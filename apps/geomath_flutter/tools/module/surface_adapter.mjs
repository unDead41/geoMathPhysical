/** Presentation/checkpoint adapter for the pinned canonical module, not a math port.
 * All geometry, measures, selections and guided gates remain canonical functions.
 * The exporter injects surfaceAdapterSource() inside the canonical IIFE, after
 * startup. Function declarations are hoisted so the shared palette resolver can
 * delegate to geomathSurfaceFaceColor even during the first canonical render.
 */
function geomathSurfaceFaceIdentity(shape, id, context = {}) {
  if (!Number.isInteger(id) || id < 0) return null;
  if (shape === 'composite') {
    if (!['roof', 'rocket'].includes(context.kind)) return null;
    const upper = id >= 10;
    const solid = context.kind === 'roof'
      ? (upper ? 'pyramid' : 'cube') : (upper ? 'cone' : 'cylinder');
    const identity = geomathSurfaceFaceIdentity(solid, upper ? id - 10 : id);
    return identity && {...identity, constituent: upper ? 'upper' : 'lower'};
  }
  if (shape === 'cavity' || context.mode === 'cavity') {
    if (id > 15) return null;
    const groups = ['outer', 'inner', 'top', 'bottom'];
    const group = groups[Math.floor(id / 4)];
    const direction = id < 8 ? ['front', 'back', 'left', 'right'][id % 4] : group;
    return {shapeId: 'rectangular-cavity', stableFaceId: id,
      surface: group + ':' + direction, group};
  }
  const counts = {cube: 6, cuboid: 6, pyramid: 5, cylinder: 3, cone: 2,
    'triangular-prism': 5, tetrahedron: 4, 'pentagonal-prism': 7,
    'hexagonal-prism': 8, sphere: 1, hemisphere: 2};
  if (!Object.hasOwn(counts, shape) || id >= counts[shape]) return null;
  const box = shape === 'cube' || shape === 'cuboid';
  const surface = box ? ['front', 'right', 'back', 'left', 'top', 'bottom'][id]
    : shape === 'cylinder' ? ['curved', 'top', 'bottom'][id]
    : shape === 'cone' || shape === 'hemisphere' ? ['curved', 'base'][id]
    : shape === 'sphere' ? 'curved'
    : shape === 'pyramid' || shape === 'tetrahedron' ? (id === 0 ? 'base' : 'side:' + id)
    : id === counts[shape] - 2 ? 'top' : id === counts[shape] - 1 ? 'bottom' : 'side:' + id;
  return {shapeId: shape, stableFaceId: id, surface};
}

function geomathSurfaceFaceColor(shape, id, context = {}) {
  const identity = geomathSurfaceFaceIdentity(shape, id, context);
  if (!identity) return null;
  const palette = ['#4C8DFF', '#F69B45', '#E9799B', '#42B883', '#F4C95D', '#9B7EDC', '#83D0EA', '#DAAE8D'];
  if (identity.shapeId === 'rectangular-cavity') {
    if (identity.group === 'outer') return palette[[0, 2, 3, 1][id]];
    return identity.group === 'inner' ? palette[2] : identity.group === 'top' ? palette[4] : palette[5];
  }
  if (identity.shapeId === 'cube' || identity.shapeId === 'cuboid') return palette[identity.stableFaceId];
  if (identity.surface === 'curved') return palette[0];
  if (identity.surface === 'top') return palette[4];
  if (identity.surface === 'bottom' || identity.surface === 'base') return palette[5];
  // Each entry is a real side of this solid. Repeated colours never add faces.
  const offset = identity.shapeId === 'pyramid' || identity.shapeId === 'tetrahedron' ? 1 : 0;
  return palette[identity.stableFaceId - offset];
}

function geomathSurfacePaintMesh(shape, mesh, context = {}) {
  return mesh.map(face => {
    const identity = geomathSurfaceFaceIdentity(shape, face.id, context);
    if (!identity) return face;
    const color = geomathSurfaceFaceColor(shape, face.id, context);
    // Retain exact vertex arrays, winding, rim/cut indices, names and groups.
    return {...face, color, sourceShapeId: identity.shapeId,
      stableFaceId: identity.stableFaceId, surfaceSemantic: identity.surface,
      ...(identity.constituent ? {constituent: identity.constituent} : {})};
  });
}

function geomathSurfaceLaunch(section, shape, mode) {
  if (!['area', 'composite'].includes(section)) return false;
  if (section === 'area' && shape != null && !MODEL_ORDER.includes(shape)) return false;
  if (mode != null && !(section === 'area' ? ['closed', 'container', 'cavity'] : ['roof', 'rocket']).includes(mode)) return false;
  switchLearningView('labs');
  learningLabs.openActivity(section);
  const change = (id, value) => {
    const node = document.getElementById(id);
    if (node.value === value) return;
    node.value = value;
    node.dispatchEvent(new Event('change', {bubbles: true}));
  };
  if (section === 'area') {
    if (shape != null) change('area-shape', shape);
    if (mode != null) change('area-mode', mode);
  } else if (mode != null) change('comp-kind', mode);
  return true;
}

function geomathSurfaceSnapshot() {
  if (!learningLabs.ready) return null;
  const area = learningLabs.area, workshop = learningLabs.workshop, comp = learningLabs.comp;
  return {version: 1,
    area: {mode: area.mode, shape: area.shape, dimensions: {...area.d},
      progress: area.progress, selected: [...area.selected]},
    workshop: {shape: workshop.shape, closed: workshop.closed,
      dimensions: {...workshop.d}, selected: [...workshop.selected]},
    composite: {kind: comp.kind, size: comp.size, h: comp.h, t: comp.t,
      joined: comp.joined, selected: [...comp.selected]}};
}

function geomathSurfaceValidateSnapshot(data) {
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
  const range = (value, min, max, step = null) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (step === null || Number.isInteger(value / step));
  const selection = (value, allowed) => Array.isArray(value) && value.length <= allowed.length && new Set(value).size === value.length && value.every(id => allowed.includes(id));
  if (!exact(data, ['version', 'area', 'workshop', 'composite']) || data.version !== 1) return false;
  const a = data.area, w = data.workshop, c = data.composite;
  if (!exact(a, ['mode', 'shape', 'dimensions', 'progress', 'selected']) || !['closed', 'container', 'cavity'].includes(a.mode) || !MODEL_ORDER.includes(a.shape)) return false;
  const fields = MEASURE_FIELDS[a.shape];
  if (!exact(a.dimensions, fields) || !fields.every(key => range(a.dimensions[key], 1, 10, 1)) || !range(a.progress, 0, 1)) return false;
  if (MODEL_DATA[a.shape].noNet && a.progress !== 0) return false;
  if (!selection(a.selected, studySurfacePieces(a.shape, a.dimensions).map(p => p.id))) return false;
  if (!exact(w, ['shape', 'closed', 'dimensions', 'selected']) || !['cuboid', 'cylinder'].includes(w.shape) || typeof w.closed !== 'boolean' || !exact(w.dimensions, ['p', 'l', 't', 'j', 'u', 'v'])) return false;
  const d = w.dimensions;
  if (!range(d.p, 3, 10, 1) || !range(d.l, 3, 10, 1) || !range(d.t, 1, 10, 1) || !range(d.j, 1, 8, 1) || !range(d.u, .5, d.p - .5, .5) || !range(d.v, .5, d.l - .5, .5)) return false;
  const parts = a.mode === 'cavity' ? holeMeasures(d).parts : containerMeasures(w.shape, d, w.closed).parts;
  if (!selection(w.selected, parts.map(p => p.key))) return false;
  if (!exact(c, ['kind', 'size', 'h', 't', 'joined', 'selected']) || !['roof', 'rocket'].includes(c.kind) || !['size', 'h', 't'].every(key => range(c[key], 1, 8, 1)) || !range(c.joined, 0, 1)) return false;
  return selection(c.selected, ['side', 'bottom', 'joinLower', 'joinUpper', 'roofSide']);
}

function geomathSurfaceRestore(data) {
  // Validate every field before touching live state; no validation has side effects.
  if (!geomathSurfaceValidate(data)) return false;
  if (data === null) return true;
  learningLabs.init();
  learningLabs.stop();
  const a = data.area, w = data.workshop, c = data.composite;
  Object.assign(learningLabs.area, {mode: a.mode, shape: a.shape, d: {...a.dimensions},
    progress: a.progress, selected: new Set(a.selected), focus: null, focusPending: false, dirty: true});
  Object.assign(learningLabs.workshop, {mode: a.mode, shape: w.shape, closed: w.closed,
    d: {...w.dimensions}, selected: new Set(w.selected)});
  Object.assign(learningLabs.comp, {kind: c.kind, size: c.size, h: c.h, t: c.t,
    joined: c.joined, selected: new Set(c.selected), dirty: true, focusPending: null, feedback: ''});
  for (const kind of ['area', 'composite']) {
    learningLabs.guided[kind].edit();
    learningLabs.touched.delete(kind);
    learningLabs.suspended.delete(kind);
    learningLabs.histories[kind].items = [];
  }
  learningLabs.framing = null;
  learningLabs.guideOptionsKey = null;
  learningLabs.render();
  return true;
}

function geomathSurfaceValidate(data) {
  // Null is the explicit checkpoint value before these activities initialize.
  try { return data === null || geomathSurfaceValidateSnapshot(data); } catch { return false; }
}

function geomathSurfaceInstall() {
  for (const [getter, setter] of [
    [() => buildMesh, value => {buildMesh = value;}],
    [() => learningMesh, value => {learningMesh = value;}],
    [() => presetNetMesh, value => {presetNetMesh = value;}],
    [() => surfacePieces, value => {surfacePieces = value;}],
    [() => studySurfacePieces, value => {studySurfacePieces = value;}],
  ]) {
    const original = getter();
    setter(function(shape, ...args) { return geomathSurfacePaintMesh(shape, original(shape, ...args)); });
  }
  const composition = compositionMesh;
  compositionMesh = (kind, ...args) => geomathSurfacePaintMesh('composite', composition(kind, ...args), {kind});
  const workshop = workshopMesh;
  workshopMesh = (mode, dimensions, options) => geomathSurfacePaintMesh(
    mode === 'cavity' ? 'cavity' : options?.shape || 'cuboid', workshop(mode, dimensions, options), {mode});
  const diagram = drawNoteDiagram;
  drawNoteDiagram = function(shape, result) {
    diagram(shape, result);
    if (!result.valid || !['cube', 'cuboid', 'cylinder'].includes(shape)) return;
    const svg = document.getElementById('notes-diagram');
    const parts = shape === 'cylinder'
      ? [...svg.querySelectorAll('path'), ...svg.querySelectorAll('ellipse')]
      : [...svg.querySelectorAll('polygon')];
    const ids = shape === 'cylinder' ? [0, 1] : [0, 4, 1];
    for (let i = 0; i < ids.length; i++) {
      if (!parts[i]) continue;
      parts[i].setAttribute('fill', geomathSurfaceFaceColor(shape, ids[i]));
      parts[i].setAttribute('data-shape-id', shape);
      parts[i].setAttribute('data-stable-face-id', String(ids[i]));
    }
  };
  if (typeof renderLegend === 'function') {
    const legend = renderLegend;
    renderLegend = function() {
      legend();
      for (const button of document.getElementById('face-legend').children) {
        const id = Number(button.dataset.face), color = geomathSurfaceFaceColor(state.shape, id);
        const swatch = button.querySelector('.face-number');
        if (color && swatch) swatch.style.backgroundColor = color;
      }
    };
  }
}

export {
  geomathSurfaceFaceIdentity as surfaceFaceIdentity,
  geomathSurfaceFaceColor as surfaceFaceColor,
  geomathSurfacePaintMesh as paintSurfaceMesh,
};

export function surfaceAdapterSource() {
  return [geomathSurfaceFaceIdentity, geomathSurfaceFaceColor, geomathSurfacePaintMesh,
    geomathSurfaceLaunch, geomathSurfaceSnapshot, geomathSurfaceValidateSnapshot, geomathSurfaceValidate,
    geomathSurfaceRestore, geomathSurfaceInstall].map(fn => fn.toString()).join('\n')
    + '\ngeomathSurfaceInstall();\n';
}

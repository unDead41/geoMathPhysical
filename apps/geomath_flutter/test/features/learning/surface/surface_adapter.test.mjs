import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {surfaceFaceColor, surfaceFaceIdentity, paintSurfaceMesh} from '../../../../tools/module/surface_adapter.mjs';
import {activityFixture, canonicalHtml, geometryFixture} from './canonical_fixture.mjs';

const plain = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' differs from ' + expected);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const meshArea = mesh => mesh.reduce((sum, f) => sum + f.vertices.slice(1, -1).reduce((area, p, i) => area + Math.hypot(...cross(sub(p, f.vertices[0]), sub(f.vertices[i + 2], f.vertices[0]))) / 2, 0), 0);
const vertices = mesh => plain(mesh.map(f => ({id: f.id, vertices: f.vertices, ...(f.rim ? {rim: f.rim} : {}), ...(f.cut ? {cut: f.cut} : {})})));
const dimensions = {cube: {a: 4}, cuboid: {p: 6, l: 3, t: 2}, pyramid: {a: 6, t: 4}, cylinder: {j: 3, t: 4}, cone: {j: 3, t: 4}, 'triangular-prism': {a: 4, t: 5}, tetrahedron: {a: 4, t: 3}, 'pentagonal-prism': {a: 4, t: 5}, 'hexagonal-prism': {a: 4, t: 5}, sphere: {j: 3}, hemisphere: {j: 3}};
const counts = {cube: 6, cuboid: 6, pyramid: 5, cylinder: 3, cone: 2, 'triangular-prism': 5, tetrahedron: 4, 'pentagonal-prism': 7, 'hexagonal-prism': 8, sphere: 1, hemisphere: 2};

test('approved palette follows physical identity, constituent identity and cavity semantics', () => {
  const approved = fs.readFileSync(new URL('../../../../lib/core/design/face_palette.dart', import.meta.url), 'utf8');
  const colors = [...approved.matchAll(/Color\(0xff([0-9a-f]{6})\)/g)].map(match => '#' + match[1].toUpperCase());
  assert.equal(colors.length, 6);
  for (const shape of ['cube', 'cuboid']) for (let id = 0; id < 6; id++) assert.equal(surfaceFaceColor(shape, id), colors[id]);
  assert.equal(surfaceFaceColor('cube', 6), null);
  assert.equal(surfaceFaceColor('unknown', 0), null);
  assert.equal(surfaceFaceColor('composite', 4, {kind: 'roof'}), colors[4]);
  assert.equal(surfaceFaceColor('composite', 10, {kind: 'roof'}), colors[5]);
  assert.deepEqual(surfaceFaceIdentity('composite', 11, {kind: 'rocket'}), {shapeId: 'cone', stableFaceId: 1, surface: 'base', constituent: 'upper'});
  assert.equal(surfaceFaceColor('cavity', 1), colors[2]); // back, not cube right
  assert.equal(surfaceFaceColor('cavity', 4), colors[2]); // inner, not cube top
  assert.equal(surfaceFaceColor('cavity', 8), colors[4]);
  assert.equal(surfaceFaceColor('cavity', 12), colors[5]);
  const face = {id: 0, vertices: [[0, 0, 0], [1, 0, 0], [1, 1, 0]], rim: [[0, 1]]};
  const [painted] = paintSurfaceMesh('cube', [face]);
  assert.equal(painted.vertices, face.vertices);
  assert.equal(painted.rim, face.rim);
});

test('canonical HTML stays pinned; adapter preserves exact coordinates, winding and edges for all eleven solids', () => {
  assert.equal(createHash('sha256').update(canonicalHtml).digest('hex'), '7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4');
  const original = geometryFixture(false), adapted = geometryFixture();
  for (const [shape, d] of Object.entries(dimensions)) {
    for (const progress of ['sphere', 'hemisphere'].includes(shape) ? [0] : [0, .25, .5, .75, 1]) {
      const raw = original.learningMesh(shape, progress, 144, d), mesh = adapted.learningMesh(shape, progress, 144, d);
      assert.deepEqual(vertices(mesh), vertices(raw), shape + ' vertex/rim/cut parity');
      assert.equal(new Set(mesh.map(f => f.id)).size, counts[shape]);
      for (const face of mesh) assert.equal(face.color, surfaceFaceColor(shape, face.id));
      assert.deepEqual([...new Set(mesh.map(f => f.stableFaceId))].sort((a, b) => a - b), Array.from({length: counts[shape]}, (_, i) => i));
      for (const camera of [[0, 0], [Math.PI / 2, 0], [Math.PI, 0], [-Math.PI / 2, 0], [0, Math.PI / 2], [0, -Math.PI / 2]]) {
        assert.deepEqual(plain(mesh.flatMap(f => f.vertices.map(p => adapted.viewPoint(p, ...camera)))), plain(raw.flatMap(f => f.vertices.map(p => original.viewPoint(p, ...camera)))));
      }
    }
  }
});

test('all logical surface sums agree with independent analytic fixtures, without invented curved faces', () => {
  const a = geometryFixture(), root3 = Math.sqrt(3), pentagon = 4 * Math.sqrt(25 + 10 * Math.sqrt(5));
  const expected = {cube: 96, cuboid: 72, pyramid: 96, cylinder: 42 * Math.PI, cone: 24 * Math.PI,
    'triangular-prism': 8 * root3 + 60, tetrahedron: 4 * root3 + 6 * Math.sqrt(31 / 3),
    'pentagonal-prism': 2 * pentagon + 100, 'hexagonal-prism': 48 * root3 + 120, sphere: 36 * Math.PI, hemisphere: 27 * Math.PI};
  for (const [shape, d] of Object.entries(dimensions)) {
    const pieces = a.studySurfacePieces(shape, d), sum = pieces.reduce((s, p) => s + p.area, 0);
    near(sum, expected[shape]);
    assert.equal(pieces.length, counts[shape]);
    near(meshArea(a.learningMesh(shape, 0, 144, d)), expected[shape], expected[shape] * .004);
    for (const p of pieces) assert.equal(p.color, surfaceFaceColor(shape, p.id));
  }
  for (const shape of ['sphere', 'hemisphere']) assert.throws(() => a.learningMesh(shape, .1, 144, dimensions[shape]));
});

test('both composites preserve interface groups, constituent colours and exact geometry while joining', () => {
  const a = geometryFixture(), raw = geometryFixture(false);
  for (const [kind, d, area, volume] of [['roof', {a: 6, t: 4}, 240, 264], ['rocket', {j: 3, h: 6, t: 4}, 60 * Math.PI, 66 * Math.PI]]) {
    const measured = a.compositionMeasures(kind, d);
    near(measured.area, area); near(measured.volume, volume);
    near(measured.separateArea - measured.area, 2 * measured.sharedArea);
    for (const joined of [0, .1, .5, .9, 1]) {
      const mesh = a.compositionMesh(kind, d, joined);
      assert.deepEqual(vertices(mesh), vertices(raw.compositionMesh(kind, d, joined)));
      for (const face of mesh) {
        const identity = surfaceFaceIdentity('composite', face.id, {kind});
        assert.equal(face.sourceShapeId, identity.shapeId); assert.equal(face.stableFaceId, identity.stableFaceId);
        assert.equal(face.color, surfaceFaceColor('composite', face.id, {kind}));
      }
      for (const g of measured.groups) near(meshArea(mesh.filter(f => f.group === g.key)), g.area, g.area * .001);
    }
  }
});

test('containers remove one lid and cavities retain inner walls and outward semantic normals', () => {
  const a = geometryFixture(), raw = geometryFixture(false), d = {p: 6, l: 5, t: 4, j: 3, u: 2, v: 1.5};
  for (const shape of ['cuboid', 'cylinder']) {
    const closed = a.containerMeasures(shape, d, true), open = a.containerMeasures(shape, d, false);
    near(closed.volume, open.volume); near(closed.area - open.area, shape === 'cuboid' ? 30 : 9 * Math.PI);
    for (const lid of [true, false]) {
      const mesh = a.workshopMesh('container', d, {shape, closed: lid});
      assert.deepEqual(vertices(mesh), vertices(raw.workshopMesh('container', d, {shape, closed: lid})));
      near(meshArea(mesh), a.containerMeasures(shape, d, lid).area, closed.area * .001);
      if (!lid) assert.equal(mesh.some(f => f.id === (shape === 'cuboid' ? 4 : 1)), false);
    }
  }
  const cavity = a.workshopMesh('cavity', d), measured = a.holeMeasures(d);
  near(measured.area, 170); near(measured.volume, 108); near(meshArea(cavity), 170);
  assert.deepEqual(vertices(cavity), vertices(raw.workshopMesh('cavity', d)));
  for (const f of cavity) {
    const n = cross(sub(f.vertices[1], f.vertices[0]), sub(f.vertices[2], f.vertices[0]));
    const outward = [[0, 0, 1], [0, 0, -1], [-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1], [1, 0, 0], [-1, 0, 0]][f.id] || (f.group === 'top' ? [0, 1, 0] : [0, -1, 0]);
    assert.ok(n.reduce((s, v, i) => s + v * outward[i], 0) > 0);
    assert.equal(f.color, surfaceFaceColor('cavity', f.id));
  }
});

test('real source gates all four phases for original five areas and both composites', () => {
  for (const [shape, term] of [['cube', 'a²'], ['cuboid', 'p × t'], ['pyramid', 'a²'], ['cylinder', '2πjt'], ['cone', 'πjs']]) {
    const a = activityFixture(); assert.equal(a.api.launch('area', shape, 'closed'), true);
    a.nodes['guided-prediction'].value = 'Every surface counts once.'; a.click('guided-begin');
    assert.equal(a.nodes['guided-check'].disabled, true); a.click('area-open'); a.advance(8500); a.click('area-all');
    a.change('guided-term', 'wrong'); a.click('guided-check'); assert.equal(a.nodes['guided-complete'].disabled, true);
    a.change('guided-term', term); a.click('guided-check'); assert.equal(a.nodes['guided-complete'].disabled, false);
    a.nodes['guided-explanation'].value = '  '; a.click('guided-complete'); assert.match(a.nodes['module-count'].textContent, /0 \/ 4/);
    a.nodes['guided-explanation'].value = 'Add each actual surface once, including the base.'; a.click('guided-complete'); assert.match(a.nodes['module-count'].textContent, /1 \/ 4/);
    a.change('guided-term', 'wrong'); assert.equal(a.nodes['guided-complete'].disabled, true);
  }
  for (const kind of ['roof', 'rocket']) {
    const a = activityFixture(); assert.equal(a.api.launch('composite', null, kind), true);
    a.nodes['guided-prediction'].value = 'Both common bases become internal.'; a.click('guided-begin'); a.click('comp-join'); a.advance(4000);
    a.change('guided-answer', '2', 'input'); a.click('guided-check'); assert.equal(a.nodes['guided-complete'].disabled, true);
    for (const key of ['side', 'bottom', 'roofSide']) a.nodes['comp-groups'].children.find(n => n.dataset.group === key).click();
    a.click('guided-check'); assert.equal(a.nodes['guided-complete'].disabled, false);
    a.nodes['guided-explanation'].value = 'Subtract one mating base from each solid.'; a.click('guided-complete'); assert.match(a.nodes['module-count'].textContent, /1 \/ 4/);
    a.nodes['comp-groups'].children.find(n => n.dataset.group === 'joinUpper').click(); assert.equal(a.nodes['guided-complete'].disabled, true);
  }
});

test('native launches preserve advanced exploration and reject unsupported modes before mutation', () => {
  const a = activityFixture();
  for (const shape of Object.keys(dimensions)) {
    assert.equal(a.api.launch('area', shape, 'closed'), true);
    if (['sphere', 'hemisphere'].includes(shape)) {assert.equal(a.nodes['area-open'].disabled, true); assert.equal(a.nodes['lab-slider-wrap'].hidden, true);}
    if (!['cube', 'cuboid', 'pyramid', 'cylinder', 'cone'].includes(shape)) assert.equal(a.nodes['guided-begin'].disabled, true);
  }
  assert.equal(a.api.launch('area', 'cylinder', 'container'), true);
  assert.equal(a.nodes['guided-begin'].disabled, true);
  a.api.launch('area', null, 'cavity'); assert.match(a.nodes['workshop-area'].textContent, /170/);
  a.api.launch('area', null, 'closed'); assert.equal(a.nodes['area-shape'].value, 'cylinder');
  const before = plain(a.api.snapshot());
  assert.equal(a.api.launch('area', 'unrecognised', 'closed'), false);
  assert.equal(a.api.launch('area', null, 'rocket'), false);
  assert.equal(a.api.launch('composite', null, 'cavity'), false);
  assert.deepEqual(plain(a.api.snapshot()), before);
});

test('checkpoint validation is pure and restoration cannot unlock live assessment gates', () => {
  const a = activityFixture(); assert.equal(a.api.snapshot(), null); assert.equal(a.api.validate(null), true);
  a.api.launch('area', 'cube', 'closed'); a.change('area-a', '5', 'input'); a.click('area-open'); a.advance(8500); a.click('area-all');
  const checkpoint = plain(a.api.snapshot()); assert.equal(a.api.validate(checkpoint), true);
  for (const mutate of [v => {v.area.dimensions.a = 0;}, v => {v.area.selected = [0, 0];}, v => {v.workshop.dimensions.u = v.workshop.dimensions.p;}, v => {v.composite.joined = 2;}, v => {v.area.extra = 'unexpected';}]) {
    const invalid = structuredClone(checkpoint); mutate(invalid);
    assert.equal(a.api.validate(invalid), false); assert.equal(a.api.restore(invalid), false); assert.deepEqual(plain(a.api.snapshot()), checkpoint);
  }
  a.change('area-a', '6', 'input'); assert.notDeepEqual(plain(a.api.snapshot()), checkpoint);
  assert.equal(a.api.restore(checkpoint), true); assert.deepEqual(plain(a.api.snapshot()), checkpoint);
  assert.equal(a.nodes['guided-check'].disabled, true); assert.equal(a.nodes['guided-complete'].disabled, true); assert.equal(a.nodes['lab-undo'].disabled, true);
});

test('notes cube/cuboid front, top and right polygons match the physical palette without altering diagram geometry', () => {
  const a = activityFixture();
  for (const shape of ['cube', 'cuboid']) {
    const result = a.api.calculateMeasures(shape, dimensions[shape], 'full');
    a.api.drawNoteDiagram(shape, result);
    const polygons = a.nodes['notes-diagram'].querySelectorAll('polygon');
    assert.equal(polygons.length, 3);
    for (const [index, id] of [0, 4, 1].entries()) {
      assert.equal(polygons[index].getAttribute('data-stable-face-id'), String(id));
      assert.equal(polygons[index].getAttribute('fill'), surfaceFaceColor(shape, id));
      assert.match(polygons[index].getAttribute('points'), /\d/);
    }
  }
});

test('all eleven real source legends use the same stable surface colours as their meshes', () => {
  const a = activityFixture();
  for (const shape of Object.keys(dimensions)) {
    a.api.selectShape(shape);
    const buttons = a.nodes['face-legend'].children;
    assert.equal(buttons.length, counts[shape]);
    for (const button of buttons) {
      const id = Number(button.dataset.face);
      assert.equal(button.querySelector('.face-number').style.backgroundColor, surfaceFaceColor(shape, id));
    }
  }
});

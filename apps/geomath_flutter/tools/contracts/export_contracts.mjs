import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL, fileURLToPath} from 'node:url';

export const SOURCE_COMMIT = '37bc2cd262cc0a54e8ee31339ea37471c1ecfda5';
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const gitBlob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
export const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const json = value => JSON.stringify(value, null, 2) + '\n';

export function verifySource(sourceRoot, treePath) {
  const treeDocument = JSON.parse(fs.readFileSync(treePath));
  const tree = treeDocument.tree;
  const pinned = JSON.parse(fs.readFileSync(path.join(appRoot,'tools/contracts/canonical_inputs.json')));
  if (!Array.isArray(tree) || treeDocument.truncated !== false || treeDocument.sha !== pinned.canonical_tree || pinned.canonical_commit !== SOURCE_COMMIT) throw Error('The pinned complete canonical recursive Git tree is required.');
  const relevant = tree.filter(item => item.type === 'blob' && (
    item.path.startsWith('digital/module/src/') || item.path === 'digital/module/tools/build.mjs' ||
    item.path === 'digital/module/package.json' || item.path === 'digital/package.json' ||
    item.path === 'digital/tools/design-tokens.mjs' || item.path === 'digital/design-system/tokens.mjs' ||
    ['core', 'questions', 'duel-state', 'visuals', 'solo-save', 'module-frame', 'module-language', 'module-copy', 'module-foundation', 'module-progress', 'module-settings'].some(name => item.path === `digital/dist/${name}.${name === 'module-foundation' ? 'css' : 'mjs'}`)
  ));
  if(relevant.length !== pinned.source_inputs.length)throw Error('The canonical build/export input set changed.');
  return relevant.map(item => {
    const expected = pinned.source_inputs.find(input => input.path === item.path);
    if (!expected || expected.git_blob !== item.sha) throw Error(`Canonical tree provenance mismatch: ${item.path}`);
    const bytes = fs.readFileSync(path.join(sourceRoot, item.path));
    if (gitBlob(bytes) !== item.sha || sha256(bytes) !== expected.sha256 || bytes.length !== expected.bytes) throw Error(`Canonical blob mismatch: ${item.path}`);
    return {path: item.path, git_blob: item.sha, sha256: sha256(bytes), bytes: bytes.length};
  });
}

export function replayScenario(Game, QUESTIONS, scenario) {
  let cursor = 0;
  const rng = () => {
    if (cursor >= scenario.rng_draws.length) throw Error('RNG draw stream exhausted');
    return scenario.rng_draws[cursor++];
  };
  const game = new Game(QUESTIONS, scenario.player, scenario.start_clock_ms, rng, scenario.options);
  const snapshot = now => ({question_ids: game.round.map(q => q.id), index: game.index, question: game.question.id, score: game.score, mistakes: game.mistakes, hints: game.hints, skipped: game.skipped, first_try: game.firstTry, stage: game.stage, status: game.status, paused: game.paused, elapsed_ms: game.time(now), solid_order: game.solidOrder, net_order: game.netOrder, answers: game.answers, rng_draws_consumed: cursor, led_r1: game.led('r1', now), led_r2: game.led('r2', now)});
  const snapshots = [{clock_ms: scenario.start_clock_ms, state: structuredClone(snapshot(scenario.start_clock_ms))}];
  for (const step of scenario.actions) {
    const {action, clock_ms: now, args = []} = step;
    if (!['scan', 'toggleHint', 'skip', 'pause', 'resume', 'update', 'continueReview'].includes(action)) throw Error('Unsupported fixture action');
    const outcome = action === 'scan' ? game.scan(...args, now) : action === 'toggleHint' ? game.toggleHint() : game[action](now);
    snapshots.push({clock_ms: now, action, outcome: outcome ?? null, state: structuredClone(snapshot(now))});
  }
  return {snapshots, result: game.result(scenario.id, scenario.completed_at_ms), rng_draws_consumed: cursor};
}

export async function exportContracts(sourceRoot, treePath) {
  const provenance = verifySource(sourceRoot, treePath);
  const load = relative => import(pathToFileURL(path.join(sourceRoot, relative)).href);
  const core = await load('digital/dist/core.mjs');
  const {QUESTIONS} = await load('digital/dist/questions.mjs');
  const {MODEL_ORDER, MODEL_DATA, MODULE_VERSION} = await load('digital/module/src/content.mjs');
  const {studySolidMesh, learningMesh} = await load('digital/module/src/learning-mesh.mjs');
  const {LESSON_DATA} = await load('digital/module/src/lessons.mjs');
  const {viewPoint, meshBounds} = await load('digital/module/src/geometry.mjs');
  const target = path.join(appRoot, 'assets/contracts');
  fs.mkdirSync(target, {recursive: true});
  const reference = path.join(appRoot, 'tools/contracts/reference');
  fs.mkdirSync(reference, {recursive: true});
  for(const name of ['core','questions','duel-state']) fs.copyFileSync(path.join(sourceRoot,`digital/dist/${name}.mjs`),path.join(reference,`${name}.mjs`));
  const write = (name, value) => fs.writeFileSync(path.join(target, name), json(value));
  const bankHash = sha256(Buffer.from(JSON.stringify(QUESTIONS)));
  write('bank15.json', {schema_version: 1, source_commit: SOURCE_COMMIT, bank_version: `bank15-sha256:${bankHash}`, questions: QUESTIONS});
  write('learning_catalogue.json', {schema_version: 1, source_commit: SOURCE_COMMIT, module_version: MODULE_VERSION, mesh_entry_point: 'learning-mesh.mjs/studySolidMesh', models: MODEL_ORDER.map(id => ({id, ...MODEL_DATA[id], dimensions: LESSON_DATA[id].defaults, physical_surface_ids: [...new Set(studySolidMesh(id).map(face => face.id))]}))});
  const cards = core.SHAPES.map(shape => ({shape, solid: studySolidMesh(shape), net: learningMesh(shape, 1, 96), camera: {yaw: .55, pitch: .35}, net_camera: {yaw: 0, pitch: 0}}));
  // Colors deliberately carry no matching-answer signal. Coordinates and real
  // physical surface IDs are copied from canonical mesh producers unchanged.
  const neutral = mesh => mesh.map(({id, name, vertices, outline, rim, cut}) => ({id, name, vertices, outline, ...(rim ? {rim} : {}), ...(cut ? {cut} : {}), color: '#D5DFEA'}));
  write('geometry_cards.json', {schema_version: 1, source_commit: SOURCE_COMMIT, neutral: true, game_shapes: core.SHAPES, cards: cards.map(card => ({...card, solid: neutral(card.solid), net: neutral(card.net)}))});
  fs.mkdirSync(path.join(target, 'cards'), {recursive: true});
  for (const card of cards) for (const kind of ['solid', 'net']) {
    const mesh = card[kind], camera = kind === 'net' ? card.net_camera : card.camera;
    const {center} = meshBounds(mesh);
    const faces = mesh.map(face => ({...face, points: face.vertices.map(point => viewPoint(point.map((v, i) => v - center[i]), camera.yaw, camera.pitch))})).sort((a,b) => a.points.reduce((s,p) => s+p[2],0)/a.points.length-b.points.reduce((s,p) => s+p[2],0)/b.points.length);
    const points = faces.flatMap(f => f.points), minX = Math.min(...points.map(p=>p[0])), maxX = Math.max(...points.map(p=>p[0])), minY = Math.min(...points.map(p=>p[1])), maxY = Math.max(...points.map(p=>p[1]));
    const scale = Math.min(152/(maxX-minX || 1), 152/(maxY-minY || 1));
    const polygons = faces.map(face => `<polygon data-face="${face.id}" points="${face.points.map(p => `${(90+(p[0]-(maxX+minX)/2)*scale).toFixed(5)},${(90-(p[1]-(maxY+minY)/2)*scale).toFixed(5)}`).join(' ')}" fill="#D5DFEA" stroke="${face.outline ? '#27445D' : '#D5DFEA'}" stroke-width="1.2"/>`).join('');
    fs.writeFileSync(path.join(target, 'cards', `${shapeSafe(card.shape)}-${kind}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" role="img" aria-label="${card.shape} ${kind}">${polygons}</svg>\n`);
  }
  const stream = Array.from({length: 8192}, (_, index) => ((index * 37 + 17) % 997) / 997);
  const make = (id, options, actions) => ({id, player: {name: 'Canonical fixture', category: 'Tetamu', className: ''}, options, start_clock_ms: 1000, completed_at_ms: 1700000000000, rng_draws: stream, actions});
  const actions = [{action:'scan', clock_ms:1100, args:['solid','cube','r2']}, {action:'scan', clock_ms:1200, args:['net','cube','r1']}, {action:'toggleHint', clock_ms:1300}, {action:'pause', clock_ms:1500}, {action:'scan', clock_ms:2000, args:['solid','cube','r1']}, {action:'resume', clock_ms:4500}];
  const mixed = make('practice-mixed', {mode:'practice'}, actions);
  // Generate concrete action arguments from the real randomized question order.
  let rngAt=0;const planned = new core.Game(QUESTIONS, mixed.player, 1000, () => stream[rngAt++], mixed.options);
  let now = 5000;
  for (let i=0;i<15;i++) {
    const shape=planned.question.shape;
    if (i%4===0) {mixed.actions.push({action:'scan',clock_ms:now,args:['solid',core.SHAPES.find(s=>s!==shape),'r1']});planned.scan('solid',core.SHAPES.find(s=>s!==shape),'r1',now);}
    else if (i%4===1) {mixed.actions.push({action:'scan',clock_ms:now,args:['solid',shape,'r1']},{action:'scan',clock_ms:now+300,args:['net',core.SHAPES.find(s=>s!==shape),'r2']});planned.scan('solid',shape,'r1',now);planned.scan('net',core.SHAPES.find(s=>s!==shape),'r2',now+300);}
    else if (i%4===2) {mixed.actions.push({action:'skip',clock_ms:now});planned.skip(now);}
    else {mixed.actions.push({action:'scan',clock_ms:now,args:['solid',shape,'r1']},{action:'scan',clock_ms:now+300,args:['net',shape,'r2']});planned.scan('solid',shape,'r1',now);planned.scan('net',shape,'r2',now+300);}
    mixed.actions.push({action:'update',clock_ms:now+899},{action:'scan',clock_ms:now+950,args:['solid',shape,'r1']},{action:'continueReview',clock_ms:now+1799});
    const next=now+2200;
    mixed.actions.push({action:planned.reviewing?'continueReview':'update',clock_ms:next});
    if(planned.reviewing)planned.continueReview(next);else planned.update(next);
    now+=2600;
  }
  const quiz = make('quiz-perfect', {mode:'quiz'}, []);
  rngAt=0;const qg = new core.Game(QUESTIONS,quiz.player,1000,()=>stream[rngAt++],quiz.options);
  now=2000;
  for(let i=0;i<10;i++) {const shape=qg.question.shape;quiz.actions.push({action:'scan',clock_ms:now,args:['solid',shape,'r1']},{action:'scan',clock_ms:now+100,args:['net',shape,'r2']},{action:'update',clock_ms:now+999},{action:'update',clock_ms:now+1000});qg.scan('solid',shape,'r1',now);qg.scan('net',shape,'r2',now+100);qg.update(now+1000);now+=1500;}
  const fixtures=[quiz,mixed].map(scenario => {const expected=replayScenario(core.Game,QUESTIONS,scenario);return {...scenario,rng_draws:stream.slice(0,expected.rng_draws_consumed),expected};});
  write('engine_golden.json', {schema_version:1,source_commit:SOURCE_COMMIT,digital_version:core.VERSION,ruleset:core.RULESET,bank_version:`bank15-sha256:${bankHash}`,clock_unit:'milliseconds; explicit absolute input per action',rng_contract:'ordered float draws in [0,1); no shared-seed assumption',scenarios:fixtures});
  write('ruleset.json', {schema_version:1,source_commit:SOURCE_COMMIT,digital_version:core.VERSION,module_version:MODULE_VERSION,ruleset:core.RULESET,quiz_size:core.ROUND_SIZE,practice_size:core.PRACTICE_SIZE,game_shapes:core.SHAPES,blink_ms:core.BLINK_MS,review_ms:core.REVIEW_MS,bank_version:`bank15-sha256:${bankHash}`,module_progress_protocol:1,module_settings_version:1,native_bridge_version:1,solo_snapshot_schema:1,formative_schema:1});
  const manifest={schema_version:1,feature:'contracts',source_commit:SOURCE_COMMIT,files:fs.readdirSync(target,{recursive:true}).filter(name => name !== 'manifest.json' && fs.statSync(path.join(target,name)).isFile()).sort().map(name=>{const bytes=fs.readFileSync(path.join(target,name));return {path:`assets/contracts/${name}`,sha256:sha256(bytes),bytes:bytes.length};})};
  write('manifest.json',manifest);
  return {provenance,manifest,bankHash};
}
function shapeSafe(value){if(!/^[a-z-]+$/.test(value))throw Error('Invalid shape ID');return value;}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [sourceRoot, treePath] = process.argv.slice(2);
  if (!sourceRoot || !treePath) throw Error('Usage: node tools/contracts/export_contracts.mjs <canonical-root> <recursive-tree.json>');
  const result=await exportContracts(path.resolve(sourceRoot),path.resolve(treePath));
  console.log(`Exported verified bank15, eleven learning meshes, ten neutral cards and two JS action streams (${result.provenance.length} pinned inputs).`);
}

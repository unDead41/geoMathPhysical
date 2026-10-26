import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {ClassroomCloud} from '../dist/cloud.mjs';

const user = name => ({
  id: name === 'a' ? '00000000-0000-4000-8000-000000000041' : '00000000-0000-4000-8000-000000000042',
  email: name + '@example.com', aud: 'authenticated', role: 'authenticated',
  created_at: '2026-10-26T00:00:00Z', app_metadata: {provider: 'email', providers: ['email']}, user_metadata: {}
});
const session = name => ({
  access_token: [
    Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url'),
    Buffer.from(JSON.stringify({sub: user(name).id, session_id: name, exp: 4102444800, iat: 1792972800, aud: 'authenticated', role: 'authenticated'})).toString('base64url'),
    Buffer.from('fixture-signature').toString('base64url')
  ].join('.'),
  refresh_token: 'fixture-refresh-' + name, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: user(name)
});

function fixture(heldScope) {
  // Two real SDK clients share the same session store, like separate tabs.
  // The regression is removing B after a delayed local logout response for A.
  const values = new Map([['geodecoder.cloud.auth', JSON.stringify(session('a'))]]);
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
  const clients = [], localTargets = [];
  let beginHeld, finishHeld;
  const heldStarted = new Promise(resolve => { beginHeld = resolve; });
  const heldResponse = new Promise(resolve => { finishHeld = resolve; });
  const sdkFetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const token = (new Headers(init.headers).get('Authorization') || '').slice(7);
    const subject = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).sub;
    if (url.pathname === '/auth/v1/user') return Response.json(subject === user('a').id ? user('a') : user('b'));
    if (url.pathname === '/auth/v1/logout') {
      const scope = url.searchParams.get('scope');
      if (scope === 'local') localTargets.push(subject);
      if (scope === heldScope) { beginHeld(); await heldResponse; }
      return new Response(null, {status: 204});
    }
    throw Error('Unexpected SDK route');
  };
  const makeCloud = () => {
    const cloud = new ClassroomCloud({url: 'https://fixture.supabase.co', publishableKey: 'fixture-public-key'}, {
      createClient: (url, key, options) => {
        const client = createClient(url, key, options.auth.persistSession === false ? options : {
          ...options, auth: {...options.auth, storage, autoRefreshToken: false}, global: {fetch: sdkFetch}
        });
        clients.push(client); return client;
      },
      fetch: sdkFetch, location: {href: 'https://fixture.example/'}, recoveryStorage: null
    });
    cloud.startHeartbeat = () => {};
    return cloud;
  };
  const first = makeCloud(), second = makeCloud(), originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    assert.equal(new URL(input).pathname, '/functions/v1/geodecoder-auth');
    return Response.json({session: session('b')});
  };
  return {first, second, values, localTargets, heldStarted, release: finishHeld, cleanup() {
    finishHeld(); globalThis.fetch = originalFetch;
    for (const client of clients) client.auth.stopAutoRefresh();
  }};
}

test('confirmed A global logout cannot remove B installed during local cleanup', {concurrency: false}, async () => {
  const f = fixture('local');
  try {
    await f.first.init(); await f.second.init();
    const loggingOut = f.first.auth('logout-all');
    await f.heldStarted;
    const signingIn = f.second.auth('login', {username: 'account_b', password: 'Fixture B password#41'});
    // Allow an unprotected B installation to finish while A's response is held.
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    f.release();
    await Promise.all([loggingOut, signingIn]);
    assert.equal((await f.second.client.auth.getSession()).data.session?.user.id, user('b').id);
    assert.equal(JSON.parse(f.values.get('geodecoder.cloud.auth')).user.id, user('b').id);
    assert.deepEqual(f.localTargets, [user('a').id]);
  } finally { f.cleanup(); }
});

test('A cleanup rechecks the actual stored SDK session before signing out', {concurrency: false}, async () => {
  const f = fixture('global');
  try {
    await f.first.init(); await f.second.init();
    const loggingOut = f.first.auth('logout-all');
    await f.heldStarted;
    await f.second.auth('login', {username: 'account_b', password: 'Fixture B password#41'});
    // No BroadcastChannel runs in Node: A's cloud cache still names A, while
    // the actual shared SDK session is already B. Cleanup must inspect both.
    assert.equal(f.first.session.user.id, user('a').id);
    f.release();
    await loggingOut;
    assert.equal((await f.second.client.auth.getSession()).data.session?.user.id, user('b').id);
    assert.equal(JSON.parse(f.values.get('geodecoder.cloud.auth')).user.id, user('b').id);
    assert.deepEqual(f.localTargets, []);
  } finally { f.cleanup(); }
});

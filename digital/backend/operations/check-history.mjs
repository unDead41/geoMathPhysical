// Read-only gate. It never invokes a database write or deployment command.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../../../',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('supabase/hosted-history.json',root)));
for(const m of manifest.migrations){
 const content=fs.readFileSync(new URL('supabase/migrations/'+m.file,root),'utf8');
 assert.equal(crypto.createHash('sha256').update(content).digest('hex'),m.file_sha256,'Historical file changed: '+m.version);
}
const input=process.argv[2];
if(!input)throw Error('Provide a fresh JSON export of version, name, statements from hosted supabase_migrations.schema_migrations. Local checks alone do not authorize deployment.');
const remote=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
assert.ok(Array.isArray(remote),'Expected an array of hosted migration rows');
const current=remote.map(m=>({version:m.version,name:m.name,sql_sha256:crypto.createHash('sha256').update(m.statements.join(';\n')).digest('hex')})).sort((a,b)=>a.version.localeCompare(b.version));
const expected=manifest.migrations.map(({version,name,sql_sha256})=>({version,name,sql_sha256}));
assert.deepEqual(current,expected,'Hosted history changed or a historical migration is missing. Stop and reconcile; never repair production blindly.');
console.log('PASS: exact hosted history and immutable SQL files match. Production dry-run and reviewed future migrations are still required.');

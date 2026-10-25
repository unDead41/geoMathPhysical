import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the portal's actual form validator without adding a browser/DOM
// dependency. The shim records only field errors, normalized values and focus.
const source=fs.readFileSync(new URL('../dist/portal.mjs',import.meta.url),'utf8');
const start=source.indexOf('  function validate(form, values, type) {');
const end=source.indexOf('\n  async function handleAuth(',start);
assert.ok(start>=0&&end>start,'Portal form validator was not found');
const validate=vm.runInNewContext('('+source.slice(start,end).trim()+')');
function formFor(values){
  const fields=new Map(Object.entries(values).map(([name,value])=>[name,{value,invalid:false,setAttribute(key,value){if(key==='aria-invalid')this.invalid=value==='true';},focus(){}}]));
  const errors=Object.keys(values).map(name=>({dataset:{errorFor:name},textContent:''}));
  const message={textContent:''};
  return {fields,errors,message,elements:{namedItem:name=>fields.get(name)},querySelectorAll:selector=>selector==='[data-error-for]'?errors:[],querySelector:selector=>selector==='[data-form-error]'?message:[...fields.values()].find(field=>field.invalid)};
}
const valid=()=>({username:' Ijammahmad41 ',password:' Test Pass#41 ',display_name:'Nama Ujian',role:'student',recovery_code:'a'.repeat(32)});
test('signup accepts a mixed-case username and normalizes it before sending',()=>{
  const values=valid(),form=formFor(values),password=values.password;
  assert.equal(validate(form,values,'signup'),true);
  assert.equal(values.username,'ijammahmad41');
  assert.equal(form.fields.get('username').value,'ijammahmad41');
  assert.equal(values.password,password,'Passwords must not be trimmed or case-normalized');
});
test('login, recovery and username invitations follow the same username rule',()=>{
  for(const type of ['login','recover','invite']){
    const values=valid(),form=formFor(values);
    assert.equal(validate(form,values,type),true,type);
    assert.equal(values.username,'ijammahmad41',type);
  }
});
test('a short password flags only the password after normalizing a valid username',()=>{
  const values={...valid(),password:'qa-short'},form=formFor(values);
  assert.equal(validate(form,values,'signup'),false);
  assert.equal(form.fields.get('username').invalid,false);
  assert.equal(form.fields.get('password').invalid,true);
  assert.match(form.errors.find(node=>node.dataset.errorFor==='password').textContent,/10.*128/);
});
test('username normalization still rejects invalid characters and lengths',()=>{
  for(const username of ['ab','a'.repeat(25),'nama pelajar','nama@kelas','<script>']){
    const values={...valid(),username},form=formFor(values);
    assert.equal(validate(form,values,'signup'),false);
    assert.equal(form.fields.get('username').invalid,true);
  }
});

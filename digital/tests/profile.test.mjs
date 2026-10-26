import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from '../dist/i18n.mjs';
const source=fs.readFileSync(new URL('../dist/portal.mjs',import.meta.url),'utf8');
const validate=vm.runInNewContext('('+source.slice(source.indexOf('  function validate('),source.indexOf('\n  async function handleAuth(')).trim()+')',{pt:key=>translate('ms',key)||key});
function check(display_name,avatar='cube'){
 const values={display_name,avatar}; const field={setAttribute(){},focus(){}};
 const form={elements:{namedItem(){return field;}},querySelectorAll(){return [];},querySelector(s){return s==='[data-form-error]'?{}:field;}};
 return validate(form,values,'profile');
}
test('profile rejects blank, overlong and control-character display names',()=>{
 for(const name of ['', ' ', 'A', 'a'.repeat(61),'Nama\nBaru','Nama\u007f'])assert.equal(check(name),false,JSON.stringify(name));
});
test('profile accepts Unicode names using character count and built-in avatars',()=>{
 for(const name of [' Ijamm ', '陈老师', '😀'.repeat(60)])assert.equal(check(name),true);
 assert.equal(check('Ijamm','https://external.invalid/a.png'),false);
});

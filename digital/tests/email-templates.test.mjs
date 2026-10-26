import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {EMAIL_TEMPLATES,emailManifest,emailPayload,renderEmail,previewEmail} from '../backend/email/templates.mjs';
import {buildEmails} from '../tools/email-templates.mjs';

test('committed templates and subjects match the canonical email sources',async()=>{
  assert.equal(await buildEmails({check:true}),9);
  assert.deepEqual(JSON.parse(await readFile(new URL('../backend/email/manifest.json',import.meta.url),'utf8')),emailManifest());
  assert.equal(new Set(EMAIL_TEMPLATES.map(item=>item.id)).size,8);
});

test('export changes presentation only and cannot enable auth methods or notifications',()=>{
  const expected=['confirmation','recovery','invite','magic_link','email_change','reauthentication','password_changed_notification','email_changed_notification'];
  const payload=emailPayload();
  assert.equal(Object.keys(payload).length,16);
  assert.deepEqual(EMAIL_TEMPLATES.map(item=>item.id),expected);
  for(const id of expected){
    assert.ok(payload[`mailer_subjects_${id}`].startsWith('GeoDecoder'));
    assert.ok(payload[`mailer_templates_${id}_content`].startsWith('<!doctype html>'));
  }
  assert.ok(Object.keys(payload).every(key=>/^mailer_(subjects_.+|templates_.+_content)$/.test(key)));
  assert.ok(!JSON.stringify(payload).includes('smtp_pass'));
});

test('action links preserve Auth verification; reauthentication retains its OTP',()=>{
  for(const item of EMAIL_TEMPLATES){
    const html=renderEmail(item),tokens=[...html.matchAll(/{{\s*\.(\w+)\s*}}/g)].map(match=>match[1]);
    const allowed=new Set(['SiteURL','Email',...(item.kind==='link'?['ConfirmationURL']:[]),...(item.kind==='code'?['Token']:[]),...(item.id==='email_change'?['NewEmail']:[]),...(item.id==='email_changed_notification'?['OldEmail']:[])]);
    assert.ok(tokens.every(token=>allowed.has(token)),item.id);
    assert.ok(tokens.includes('Email'));
    if(item.kind==='link'){
      assert.equal((html.match(/href="{{ \.ConfirmationURL }}"/g)||[]).length,2,item.id+' needs a verified CTA and fallback');
      assert.ok(!html.includes('token_hash='));
    }else assert.ok(!tokens.includes('ConfirmationURL'));
    if(item.kind==='code')assert.ok(tokens.includes('Token'));
    if(item.id==='email_change')assert.ok(tokens.includes('NewEmail'));
  }
});

test('email layout stays self contained, bilingual and usable without network assets',()=>{
  for(const item of EMAIL_TEMPLATES){
    const html=renderEmail(item);
    assert.ok(html.includes('<html lang="ms">'));
    assert.ok(html.includes('lang="en"'));
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    assert.ok(!/<(?:script|form|iframe|svg|img|link)\b|@import|url\(/i.test(html),item.id);
    for(const table of html.matchAll(/<table\b([^>]*)>/g))assert.match(table[1],/role="presentation"/);
    assert.ok(Buffer.byteLength(html)<12000,item.id);
  }
});

test('visual fixtures have inert links, escaped query separators and no live token',()=>{
  for(const item of EMAIL_TEMPLATES){
    for(const longEmail of [false,true]){
      const html=previewEmail(item,{longEmail});
      assert.ok(!html.includes('{{'));
      assert.ok(!/supabase\.co|github\.io/.test(html));
      const links=[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'));
      assert.ok(links.length>0);
      assert.ok(links.every(link=>new URL(link).hostname.endsWith('.invalid')));
      if(item.kind==='link')assert.ok(html.includes('&amp;type=email'));
      if(longEmail){const email=html.match(/<strong[^>]*>([^<]+)<\/strong>/)[1];assert.equal(email.length,254);}
    }
  }
});

test('CLI only exports a local payload and rejects hosted mutations',()=>{
  const script=new URL('../tools/email-templates.mjs',import.meta.url);
  const exported=spawnSync(process.execPath,[script.pathname,'--payload'],{encoding:'utf8'});
  assert.equal(exported.status,0,exported.stderr);
  assert.deepEqual(JSON.parse(exported.stdout),emailPayload());
  const rejected=spawnSync(process.execPath,[script.pathname,'--apply'],{encoding:'utf8'});
  assert.equal(rejected.status,1);
  assert.match(rejected.stderr,/local only/);
});

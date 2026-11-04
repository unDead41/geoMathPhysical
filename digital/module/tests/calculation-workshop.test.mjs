import test from 'node:test';
import assert from 'node:assert/strict';
import {CalculationWorkshop} from '../src/calculation-workshop.mjs';

// The DOM port isolates UI state transitions. Root verifies the shipped UI in a real browser.
class CalcNodePort{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.events={};this.value='';this.disabled=false;this.hidden=false;this.dataset={};this.ownText='';}
 set textContent(value){this.ownText=String(value);this.children=[];}
 get textContent(){return this.ownText+this.children.map(child=>child.textContent).join('');}
 setAttribute(key,value){this.attributes[key]=String(value);if(key==='id')this.id=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
 getAttribute(key){return this.attributes[key]??null;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.ownText='';this.children=[...children];}
 addEventListener(type,handler){(this.events[type]??=[]).push(handler);}
 emit(type){for(const handler of this.events[type]??[])handler({target:this,preventDefault(){}});}
 click(){if(!this.disabled)this.emit('click');}
 focus(){this.focused=true;}
 scrollIntoView(){}
}
function workshop(){
 let created=0,language='ms';const root=new CalcNodePort(),announcements=[];
 globalThis.document={createElement:tag=>{created++;return new CalcNodePort(tag);},createElementNS:(_,tag)=>{created++;return new CalcNodePort(tag);},getElementById:()=>root};
 const instance=new CalculationWorkshop({root,getLanguage:()=>language,prefersReduced:()=>true,announce:text=>announcements.push(text)});
 const find=id=>{const visit=node=>node.id===id?node:node.children.map(visit).find(Boolean);return visit(root);};
 const input=(id,value,type='input')=>{const node=find(id);assert.ok(node,id+' exists');node.value=value;node.emit(type);};
 return {instance,root,find,input,announcements,created:()=>created,language:value=>{language=value;instance.refreshLanguage();}};
}

test('workshop initializes lazily and exposes only relevant measurement fields',()=>{
 const w=workshop();assert.equal(w.created(),0);w.instance.open('cube');
 assert.equal(w.find('calculation-title').textContent,'Semakan langkah pengiraan');
 assert.equal(w.find('calculation-dimension-a').value,'4');
 assert.equal(w.find('calculation-field-j').hidden,true);assert.equal(w.find('calculation-dimension-j').disabled,true);
 assert.equal(w.find('calculation-substitution').disabled,true);
 w.instance.open('sphere');assert.equal(w.find('calculation-field-j').hidden,false);assert.equal(w.find('calculation-field-t').hidden,true);
});

test('checking is sequential and editing an earlier step invalidates later confirmations',()=>{
 const w=workshop();w.instance.open('cube');
 w.input('calculation-formula','6*a^2');w.find('calculation-check-formula').click();assert.equal(w.find('calculation-substitution').disabled,false);
 w.input('calculation-substitution','6*4^2');w.find('calculation-check-substitution').click();
 w.input('calculation-calculation','96');w.find('calculation-check-calculation').click();
 w.input('calculation-unit-value','96');w.input('calculation-unit','cm²','change');w.find('calculation-check-unit').click();
 assert.equal(w.find('calculation-feedback-unit').getAttribute('data-success'),'true');
 w.input('calculation-formula','24*a');assert.equal(w.find('calculation-substitution').disabled,true);assert.equal(w.find('calculation-feedback-unit').getAttribute('data-success'),'');
 assert.equal(w.find('calculation-unit-value').value,'96');
});

test('a hint precedes revealing the current solution, without filling pupil inputs',()=>{
 const w=workshop();w.instance.open('cone');assert.equal(w.find('calculation-reveal').disabled,true);
 w.find('calculation-hint-formula').click();assert.equal(w.find('calculation-reveal').disabled,false);
 w.find('calculation-reveal').click();assert.equal(w.find('calculation-solution').hidden,false);
 assert.match(w.find('calculation-solution').textContent,/75\.43/);assert.equal(w.find('calculation-formula').value,'');
 w.find('calculation-example').click();assert.equal(w.find('calculation-example-panel').hidden,false);
 assert.match(w.find('calculation-example-panel').textContent,/75\.43/);
 w.find('calculation-new-problem').click();assert.equal(w.find('calculation-example-panel').hidden,true);assert.equal(w.find('calculation-solution').hidden,true);
 for(const id of ['formula','substitution','calculation','unit-value','unit'])assert.equal(w.find('calculation-'+id).value,'');
 assert.notEqual(w.find('calculation-dimension-j').value,'3');
});

test('language refresh and section changes preserve answers, dimensions, pi and confirmations',()=>{
 const w=workshop();w.instance.open('cylinder',{dimensions:{j:3,t:5},piMode:'3.142'});
 w.input('calculation-formula','2*pi*j*(j+t)');w.find('calculation-check-formula').click();
 w.language('en');assert.equal(w.find('calculation-title').textContent,'Check calculation steps');
 assert.equal(w.find('calculation-formula').value,'2*pi*j*(j+t)');assert.equal(w.find('calculation-dimension-j').value,'3');
 assert.equal(w.find('calculation-pi').value,'3.142');assert.equal(w.find('calculation-substitution').disabled,false);
 w.instance.close();w.instance.open('cylinder');assert.equal(w.find('calculation-formula').value,'2*pi*j*(j+t)');
 assert.equal(w.find('calculation-substitution').disabled,false);
});

test('explicit changed note context replaces measurements and invalidates confirmations',()=>{
 const w=workshop();w.instance.open('cylinder');w.input('calculation-formula','2*pi*j*(j+t)');w.find('calculation-check-formula').click();
 w.instance.open('cylinder',{dimensions:{j:2,t:3},piMode:'full'});
 assert.equal(w.find('calculation-dimension-j').value,'2');assert.equal(w.find('calculation-pi').value,'full');
 assert.equal(w.find('calculation-substitution').disabled,true);
 w.instance.resetContext();assert.equal(w.find('calculation-formula').value,'');assert.equal(w.find('calculation-dimension-j').value,'2');
});

test('invalid edited dimensions remove valid results and restore a safe sequential start',()=>{
 const w=workshop();w.instance.open('cube');w.input('calculation-formula','6*a^2');w.find('calculation-check-formula').click();
 w.input('calculation-dimension-a','0');assert.equal(w.find('calculation-dimension-a').getAttribute('aria-invalid'),'true');
 assert.equal(w.find('calculation-check-formula').disabled,true);assert.equal(w.find('calculation-substitution').disabled,true);
 assert.equal(w.instance.problem.valid,false);assert.equal(w.instance.problem.answerBase,null);
 w.input('calculation-dimension-a','4,5');assert.equal(w.instance.problem.valid,true);assert.equal(w.find('calculation-check-formula').disabled,false);
});

test('diameter entry halves the given value and contextual geometry exposes contact-face guidance',()=>{
 const w=workshop();w.instance.open('cylinder');w.input('calculation-given','diameter','change');
 assert.equal(w.find('calculation-dimension-j').value,'14');w.input('calculation-dimension-j','6');assert.equal(w.instance.problem.dimensions.j,3);
 w.input('calculation-context','cylinder-cone','change');assert.equal(w.find('calculation-field-c').hidden,false);
 assert.match(w.find('calculation-context-note').textContent,/dalaman|sentuhan/);
 w.language('en');assert.match(w.find('calculation-context-note').textContent,/contact|internal/);
});

test('question givens retain entered precision rather than rounding the dimensions',()=>{
 const w=workshop();w.instance.open('cuboid',{dimensions:{p:6.12345,l:4.56789,t:3.98765}});
 assert.match(w.find('calculation-question').textContent,/6\.12345/);
 assert.match(w.find('calculation-question').textContent,/4\.56789/);
 assert.match(w.find('calculation-question').textContent,/3\.98765/);
});

test('wizard shows one step, gates navigation and lets checked answers be revisited',()=>{
 const w=workshop();w.instance.open('cube');
 assert.equal(w.find('calculation-card-formula').hidden,false);assert.equal(w.find('calculation-card-substitution').hidden,true);
 assert.equal(w.find('calculation-go-substitution').disabled,true);assert.equal(w.find('calculation-next-step').disabled,true);
 w.input('calculation-formula','6*a^2');w.find('calculation-check-formula').click();w.find('calculation-next-step').click();
 assert.equal(w.find('calculation-card-formula').hidden,true);assert.equal(w.find('calculation-go-substitution').getAttribute('aria-current'),'step');
 w.input('calculation-substitution','6*4^2');w.find('calculation-check-substitution').click();w.find('calculation-previous-step').click();
 assert.equal(w.find('calculation-formula').value,'6*a^2');w.input('calculation-formula','wrong');
 assert.equal(w.find('calculation-go-substitution').disabled,true);assert.equal(w.find('calculation-next-step').disabled,true);assert.equal(w.find('calculation-card-substitution').hidden,true);
});

test('wizard position and draft survive locale/navigation; a session reset returns to formula',()=>{
 const w=workshop();w.instance.open('cube');w.input('calculation-formula','6*a^2');w.find('calculation-check-formula').click();w.find('calculation-next-step').click();
 w.input('calculation-substitution','6*4^2');w.language('en');w.instance.close();w.instance.open('cube');
 assert.equal(w.find('calculation-go-substitution').getAttribute('aria-current'),'step');assert.equal(w.find('calculation-substitution').value,'6*4^2');
 w.instance.resetContext();assert.equal(w.find('calculation-go-formula').getAttribute('aria-current'),'step');assert.equal(w.find('calculation-card-substitution').hidden,true);assert.equal(w.find('calculation-substitution').value,'');
});

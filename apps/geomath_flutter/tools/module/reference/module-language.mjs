/** Presentation adapter for the byte-identical, sandboxed v1.2 module.
 * This function is serialized into srcdoc: keep every dependency inside it.
 * IDs, input values, mathematical symbols and geometry are never translated.
 */
export function installModuleLanguage({language='ms',catalog,document:doc=globalThis.document,window:win=globalThis.window}){
  let current=language==='en'?'en':'ms';
  const entries=Object.entries(catalog?.exact||{});
  function compile(pairs){
    const values=new Map(),tokens=[];
    for(const [from,to] of pairs){const key=from.trim();if(!key||values.has(key.toLocaleLowerCase('en')))continue;values.set(key.toLocaleLowerCase('en'),to.trim());tokens.push(key);}
    const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const word=/[\p{L}\p{N}_]/u;
    const pattern=tokens.sort((a,b)=>b.length-a.length).map(key=>(word.test(key[0])?'(?<![\\p{L}\\p{N}_])':'')+escape(key)+(word.test(key.at(-1))?'(?![\\p{L}\\p{N}_])':'')).join('|');
    const expression=pattern?new RegExp(pattern,'giu'):null;
    return value=>{
      if(!expression)return String(value);
      return String(value).replace(expression,source=>{
        const result=values.get(source.toLocaleLowerCase('en'));
        if(source===source.toLocaleUpperCase('en'))return result.toLocaleUpperCase('en');
        if(source===source.toLocaleLowerCase('en'))return result.toLocaleLowerCase('en');
        return result;
      });
    };
  }
  const english=compile(entries),malay=compile(entries.map(([a,b])=>[b,a]));
  const translate=value=>current==='en'?english(value):String(value);
  const textRecords=new WeakMap(),attributeRecords=new WeakMap();
  const attributes=['aria-label','aria-valuetext','aria-description','title','placeholder','alt'];
  let observer=null;
  // New learning tools own complete BM/English copy and preserve typed drafts.
  // Do not reverse-translate their text or mathematical field labels.
  const ignored=node=>(node.nodeType===1?node:node.parentElement)?.closest('script,style,noscript,textarea,[data-module-native-language]');
  function text(node){
    if(!node.nodeValue?.trim()||ignored(node))return;
    const previous=textRecords.get(node),value=node.nodeValue;
    const original=previous&&value===previous.rendered?previous.original:malay(value);
    let rendered=translate(original);
    // The original module renders the number and metric noun in separate nodes.
    const label=node.parentElement,property=label?.parentElement;
    if(current==='en'&&label?.tagName==='SPAN'&&property?.classList.contains('property')){
      const forms=catalog?.metrics?.[original.trim().toLocaleLowerCase('en')];
      const count=Number(property.querySelector('b')?.textContent);
      if(forms&&Number.isFinite(count))rendered=original.replace(original.trim(),forms[count===1?0:1]);
    }
    textRecords.set(node,{original,rendered});
    if(value!==rendered)node.nodeValue=rendered;
  }
  function attribute(node,name){
    if(ignored(node))return;
    if(!node.hasAttribute(name))return;
    let record=attributeRecords.get(node);if(!record){record=new Map();attributeRecords.set(node,record);}
    const previous=record.get(name),value=node.getAttribute(name);
    const original=previous&&value===previous.rendered?previous.original:malay(value);
    const rendered=translate(original);record.set(name,{original,rendered});
    if(value!==rendered)node.setAttribute(name,rendered);
  }
  function walk(root){
    if(!root)return;
    if(root.nodeType===3){text(root);return;}
    if(root.nodeType===1){for(const name of attributes)attribute(root,name);}
    const walker=doc.createTreeWalker(root,4);let node;
    while((node=walker.nextNode()))text(node);
    for(const element of root.querySelectorAll?.(attributes.map(name=>'['+name+']').join(','))||[])for(const name of attributes)attribute(element,name);
  }
  function observe(){observer?.observe(doc.documentElement,{subtree:true,characterData:true,childList:true,attributes:true,attributeFilter:attributes});}
  function refresh(root=doc){
    if(!doc)return;
    observer?.disconnect();walk(root);observe();
  }
  function setLanguage(value){current=value==='en'?'en':'ms';if(doc){doc.documentElement.lang=current;refresh();}return current;}
  if(doc){
    if(win?.MutationObserver){observer=new win.MutationObserver(records=>{
      observer.disconnect();
      for(const record of records){
        if(record.type==='characterData')text(record.target);
        else if(record.type==='attributes')attribute(record.target,record.attributeName);
        else for(const node of record.addedNodes)walk(node);
      }
      observe();
    });}
    const context=win?.CanvasRenderingContext2D?.prototype;
    if(context)for(const name of ['fillText','strokeText']){
      const draw=context[name];if(typeof draw==='function')context[name]=function(value,...args){return draw.call(this,translate(value),...args);};
    }
    setLanguage(current);
  }
  return {setLanguage,translate,refresh};
}

import {RICH_TERMS, MATH_SPEECH} from './i18n.mjs';

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const PRECEDENCE = {'=':1,'+':2,'-':2,'*':3,'×':3,'/':3,'^':4};
const TERM_PATTERNS = Object.fromEntries(Object.entries(RICH_TERMS).map(([language,terms]) =>
  [language,new RegExp('(?<![\\p{L}\\p{N}_])(?:'+[...terms].sort((a,b)=>b.length-a.length).join('|')+')(?![\\p{L}\\p{N}_])','giu')]));

// A small bounded grammar for the bank's algebra, not JavaScript or arbitrary HTML.
// Multiplication/division associate left; powers associate right. Prose is untouched.
function parseMath(text,start) {
  let cursor=start, operations=0;
  const tokens=/\s*(pi(?![\p{L}\p{N}_])|[A-Za-z](?![\p{L}\p{N}_])|\d+(?:\.\d+)?(?![\p{L}\p{N}_])|[()=+*/^×-])/uy;
  function peek(){
    if(cursor-start>256)throw new Error('Expression too long');
    tokens.lastIndex=cursor;const match=tokens.exec(text);
    return match?{value:match[1],end:tokens.lastIndex}:null;
  }
  function take(){const token=peek();if(!token)throw new Error('Expected math token');cursor=token.end;return token.value;}
  function expression(minimum=1,depth=0){
    if(depth>32)throw new Error('Expression too deep');
    const first=take();let left;
    if(first==='('){left={type:'group',value:expression(1,depth+1)};if(take()!==')')throw new Error('Missing bracket');}
    else if(/^\d/.test(first))left={type:'number',value:first};
    else if(/^(?:pi|[A-Za-z])$/.test(first))left={type:'variable',value:first};
    else throw new Error('Expected operand');
    while(true){
      const operator=peek()?.value,precedence=PRECEDENCE[operator];
      if(!precedence||precedence<minimum)break;
      take();operations++;
      const right=expression(operator==='^'?precedence:precedence+1,depth+1);
      left={type:'binary',operator,left,right};
    }
    return left;
  }
  try{const node=expression();return operations?{node,end:cursor}:null;}
  catch{return {node:null,end:cursor};}
}

function mathMarkup(node){
  if(node.type==='number')return `<mn>${node.value}</mn>`;
  if(node.type==='variable')return `<mi>${node.value==='pi'?'π':node.value}</mi>`;
  if(node.type==='group')return `<mrow><mo>(</mo>${mathMarkup(node.value)}<mo>)</mo></mrow>`;
  const left=mathMarkup(node.left),right=mathMarkup(node.right);
  if(node.operator==='/')return `<mfrac>${left}${right}</mfrac>`;
  if(node.operator==='^')return `<msup>${left}${right}</msup>`;
  return `<mrow>${left}<mo>${node.operator==='*'||node.operator==='×'?'×':node.operator==='-'?'−':node.operator}</mo>${right}</mrow>`;
}
function mathSpeech(node,words){
  if(node.type==='number'||node.type==='variable')return node.value;
  if(node.type==='group')return `${words.open} ${mathSpeech(node.value,words)} ${words.close}`;
  const left=mathSpeech(node.left,words),right=mathSpeech(node.right,words);
  if(node.operator==='/')return `${words.fraction} ${left} ${words.denominator} ${right} ${words.endFraction}`;
  if(node.operator==='^')return left+' '+(right==='2'?words.squared:right==='3'?words.cubed:words.power+' '+right);
  return `${left} ${words[{'=':'equals','*':'times','×':'times','+':'plus','-':'minus'}[node.operator]]} ${right}`;
}

function proseMarkup(text){
  return escapeHtml(text)
    .replace(/\bpi\b/g,'π')
    .replace(/\s*=\s*/g,' = ')
    .replace(/(\d+(?:\.\d+)?\s*(?:mm|cm|km|m))\s+x\s+(?=\d)/g,'$1 × ')
    .replace(/\b(\d+(?:\.\d+)?)\s*(mm|cm|km|m)(?:\^([23])|([²³]))?(?![\p{L}\p{N}_])/gu,
      (_,number,unit,power,symbol)=>`<span class="measurement">${number}&nbsp;${unit}${power||symbol?'<sup>'+(power||(symbol==='²'?'2':'3'))+'</sup>':''}</span>`);
}
function emphasizedProse(text,language,emphasize){
  if(!emphasize)return proseMarkup(text);
  let html='',end=0;
  for(const match of text.matchAll(TERM_PATTERNS[language])){
    html+=proseMarkup(text.slice(end,match.index))+`<strong class="geometry-term">${escapeHtml(match[0])}</strong>`;
    end=match.index+match[0].length;
  }
  return html+proseMarkup(text.slice(end));
}
function inlineMarkup(text,language,emphasize){
  let html='',end=0,blockedUntil=0;
  const candidates=/\(|(?<![\p{L}\p{N}_])(?:pi|[A-Za-z]|\d+(?:\.\d+)?)(?![\p{L}\p{N}_])/gu;
  for(const match of text.matchAll(candidates)){
    if(match.index<Math.max(end,blockedUntil))continue;
    const math=parseMath(text,match.index);
    // Preserve the consumed region of a failed formula; do not render its interior.
    if(!math?.node){blockedUntil=Math.max(blockedUntil,math?.end||0);continue;}
    html+=emphasizedProse(text.slice(end,match.index),language,emphasize);
    html+=`<span class="math-expression" role="math" aria-label="${escapeHtml(mathSpeech(math.node,MATH_SPEECH[language]))}"><math xmlns="http://www.w3.org/1998/Math/MathML" aria-hidden="true">${mathMarkup(math.node)}</math></span>`;
    end=math.end;
  }
  return html+emphasizedProse(text.slice(end),language,emphasize);
}

export function formatMathText(value,language='ms'){
  return inlineMarkup(String(value),language==='en'?'en':'ms',false);
}

// Only generated semantic markup is allowed. HTML and links in source stay literal.
// Explicit emphasis uses **strong** and _emphasis_; * remains multiplication.
export function formatRichText(value,language='ms'){
  language=language==='en'?'en':'ms';
  const text=String(value).replace(/\r\n?/g,'\n');let html='',end=0;
  for(const match of text.matchAll(/\*\*([^*\n]+)\*\*|_([^_\n]+)_|\n/g)){
    html+=inlineMarkup(text.slice(end,match.index),language,true);
    html+=match[0]==='\n'?'<br>':match[1]?`<strong>${inlineMarkup(match[1],language,false)}</strong>`:`<em>${inlineMarkup(match[2],language,false)}</em>`;
    end=match.index+match[0].length;
  }
  return html+inlineMarkup(text.slice(end),language,true);
}

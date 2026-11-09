// Wrap every Arabic string in the app script with tx()/txp() so it can be translated at runtime.
// Idempotent: strings already inside tx()/txp() are left alone. Writes the key list (hash -> Arabic).
import fs from 'fs';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
const [,,file,keysOut]=process.argv;
const html=fs.readFileSync(file,'utf8');
const AR=/[؀-ۿ]/;
const a=html.lastIndexOf('<script>'), b=html.indexOf('</script>',a);
const js=html.slice(a+8,b);
export const hash=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0).toString(36)};
const ast=acorn.parse(js,{ecmaVersion:'latest',ranges:true});
const keys=new Map();
const isStr=n=>n&&n.type==='Literal'&&typeof n.value==='string';
const isTx=n=>n&&n.type==='CallExpression'&&n.callee.type==='Identifier'&&(n.callee.name==='tx'||n.callee.name==='txp');
// collect existing keys from previous runs
walk.full(ast,n=>{if(isTx(n)&&isStr(n.arguments[0])){
  if(n.callee.name==='tx')keys.set(n.arguments[0].value,n.arguments[1].value);
  else{const strs=n.arguments[1].elements.map(e=>e.value);keys.set(n.arguments[0].value,strs.map((s,i)=>i?'{'+(i-1)+'}'+s:s).join(''))}}});
const edits=[]; // {start,end,build:(render)=>string}
const skip=new Set(); // nodes handled by a parent edit or not to touch
const INLINE=/^<\/?(b|i|em|strong|u|br|small|mark|bdi)\b[^>]*>$/i;
function flat(n){if(n.type==='BinaryExpression'&&n.operator==='+'&&hasStr(n))return [...flat(n.left),...flat(n.right)];return [n]}
function hasStr(n){if(isStr(n)||(n.type==='TemplateLiteral'))return true;if(n.type==='BinaryExpression'&&n.operator==='+')return hasStr(n.left)||hasStr(n.right);return false}
function hasArabicChain(n){return flat(n).some(x=>(isStr(x)&&AR.test(x.value))||(x.type==='TemplateLiteral'&&!x.expressions.length&&AR.test(x.quasis[0].value.cooked)))}
// items: {c:char} | {e:node}
function runs(items){
  // returns list of {raw:true,items} | {run:true,items}
  const out=[];let cur=[];let i=0;
  const flushText=()=>{if(cur.length){out.push({run:true,items:cur});cur=[]}};
  const peekTag=k=>{ // if items[k] starts a tag, return end index (inclusive) else -1
    if(items[k].c!=='<')return -1;const nx=items[k+1];if(!nx||nx.c===undefined||!/[a-zA-Z\/!]/.test(nx.c))return -1;
    let q=null;for(let j=k+1;j<items.length;j++){const it=items[j];if(it.c===undefined)continue;
      if(q){if(it.c===q)q=null;continue}if(it.c==='"'||it.c==="'")q=it.c;else if(it.c==='>')return j}
    return -1};
  while(i<items.length){
    const end=peekTag(i);
    if(end<0){cur.push(items[i]);i++;continue}
    const tagItems=items.slice(i,end+1);
    const tagText=tagItems.map(x=>x.c??'\u0001').join('');
    if(INLINE.test(tagText)&&!tagItems.some(x=>x.e)){cur.push(...tagItems);i=end+1;continue}
    flushText();
    // inside tag: split attribute values with Arabic into runs
    let j=0,raw=[];
    while(j<tagItems.length){const it=tagItems[j];
      if((it.c==='"'||it.c==="'")){const q=it.c;let k=j+1;while(k<tagItems.length&&tagItems[k].c!==q)k++;
        const val=tagItems.slice(j+1,k);
        if(val.some(x=>x.c&&AR.test(x.c))){raw.push(it);out.push({raw:true,items:raw});raw=[];out.push({run:true,items:val});raw=[tagItems[k]]}
        else raw.push(...tagItems.slice(j,k+1));
        j=k+1;continue}
      raw.push(it);j++}
    out.push({raw:true,items:raw});
    i=end+1}
  flushText();
  // runs without Arabic become raw; trim whitespace off runs
  const res=[];
  for(const r of out){
    if(r.run&&!r.items.some(x=>x.c&&AR.test(x.c))){res.push({raw:true,items:r.items});continue}
    if(r.raw){res.push(r);continue}
    let s=0,e=r.items.length;while(s<e&&r.items[s].c&&/\s/.test(r.items[s].c))s++;while(e>s&&r.items[e-1].c&&/\s/.test(r.items[e-1].c))e--;
    if(s)res.push({raw:true,items:r.items.slice(0,s)});res.push({run:true,items:r.items.slice(s,e)});if(e<r.items.length)res.push({raw:true,items:r.items.slice(e)})}
  return res}
function runCall(items,render){
  const strs=[''],exprs=[];
  for(const it of items){if(it.e){exprs.push(render(it.e));strs.push('')}else strs[strs.length-1]+=it.c}
  const key=strs.map((s,i)=>i?'{'+(i-1)+'}'+s:s).join('');
  const h=hash(key);if(keys.has(h)&&keys.get(h)!==key)throw new Error('hash collision '+key);keys.set(h,key);
  if(!exprs.length)return `tx(${JSON.stringify(h)},${JSON.stringify(strs[0])})`;
  return `txp(${JSON.stringify(h)},${JSON.stringify(strs)},${exprs.join(',')})`}
const tplEsc=s=>s.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
function asConcat(segs,render){ // segs from runs(): produce JS expression string
  const parts=[];
  for(const sg of segs){
    if(sg.run){parts.push(runCall(sg.items,render));continue}
    let buf='';for(const it of sg.items){if(it.e){if(buf){parts.push(JSON.stringify(buf));buf=''}parts.push('('+render(it.e)+')')}else buf+=it.c}
    if(buf)parts.push(JSON.stringify(buf))}
  if(parts.length===1&&parts[0].startsWith('tx'))return parts[0];
  return '(""+'+parts.join('+')+')'}
walk.fullAncestor(ast,(n,anc)=>{
  const parent=anc[anc.length-2];
  if(isTx(n)){walk.full(n,x=>{if(x!==n)skip.add(x)});return}
  if(n.type==='TemplateLiteral'){
    if(!n.quasis.some(q=>AR.test(q.value.cooked)))return;
    if(parent&&parent.type==='TaggedTemplateExpression')return;
    edits.push({node:n,build:render=>{
      const items=[];n.quasis.forEach((q,i)=>{for(const c of q.value.cooked)items.push({c});if(i<n.expressions.length)items.push({e:n.expressions[i]})});
      let out='`';for(const sg of runs(items)){if(sg.run)out+='${'+runCall(sg.items,render)+'}';else for(const it of sg.items)out+=it.e?'${'+render(it.e)+'}':tplEsc(it.c)}
      return out+'`'}});
    return}
  if(n.type==='BinaryExpression'&&n.operator==='+'){
    if(parent&&parent.type==='BinaryExpression'&&parent.operator==='+'&&hasStr(parent))return;
    if(!hasStr(n)||!hasArabicChain(n))return;
    const parts=flat(n);
    edits.push({node:n,chain:parts,build:render=>{
      const items=[];for(const p of parts){if(isStr(p))for(const c of p.value)items.push({c});
        else if(p.type==='TemplateLiteral'&&!p.expressions.length)for(const c of p.quasis[0].value.cooked)items.push({c});
        else items.push({e:p})}
      return asConcat(runs(items),render)}});
    return}
  if(isStr(n)&&AR.test(n.value)){
    if(parent&&parent.type==='Property'&&parent.key===n&&!parent.computed)return;
    edits.push({node:n,build:render=>{const items=[...n.value].map(c=>({c}));return asConcat(runs(items),render)}});
  }
});
// drop edits for nodes inside tx() calls, and string/template parts consumed by a chain
const chainParts=new Set();for(const e of edits)if(e.chain)for(const p of e.chain)if(isStr(p)||(p.type==='TemplateLiteral'&&!p.expressions.length))chainParts.add(p);
const live=edits.filter(e=>!skip.has(e.node)&&!chainParts.has(e.node)).sort((x,y)=>x.node.start-y.node.start||y.node.end-x.node.end);
function render(start,end){ // source of [start,end) with edits applied
  let out='',pos=start;
  for(const e of live){if(e.node.start<pos||e.node.end>end||e.node.start<start)continue;
    out+=js.slice(pos,e.node.start);out+=e.build(x=>renderNode(x));pos=e.node.end}
  return out+js.slice(pos,end)}
function renderNode(x){const own=live.find(e=>e.node===x);if(own)return own.build(y=>renderNode(y));return render(x.start,x.end)}
const outJs=render(0,js.length);
acorn.parse(outJs,{ecmaVersion:'latest'});
fs.writeFileSync(file,html.slice(0,a+8)+outJs+html.slice(b));
// static html keys
const body=html.slice(html.indexOf('</style>'),a).replace(/<script[\s\S]*?<\/script>/g,'');
const add=s=>{s=s.trim();if(s&&AR.test(s))keys.set(hash(s),s)};
for(const m of body.matchAll(/(?:aria-label|placeholder|title|alt)="([^"]*)"/g))add(m[1]);
for(const t of body.split(/<[^>]*>/))add(t);
const t=html.match(/<title>([^<]*)<\/title>/);if(t)add(t[1]);
fs.writeFileSync(keysOut,JSON.stringify(Object.fromEntries(keys),null,1));
console.log('edits',live.length,'keys',keys.size,'chars',[...keys.values()].join('').length);

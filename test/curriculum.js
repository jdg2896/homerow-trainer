const E=require('../src/engine.js');const fs=require('fs');
const W=JSON.parse(fs.readFileSync(__dirname+'/../data/words.json'));
const L=E.buildLayout(fs.readFileSync(__dirname+'/../data/default-layout.json','utf8'));
for(const pref of ['layers','reach']){
const C=E.buildCurriculum(L,pref);
console.log('== pref',pref, C.lessons.length,'lessons');
C.units.forEach(u=>{console.log('#',u.title);u.lessons.forEach(l=>console.log('  ',l.num,l.kind,JSON.stringify(l.title)))});
if(pref==='layers'){
 const r=C.routes.chars; for(const c of ['(','!','7','-','~','|','/','T',':','"','\\','=']){const x=r[c]; console.log(c,x&&{layer:x.layer,pos:x.pos,holds:x.holds.map(h=>h.pos+':'+(h.mod||'L'+h.layer))})}
 for(const l of [C.lessons[0],C.lessons[2],C.lessons[8],C.lessons.find(l=>l.title.startsWith('Capitals')),C.lessons.find(l=>l.unit==='layer-3'),C.lessons.find(l=>l.kind==='chords')]){
  const s=E.makeStages(C,l,W,90); console.log('--',l.title); s.forEach(st=>console.log('   ',st.name,':',st.items.map(i=>i.t==='c'?i.ch:'['+E.keyItemLabel(i)+']').join('')));
  s.forEach(st=>st.items.forEach(i=>{if(!E.routeFor(L,C,i,pref)) console.log('NO ROUTE',JSON.stringify(i))}));
 }
}}

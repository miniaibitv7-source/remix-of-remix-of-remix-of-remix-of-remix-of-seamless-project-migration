(function(root){
"use strict";
/* Sistema de caveiras (regras do Tibia). O servidor decide frags e caveiras; aqui ficam só regras de exibição e reações locais. */
const RULES={fightMs:60000,killWhiteMs:15*60000,redDays:30,blackDays:45,red:{day:3,week:5,month:10},black:{day:6,week:10,month:20}};
const NAMES={white:"Caveira branca",yellow:"Caveira amarela",red:"Caveira vermelha",black:"Caveira preta"};
const COLORS={white:["#f4f1e8","#2a241b"],yellow:["#f2cf3a","#3d2f05"],red:["#d8332b","#2e0705"],black:["#1b1714","#e9e2d2"]};
function norm(k){return Object.prototype.hasOwnProperty.call(NAMES,k)?k:""}
function name(k){return NAMES[norm(k)]||"Sem caveira"}
/* Pode atacar? "theirs" já inclui amarela (quem me atacou enquanto eu tinha caveira). */
function canAttack(o){
 const mine=norm(o&&o.mine),theirs=norm(o&&o.theirs);
 if(theirs)return {ok:true,justified:true};
 if(mine==="black")return {ok:false,reason:"Com caveira preta você só pode atacar jogadores marcados com caveira."};
 if(o&&o.secure)return {ok:false,reason:"Modo seguro ligado: desligue-o no painel de caveiras para atacar jogadores sem caveira."};
 return {ok:true,justified:false};
}
/* Dano entre jogadores: metade, ou total contra quem tem caveira preta. */
function damage(raw,o){o=o||{};const r=Math.min(500,Math.max(0,Number(raw)||0));
 const base=Math.max(1,Math.round(r-(Number(o.shielding)||0)*.25-(Number(o.def)||0)));
 return Math.max(1,Math.round(base*(o.black?1:.5)))}
function losesItems(k){k=norm(k);return k==="red"||k==="black"}
/* Morrer com caveira vermelha ou preta: perde tudo que carrega (ouro, gemas e depot ficam). Preta: renasce com no máximo 40 de vida e sem mana. */
function deathPenalty(p,k){k=norm(k);const out={lost:false,items:0,black:k==="black"};if(!p||!losesItems(k))return out;
 out.items=(Array.isArray(p.bag)?p.bag.length:0)+Object.keys(p.equip||{}).length+Object.values(p.loot||{}).reduce((a,b)=>a+(Number(b)||0),0)+(p.hpPot|0)+(p.mpPot|0);
 p.bag=[];p.equip={};p.loot={};p.hpPot=0;p.mpPot=0;out.lost=true;
 if(k==="black"){p.hp=Math.min(Number(p.hp)||0,40);p.mp=0}
 return out}
function left(ms){ms=Math.max(0,Number(ms)||0);const s=Math.ceil(ms/1000);if(s>=86400){const d=Math.floor(s/86400),h=Math.floor(s%86400/3600);return d+"d"+(h?" "+h+"h":"")}
 if(s>=3600){const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h+"h"+(m?" "+m+"min":"")}
 return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function draw(ctx,x,y,s,k){k=norm(k);if(!k||!ctx)return;const c=COLORS[k],f=c[0],e=c[1],cx=x+s/2,cy=y+s/2,r=s/2;
 ctx.save();ctx.fillStyle=e;ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();
 ctx.fillStyle=f;ctx.beginPath();ctx.arc(cx,cy-r*.14,r*.66,0,7);ctx.fill();ctx.fillRect(cx-r*.38,cy+r*.18,r*.76,r*.5);
 ctx.fillStyle=e;ctx.beginPath();ctx.arc(cx-r*.27,cy-r*.12,r*.17,0,7);ctx.arc(cx+r*.27,cy-r*.12,r*.17,0,7);ctx.fill();
 ctx.beginPath();ctx.moveTo(cx,cy+r*.06);ctx.lineTo(cx-r*.09,cy+r*.24);ctx.lineTo(cx+r*.09,cy+r*.24);ctx.fill();
 for(const t of [-.19,0,.19])ctx.fillRect(cx+t*r-r*.025,cy+r*.42,r*.05,r*.26);
 ctx.restore()}
function svg(k,size){k=norm(k);if(!k)return "";const c=COLORS[k],z=Number(size)||14;
 return `<svg width="${z}" height="${z}" viewBox="0 0 20 20" style="vertical-align:-2px" role="img" aria-label="${NAMES[k]}"><circle cx="10" cy="10" r="10" fill="${c[1]}"/><circle cx="10" cy="8.6" r="6.6" fill="${c[0]}"/><rect x="6.2" y="11.8" width="7.6" height="5" fill="${c[0]}"/><circle cx="7.3" cy="8.8" r="1.7" fill="${c[1]}"/><circle cx="12.7" cy="8.8" r="1.7" fill="${c[1]}"/><path d="M10 10.6 9.1 12.4h1.8z" fill="${c[1]}"/><rect x="8" y="14.2" width=".5" height="2.6" fill="${c[1]}"/><rect x="9.75" y="14.2" width=".5" height="2.6" fill="${c[1]}"/><rect x="11.5" y="14.2" width=".5" height="2.6" fill="${c[1]}"/></svg>`}
root.LawlSkulls={RULES,NAMES,norm,name,canAttack,damage,losesItems,deathPenalty,left,draw,svg};
})(typeof window!=="undefined"?window:globalThis);

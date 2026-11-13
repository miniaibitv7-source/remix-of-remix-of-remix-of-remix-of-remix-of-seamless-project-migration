(function(root){
"use strict";
const PRICES=Object.freeze({xp:50,home:5,blessing:1,rename:50});
const HOUR=3600000;
function quote(p,action,ctx={}){
 if(!Object.hasOwn(PRICES,action))return {ok:false,reason:"Oferta inválida."};
 if(!Number.isFinite(p.gems)||p.gems<PRICES[action])return {ok:false,reason:"Gemas insuficientes."};
 if(action==="home"&&(ctx.combat||ctx.pz||ctx.trade))return {ok:false,reason:"Encerre o combate e as trocas antes de teleportar."};
 if(action==="rename"){
  const name=String(ctx.name||"").trim();
  if(!/^[\p{L}][\p{L} ]{2,13}$/u.test(name)||name.toLowerCase()==="gamemaster"||name.toLowerCase()===String(p.name).toLowerCase())return {ok:false,reason:"Escolha um nome diferente, com 3 a 14 letras e espaços; GameMaster é reservado."};
 }
 return {ok:true,cost:PRICES[action]};
}
function xp(base,p,now){return Math.round(base*(p.premiumUntil>now?1.5:1)*(p.xpBoostUntil>now?1.5:1))}
const BLESS_REDUCTION=56;
/* Each charge is the complete package. Reserves do not multiply its reduction.
   Skull penalties affect items, not the regular blessing XP/skill reduction. */
function death(p,skull,need){
 const charges=Math.max(0,Math.floor(Number(p.deathBlessings)||0)),blessed=charges>0;
 p.deathBlessings=blessed?charges-1:0;
 const numerator=blessed?44:100,lost=Math.floor(Math.max(0,Number(p.xp)||0)*numerator/1000);
 const skillsLost={};
 if(typeof need==="function"&&p.skills){
  p.tries??={};
  for(const k of Object.keys(p.skills)){
   const base=k==="magic"?0:10;let lv=Math.max(base,Math.floor(Number(p.skills[k])||base));
   let progress=Math.max(0,Number(p.tries[k])||0),total=progress;
   for(let n=base;n<lv;n++)total+=need(k,n);
   let loss=Math.floor(total*numerator/1000);skillsLost[k]=loss;progress-=loss;
   while(progress<0&&lv>base){lv--;progress+=need(k,lv)}
   p.skills[k]=lv;p.tries[k]=Math.max(0,progress);
  }
 }
 return {blessed,lost,skillsLost,reduction:blessed?BLESS_REDUCTION:0,protectItems:blessed&&!['red','black'].includes(skull)};
}
root.LawlMarket={PRICES,HOUR,BLESS_REDUCTION,quote,xp,death};
})(typeof window!=="undefined"?window:globalThis);
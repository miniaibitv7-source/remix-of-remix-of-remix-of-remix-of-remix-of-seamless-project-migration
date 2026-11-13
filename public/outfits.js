/* Browser-safe cosmetic rules and pixel renderer, shared by world and wardrobe. */
(function(root){
"use strict";
const palette=[
 ["Carvão","#252936"],["Prata","#b9c5ce"],["Neve","#edf1ea"],["Vermelho","#bd414b"],
 ["Coral","#ea806d"],["Ouro","#e7bc58"],["Verde","#559969"],["Menta","#82c8a1"],
 ["Azul","#477da8"],["Gelo","#87bed8"],["Violeta","#8968a5"],["Rosa","#ce8bb0"],
 ["Cobre","#976640"],["Areia","#cead7c"],["Marfim","#e5d5b7"],["Noite","#3e455c"]
];
const catalog=[
 {id:"citizen",name:"Cidadão",hat:"hair",detail:"Colete e cinto de viagem"},
 {id:"knight",name:"Cavaleiro",hat:"helm",detail:"Armadura, elmo e ombreiras"},
 {id:"hunter",name:"Caçador",hat:"hood",detail:"Capuz e traje de patrulha"},
 {id:"mage",name:"Mago",hat:"wizard",detail:"Chapéu pontudo e túnica"},
 {id:"druid",name:"Druida",hat:"leaf",detail:"Coroa de folhas e veste ritual"},
 {id:"assassin",name:"Assassino",hat:"mask",detail:"Máscara e traje furtivo"},
 {id:"noble",name:"Nobre",hat:"crown",detail:"Coroa e casaca bordada"},
 {id:"barbarian",name:"Bárbaro",hat:"horns",detail:"Elmo com chifres e peles"}
];
const defaults={knight:["knight",1,1,15,12],paladin:["hunter",5,5,6,12],sorcerer:["mage",10,10,15,0],druid:["druid",6,6,12,12]};
function normalize(value,voc){
 const d=defaults[voc]||defaults.knight,o=value&&typeof value==="object"?value:{};
 const col=(k,i)=>Number.isInteger(o[k])&&o[k]>=0&&o[k]<palette.length?o[k]:d[i];
 const r={id:catalog.some(c=>c.id===o.id)?o.id:d[0],head:col("head",1),body:col("body",2),legs:col("legs",3),feet:col("feet",4),cape:o.cape===true,ornament:o.ornament===true};
 if(r.id==="mage"&&o.hat===false)r.hat=false;
 return r;
}
function apply(player,draft){player.outfit=normalize(draft,player.voc);return player.outfit}
/* Pixel-art chibi sprites (big head, dark outline, flat 2-tone shading), baked once per look/direction/step and cached. */
const INK="#1b1424",SKIN="#f2c49b",SKIN_D="#d4936c",BLUSH="#ec9a8c",GOLD="#e7bc58",IVORY="#efe3c4",LEAF="#82c8a1",LEAF_D="#3f7f4f";
const GW=20,GH=28,PAD=1,TOP=7,cache=new Map();
function rgb(h){h=h.replace("#","");return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16))}
function mix(a,b,k){const A=rgb(a),B=rgb(b);return"#"+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,"0")).join("")}
const dk=(c,k=.3)=>mix(c,"#120c1a",k),lt=(c,k=.28)=>mix(c,"#ffffff",k);
function canvas(w,h){if(typeof document!=="undefined"&&document.createElement){const c=document.createElement("canvas");c.width=w;c.height=h;return c}return typeof OffscreenCanvas!=="undefined"?new OffscreenCanvas(w,h):null}
function sprite(o,kind,view,s){
 const key=[o.id,o.head,o.body,o.legs,o.feet,o.cape?1:0,o.ornament?1:0,o.hat===false?0:1,view,s].join("|"),hit=cache.get(key);if(hit)return hit;
 const W=GW+PAD*2,H=GH+PAD*2,base=canvas(W,H),out=canvas(W,H);if(!base||!out)return null;
 const g=base.getContext("2d"),P=(x,y,w,h,col)=>{if(w>0&&h>0){g.fillStyle=col;g.fillRect(x+PAD,y+PAD,w,h)}};
 const C=k=>palette[o[k]][1],Hc=C("head"),Hd=dk(Hc),Hl=lt(Hc),B=C("body"),Bd=dk(B),Bl=lt(B,.22),L=C("legs"),Ld=dk(L),F=C("feet"),Fd=dk(F,.35);
 const hat=kind.hat,robe=hat==="wizard",front=view==="south",back=view==="north",side=view==="east";
 /* capa atrás do corpo */
 if(o.cape&&!back){if(side){P(3,19,4,7,Hd);P(4,19,3,6,Hc)}else{P(3,19,14,7,Hd);P(4,19,12,6,Hc)}}
 /* pernas e pés: ciclo de caminhada em 4 quadros (s=1..4; 0 = parado). 1/3 = passada aberta, 2/4 = perna passando no ar */
 const walk=s>0,contact=s===1||s===3,A=s===1||s===2,FS=dk(F,.15);
 const leg=(x,fy,w,sh)=>{if(fy>24){P(x,24,w,fy-24,sh?Ld:L);P(x+w-1,24,1,fy-24,Ld)}P(x,fy,w,1,sh?FS:F);P(x,fy+1,w,1,Fd);if(!sh)P(x,fy,1,1,lt(F,.25))};
 const sleg=(xt,xf,w,up,sh)=>{P(xt,24,3,1,sh?Ld:L);const fy=up?24:25;P(xf,fy,w,1,sh?FS:F);P(xf,fy+1,w,1,Fd);if(!sh)P(xf,fy,1,1,lt(F,.25))};
 if(side){
  if(!walk){sleg(7,7,3,false,true);sleg(10,10,4,false,false)}
  else if(contact){if(A){sleg(7,4,3,false,true);sleg(10,11,4,false,false)}else{sleg(9,11,4,false,true);sleg(7,4,4,false,false)}}
  else{if(A){sleg(10,11,3,true,true);sleg(8,7,4,false,false)}else{sleg(8,7,4,false,true);sleg(10,11,4,true,false)}}}
 else{
  /* de frente o pé que vem para a frente desce 1 pixel e abre para fora; o de trás sobe */
  const lowLeft=front?A:!A;
  if(!walk){leg(6,25,3);leg(11,25,3)}
  else if(contact){if(lowLeft){leg(11,24,3,true);leg(5,26,3)}else{leg(6,24,3,true);leg(12,26,3)}}
  else{if(lowLeft){leg(11,24,3,true);leg(6,25,3)}else{leg(6,24,3,true);leg(11,25,3)}}}
 /* balanço dos braços: oposto à perna que avança */
 const na=!walk?0:contact?(A?-2:2):(A?-1:1);
 /* braço de trás (lateral) */
 if(side){P(8-na,19,2,3,dk(B,.45));P(8-na,22,2,1,SKIN_D)}
 /* tronco */
 const tx=side?6:5,tw=side?8:10;
 P(tx,19,tw,5,B);P(tx,19,1,4,Bl);P(tx+tw-2,19,2,5,Bd);P(tx,23,tw,1,Bd);P(tx,22,tw,1,dk(F,.2));
 if(front){P(9,19,2,1,SKIN);P(9,22,2,1,o.ornament?GOLD:"#c9c3b4")}
 if(hat==="hair"&&front){P(5,19,2,3,dk(B,.32));P(13,19,2,3,dk(B,.45))}
 if(hat==="crown"&&!back){side?P(9,19,2,4,Hc):(P(8,19,1,4,Hc),P(11,19,1,4,Hc))}
 if(robe){P(tx,19,tw,7,B);P(tx,19,1,6,Bl);P(tx+tw-2,19,2,7,Bd);P(tx,25,tw,1,Hc);P(tx,22,tw,1,dk(B,.4));if(front)P(9,19,2,1,SKIN)}
 /* braços */
 if(!side){const arm=(x,dy,sh)=>{P(x,19,2,3+dy,B);P(sh?x+1:x,19,1,3+dy,sh?Bd:Bl);P(x,22+dy,2,2,SKIN);P(sh?x+1:x,23+dy,1,1,SKIN_D)};
  const lowLeft=front?A:!A,sw=!walk?0:contact?1:0;arm(3,sw?(lowLeft?-1:1):0,false);arm(15,sw?(lowLeft?1:-1):0,true)}
 else{P(9+na,19,2,3,dk(B,.15));P(10+na,19,1,3,Bd);P(9+na,22,2,2,SKIN);P(10+na,23,1,1,SKIN_D)}
 if(o.cape&&back){P(4,19,12,7,Hc);P(4,19,12,1,Hl);P(14,19,2,7,Hd);P(4,25,12,1,Hd)}
 /* cabeça grande */
 if(back){P(5,9,10,1,Hc);P(4,10,12,7,Hc);P(5,17,10,1,Hd);P(6,10,4,1,Hl);P(14,10,1,6,Hd);P(7,18,6,1,SKIN_D)}
 else if(side){P(6,9,8,1,Hc);P(5,10,10,3,Hc);P(5,13,10,4,SKIN);P(6,17,8,1,SKIN);P(7,18,6,1,SKIN_D);P(5,13,4,4,Hc);P(6,17,2,1,Hd);P(9,13,2,1,Hc);P(9,15,1,1,SKIN_D);P(12,14,1,2,INK);P(15,15,1,1,SKIN);P(12,16,1,1,BLUSH);P(7,10,4,1,Hl);P(5,12,1,4,Hd)}
 else{P(5,9,10,1,Hc);P(4,10,12,3,Hc);P(4,13,12,4,SKIN);P(5,17,10,1,SKIN);P(6,18,8,1,SKIN_D);P(4,13,2,2,Hc);P(14,13,2,2,Hc);P(7,13,2,1,Hc);P(11,13,1,1,Hc);P(4,15,1,1,SKIN_D);P(15,15,1,2,SKIN_D);
  P(7,14,1,2,INK);P(12,14,1,2,INK);P(6,16,1,1,BLUSH);P(13,16,1,1,BLUSH);P(9,17,2,1,SKIN_D);P(6,10,4,1,Hl);P(14,10,1,3,Hd)}
 /* chapéus e acessórios de cabeça */
 if(hat==="helm"||hat==="horns"){
  if(back){P(5,7,10,1,Hc);P(4,8,12,10,Hc);P(6,8,4,1,Hl);P(14,8,1,9,Hd);P(4,17,12,1,Hd)}
  else if(side){P(6,7,8,1,Hc);P(5,8,10,5,Hc);P(5,13,4,4,Hc);P(7,8,4,1,Hl);P(5,12,10,1,Hd);P(13,13,2,1,Hd)}
  else{P(5,7,10,1,Hc);P(4,8,12,5,Hc);P(4,13,2,4,Hc);P(14,13,2,4,Hc);P(6,8,4,1,Hl);P(14,9,1,3,Hd);P(4,12,12,1,Hd);P(9,13,2,2,Hd)}
  if(!side){P(2,19,4,2,Hc);P(14,19,4,2,Hc);P(2,19,4,1,Hl);P(14,20,4,1,Hd)}else{P(8,19,4,2,Hc);P(8,19,4,1,Hl)}
  if(hat==="horns"){if(side){P(5,6,2,3,IVORY);P(4,4,2,2,IVORY)}else{P(2,7,2,3,IVORY);P(1,5,2,2,IVORY);P(16,7,2,3,IVORY);P(17,5,2,2,IVORY);P(2,9,2,1,dk(IVORY,.2));P(16,9,2,1,dk(IVORY,.2))}}}
 if(hat==="hood"||hat==="mask"){
  if(back){P(7,6,6,1,Hc);P(5,7,10,1,Hc);P(4,8,12,10,Hc);P(6,8,4,1,Hl);P(14,8,1,10,Hd)}
  else if(side){P(4,8,2,2,Hc);P(6,7,8,1,Hc);P(5,8,10,5,Hc);P(4,10,5,8,Hc);P(7,8,4,1,Hl);P(9,12,6,1,Hd)}
  else{P(7,6,6,1,Hc);P(5,7,10,1,Hc);P(4,8,12,5,Hc);P(4,13,2,5,Hc);P(14,13,2,5,Hc);P(6,8,4,1,Hl);P(6,12,8,1,Hd);P(14,9,1,8,Hd)}
  if(hat==="mask"&&!back){side?(P(11,16,5,2,Hd),P(11,16,5,1,Hc)):(P(5,16,10,2,Hd),P(5,16,10,1,Hc))}}
 if(robe){if(o.hat!==false){
   if(side){P(3,11,14,2,Hc);P(3,12,14,1,Hd);P(6,8,8,3,Hc);P(6,10,8,1,GOLD);P(5,5,6,3,Hc);P(4,3,4,2,Hc);P(3,2,2,1,Hc);P(7,8,3,1,Hl)}
   else{P(2,11,16,2,Hc);P(2,12,16,1,Hd);P(5,8,10,3,Hc);P(5,10,10,1,GOLD);P(7,5,6,3,Hc);P(9,3,4,2,Hc);P(11,2,3,1,Hc);P(6,8,3,1,Hl);P(13,8,1,2,Hd);if(front)P(10,10,1,1,"#fff6c8")}}
  else if(!back){side?P(5,13,3,6,Hc):(P(4,13,2,6,Hc),P(14,13,2,6,Hc))}}
 if(hat==="leaf"){if(side){P(5,10,10,1,LEAF_D);P(6,8,2,2,LEAF);P(10,8,2,2,LEAF)}else{P(4,10,12,1,LEAF_D);P(4,8,2,2,LEAF);P(9,7,2,2,LEAF);P(14,8,2,2,LEAF);P(9,7,1,1,lt(LEAF,.35))}}
 if(hat==="crown"){const x0=side?6:5,w=side?8:10;P(x0,8,w,2,GOLD);P(x0,9,w,1,dk(GOLD,.25));for(let i=x0;i<x0+w;i+=side?3:4)P(i,6,2,2,GOLD);if(!back)P(side?11:9,8,2,1,palette[3][1])}
 if(o.ornament&&!side){P(3,19,2,1,GOLD);P(15,19,2,1,GOLD)}
 /* contorno escuro de 1 pixel */
 const q=out.getContext("2d");for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]])q.drawImage(base,a,b);
 q.globalCompositeOperation="source-in";q.fillStyle=INK;q.fillRect(0,0,W,H);q.globalCompositeOperation="source-over";q.drawImage(base,0,0);
 if(cache.size>600)cache.clear();cache.set(key,out);return out;
}
function draw(ctx,x,y,size,value,voc,dir="south",time=0,moving=false){
 const o=normalize(value,voc),kind=catalog.find(c=>c.id===o.id),u=size/20;
 const view=dir==="north"?"north":dir==="east"||dir==="west"?"east":"south",f=moving?((Math.floor(time*8)%4)+4)%4+1:0,contact=f===1||f===3;
 const img=sprite(o,kind,view,f);if(!img)return;
 /* passada: o corpo sobe quando a perna passa no ar, inclina para a frente de lado e ginga de frente/costas */
 const bob=moving?(contact?0:-u*.9):Math.round(Math.sin(time*2.4))*u*.35;
 ctx.save();ctx.imageSmoothingEnabled=false;
 {const cx=x+size/2,fy=y+size,lean=moving?(view==="east"?(dir==="east"?.08:-.08):(f<=2?.045:-.045)):0,sq=moving?(contact?.035:-.02):Math.sin(time*2.4)*.015;
  ctx.translate(cx,fy);ctx.rotate(lean);ctx.scale(1+sq*.5,1-sq);ctx.translate(-cx,-fy)}
 if(dir==="west"){ctx.translate(2*x+size,0);ctx.scale(-1,1)}
 ctx.drawImage(img,Math.round(x-PAD*u),Math.round(y+(-TOP-PAD)*u+bob),Math.round((GW+2*PAD)*u),Math.round((GH+2*PAD)*u));
 ctx.restore();
}
/* Quadro do ciclo de caminhada (0 parado, 1..4 andando); exposto para a poeira dos passos acompanhar os pés. */
function walkFrame(time,moving){return moving?((Math.floor(time*8)%4)+4)%4+1:0}
root.LawlOutfits={palette,catalog,normalize,apply,draw,walkFrame};
})(globalThis);
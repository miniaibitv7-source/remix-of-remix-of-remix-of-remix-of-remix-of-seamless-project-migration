(function(root){
"use strict";
const palette={sand:"#d6ca86",sandShade:"#b7a96c",jungle:"#286b4b",leaf:"#50a66b",stone:"#8b9d9b",crack:"#506b6a",wood:"#916c43",woodEdge:"#58452e",sail:"#e5ede6",mast:"#72533c",crab:"#d96950",eye:"#192d29",snake:"#69b864",snakeBelly:"#c8d97a",pirate:"#475e72",bandana:"#ce6056",bone:"#d6dfd6",specter:"#6ec8bc"};
const city={name:"Porto Aurora",x1:115,y1:25,x2:131,y2:37,cx:122,cy:31};
const ports=[{id:"lawl",name:"Lawl",captain:"Capitão Baltazar",x:30,y:37,landing:{x:30,y:38},to:"aurora",fare:20},{id:"aurora",name:city.name,captain:"Capitã Marina",x:122,y:38,landing:{x:122,y:39},to:"lawl",fare:20}];
const zones=[
 {name:"Praia das Marés",x1:110,y1:48,x2:130,y2:65,top:"Caranguejo das Marés",sub:"Pirata Saqueador",n:12,rec:"1–10",biome:"beach"},
 {name:"Selva Esmeralda",x1:136,y1:6,x2:156,y2:26,top:"Serpente Esmeralda",sub:"Aranha da Selva",n:14,rec:"12–25",biome:"jungle"},
 {name:"Ruínas do Farol",x1:136,y1:44,x2:156,y2:67,top:"Guardião do Farol",sub:"Espectro das Marés",n:10,rec:"30–50",biome:"ruins"}
];
const monsters=[
 {name:"Caranguejo das Marés",hp:35,dmg:5,xp:12,gold:5,color:palette.crab,size:.5,loot:"Pinça de Caranguejo"},
 {name:"Pirata Saqueador",hp:85,dmg:12,xp:40,gold:18,color:palette.pirate,size:.7,loot:"Medalhão Pirata"},
 {name:"Serpente Esmeralda",hp:150,dmg:21,xp:85,gold:28,color:palette.snake,size:.7,loot:"Escama Esmeralda"},
 {name:"Aranha da Selva",hp:190,dmg:25,xp:115,gold:35,color:palette.jungle,size:.7,loot:"Seda da Selva"},
 {name:"Guardião do Farol",hp:340,dmg:39,xp:250,gold:80,color:palette.stone,size:.85,loot:"Fragmento do Farol"},
 {name:"Espectro das Marés",hp:480,dmg:52,xp:410,gold:130,color:palette.specter,size:.85,loot:"Essência das Marés"}
];
const inside=(r,x,y)=>x>r.x1&&x<r.x2&&y>r.y1&&y<r.y2;
function isCity(x,y){return x>=city.x1&&x<=city.x2&&y>=city.y1&&y<=city.y2}
function isDock(x,y){return ports.some(q=>Math.abs(x-q.x)<=2&&y>=q.y-2&&y<=q.y+3)}
function terrain(x,y,t){
 if(x>=100){
  if(x<108||x>158||y<3||y>94)return 1;
  t=0;
  if(isCity(x,y)){t=3;const edge=x===city.x1||x===city.x2||y===city.y1||y===city.y2;if(edge&&x!==city.cx&&y!==city.cy)t=4}
  /* As áreas de caça da ilha agora são desenhadas pelo LawlWorld (portões de 3 SQM, pontos de lure). */
 }
 if(x>=25&&x<=36&&y>=39&&y<=46)t=1;
 if(x>=118&&x<=127&&y>=41&&y<=46)t=1;
 for(const q of ports){if(Math.abs(x-q.x)<=2&&y>=q.y-1&&y<=q.y+3)t=3;if(x===q.x&&y>=q.y-3&&y<=q.y)t=3}
 return t;
}
function quote(player,id,now,combatAt,blocked){
 const from=ports.find(q=>q.id===id),to=from&&ports.find(q=>q.id===from.to);
 if(!from||!to||player.z!==0||Math.max(Math.abs(player.x-from.x),Math.abs(player.y-from.y))>1)return {error:"Aproxime-se do capitão no cais."};
 if(blocked)return {error:"Finalize a troca ou o duelo antes de embarcar."};
 if(now-combatAt<10000)return {error:"Você está em combate. Aguarde 10 segundos para embarcar."};
 if(player.gold<from.fare)return {error:"Ouro insuficiente para a passagem."};
 return {from,to,fare:from.fare};
}
function gh(x,y,k){let h=(x*374761393+y*668265263+(k||0)*1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
function drawGround(ctx,x,y,tile,wx,wy){const z=zones.find(q=>inside(q,wx,wy));if(!z)return;const u=tile/16,R=(c,a,b,w,h)=>{ctx.fillStyle=c;ctx.fillRect(x+a*u,y+b*u,w*u,h*u)},bi=z.biome;
 const B={beach:["#f0d98e","#ecd386","#f4de9c"],jungle:["#2f8a40","#2b823b","#359247"],ruins:["#a8abb2","#9fa2a9","#b1b4ba"]}[bi]||["#7c7"];ctx.fillStyle=B[Math.floor(gh(wx,wy)*B.length)];ctx.fillRect(x,y,tile+1,tile+1);
 if((wx+wy)&1){ctx.fillStyle="rgba(255,255,255,.04)";ctx.fillRect(x,y,tile+1,tile+1)}
 if(bi==="beach"){for(let i=0;i<4;i++){const a=1+gh(wx,wy,i)*13,b=1+gh(wx,wy,i+7)*13;R(i&1?"#fff3c8":"#cfb064",a,b,1,1)}if(gh(wx,wy,40)<.05){R("#ff9ab0",6,9,3,2);R("#fff",6,9,1,1);R("#c96a80",6,11,3,.6)}}
 else if(bi==="jungle"){for(let i=0;i<3;i++){if(gh(wx,wy,i+30)<.35)continue;const a=1+gh(wx,wy,i)*11,b=2+gh(wx,wy,i+11)*10;R("#22683a",a,b+1,1,2);R("#22683a",a+2,b+1,1,2);R("#22683a",a+1,b+2,1,1);R("#7ad36a",a,b,1,1);R("#7ad36a",a+2,b,1,1)}if(gh(wx,wy,41)<.04){R("#2f7a3a",7,11,1,3);R("#ff5a5a",6,9,3,2);R("#ffd23a",7,9.5,1,1)}}
 else{const o=(wy&1)?4:0;R("#7f828a",0,15,16,1);for(const c of [o,o+8])if(c<16)R("#7f828a",c,0,1,15);R("#c9ccd2",0,0,16,.6);if(gh(wx,wy,42)<.2)R("#6f9a4a",2+gh(wx,wy,43)*10,12,3,1);if(gh(wx,wy,44)<.1){R("#6b6e75",9,4,1,3);R("#6b6e75",10,6,2,1)}}
}
function drawBoat(ctx,x,y,tile){const r=(a,b,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x+a*tile,y+b*tile,w*tile,h*tile)};r(-1,0,3,1,palette.wood);r(-.7,1,2.4,.2,palette.woodEdge);r(0,-2,.12,3,palette.mast);r(.12,-1.8,1.1,1.3,palette.sail);r(-.8,-1.5,.75,1,palette.sail);r(-.8,.2,2.6,.08,palette.woodEdge)}
function drawMonster(kind,L,T){
 if(kind==="Caranguejo das Marés"){L(4,9,8,4,palette.crab);for(const x of [1,12]){L(x,6,3,3,palette.crab);L(x,12,3,1,palette.crab)}L(6,7,1,3,palette.eye);L(9,7,1,3,palette.eye)}
 else if(kind==="Serpente Esmeralda"){for(let i=0;i<4;i++)L(2+i*3,8+Math.sin(T*3+i)*2,4,3,palette.snake);L(11,5,4,4,palette.snake);L(13,6,1,1,palette.eye);L(2,12,10,1,palette.snakeBelly)}
 else if(kind==="Aranha da Selva"){for(let i=0;i<3;i++){L(1,5+i*3,14,1,palette.jungle)}L(4,6,8,7,palette.jungle);L(6,6,1,1,palette.bandana);L(9,6,1,1,palette.bandana)}
 else if(kind==="Espectro das Marés"){L(4,2,8,11,palette.specter);L(2,8,12,3,palette.specter);L(5,12,2,3,palette.specter);L(10,12,2,2,palette.specter);L(6,5,1,2,palette.eye);L(9,5,1,2,palette.eye)}
 else if(kind==="Guardião do Farol"){L(4,7,8,6,palette.stone);L(5,1,6,6,palette.bone);L(6,3,1,2,palette.eye);L(9,3,1,2,palette.eye);L(2,7,2,6,palette.stone);L(12,7,2,6,palette.stone);L(5,13,2,3,palette.crack);L(9,13,2,3,palette.crack)}
 else if(kind==="Pirata Saqueador"){L(4,7,8,6,palette.pirate);L(5,2,6,5,palette.sand);L(4,1,8,2,palette.bandana);L(6,4,2,1,palette.eye);L(5,13,2,3,palette.eye);L(9,13,2,3,palette.eye);L(13,4,1,9,palette.bone)}
 else return false;
 return true;
}
root.LawlSeafaring={city,ports,zones,monsters,palette,isCity,isDock,terrain,quote,drawGround,drawBoat,drawMonster};
})(typeof window!=="undefined"?window:globalThis);
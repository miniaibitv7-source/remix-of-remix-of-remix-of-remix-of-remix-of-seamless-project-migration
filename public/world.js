/* Mundo expandido de Lawl: áreas de caça por faixa de nível, novas cidades completas (templo, depot, lojas,
   porto e casas), pontes e estradas. Monstros antigos (em português) continuam no catálogo, mas não nascem no mapa.
   Tudo é determinístico: o mesmo mapa para todos os jogadores. */
(function(root){
"use strict";
const W=300,H=230;
function gh(x,y,k){let h=(x*374761393+y*668265263+(k||0)*1442695041)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
/* Lawl (continente inicial) é Free; todo o resto (Porto Aurora, Kharum, Glacira e Umbra) é Premium. */
const FREE={x2:99,y2:163};
const premiumAt=(x,y)=>!(x<=FREE.x2&&y<=FREE.y2);
function biomeAt(x,y){if(y>=171&&x<=158)return"desert";if(x>=167&&y<=106)return"ice";if(x>=167&&y>=114)return"dark";return null}

/* ---- Cidades novas (41×37): templo no centro, depot, lojas, porto e 8 casas ---- */
const CITY_DEFS=[
 {id:"kharum",name:"Kharum",x1:31,y1:174,biome:"desert",npc:{potions:"⚗️ Zahra",smith:"🔨 Hakim",trader:"💰 Farid",depot:"📦 Nasir",priest:"✚ Sacerdotisa Amira"},captain:"Capitão Rashid",color:"#c08a3e"},
 {id:"glacira",name:"Glacira",x1:172,y1:14,biome:"ice",npc:{potions:"⚗️ Ingrid",smith:"🔨 Bjorn",trader:"💰 Sven",depot:"📦 Freya",priest:"✚ Sacerdote Eirik"},captain:"Capitã Astrid",color:"#5a8fb8"},
 {id:"umbra",name:"Umbra",x1:172,y1:120,biome:"dark",npc:{potions:"⚗️ Morgana",smith:"🔨 Corvo",trader:"💰 Vesper",depot:"📦 Silas",priest:"✚ Irmã Noctis"},captain:"Capitão Caronte",color:"#6a4a8a"}
];
const cities=CITY_DEFS.map(c=>{const x1=c.x1,y1=c.y1,x2=x1+40,y2=y1+36,cx=x1+20,cy=y1+18;
 return {...c,x2,y2,cx,cy,temple:{x:cx,y:cy},depot:{x1:x1+30,y1:y1+11,x2:x1+36,y2:y1+16,door:[x1+33,y1+16]},
  pool:{x1:x1+3,y1:y1+21,x2:x1+13,y2:y1+25},port:{x:x1+8,y:y1+20},
  npcs:[["potions",x1+4,y1+12],["smith",x1+8,y1+12],["trader",x1+12,y1+12],["depot",x1+33,y1+13],["priest",cx,cy-2]],
  houses:[[x1+2,y1+2,"s"],[x1+11,y1+2,"s"],[x1+23,y1+2,"s"],[x1+32,y1+2,"s"],[x1+2,y1+27,"n"],[x1+11,y1+27,"n"],[x1+23,y1+27,"n"],[x1+32,y1+27,"n"]]}});
const AURORA={id:"aurora",name:"Porto Aurora",x1:115,y1:25,x2:131,y2:37,cx:122,cy:31};
const cityAt=(x,y)=>cities.find(c=>x>=c.x1&&x<=c.x2&&y>=c.y1&&y<=c.y2)||null;
const isCity=(x,y)=>!!cityAt(x,y);
/* Linhas de casa no formato do LawlHousing: [x,y,w,h,porta,offset,cidade,número] — vêm depois das 22 de Lawl. */
const houses=cities.flatMap(c=>c.houses.map(([x,y,d],i)=>[x,y,8,8,d,undefined,c.name,i+1]));
const ports=cities.map(c=>({id:c.id,name:c.name,captain:c.captain,x:c.port.x,y:c.port.y,landing:{x:c.port.x,y:c.port.y+1}}));
const npcs=cities.flatMap(c=>[...c.npcs.map(([k,x,y])=>({name:c.npc[k],id:c.id+":"+k,x,y,color:c.color})),{name:"⚓ "+c.captain,id:"boat:"+c.id,x:c.port.x,y:c.port.y,color:c.color}]);
/* Passagens de barco (somente Premium). */
const ROUTES={lawl:{aurora:20,kharum:60,glacira:80,umbra:100},aurora:{lawl:20,glacira:40,umbra:60},kharum:{lawl:60,umbra:50},glacira:{lawl:80,aurora:40,umbra:50},umbra:{lawl:100,kharum:50,glacira:50,aurora:60}};
function routes(id,all){const r=ROUTES[id]||{};return Object.keys(r).map(k=>({to:all.find(q=>q.id===k),fare:r[k]})).filter(x=>x.to)}
function quote(player,all,fromId,toId,now,combatAt,blocked){
 const from=all.find(q=>q.id===fromId),fare=(ROUTES[fromId]||{})[toId],to=all.find(q=>q.id===toId);
 if(!from||!player||player.z!==0||Math.max(Math.abs(player.x-from.x),Math.abs(player.y-from.y))>1)return {error:"Aproxime-se do capitão no cais."};
 if(!to||!fare)return {error:"Este barco não faz essa rota."};
 if(blocked)return {error:"Finalize a troca ou o duelo antes de embarcar."};
 if(now-combatAt<10000)return {error:"Você está em combate. Aguarde 10 segundos para embarcar."};
 if(player.gold<fare)return {error:"Ouro insuficiente para a passagem."};
 return {from,to,fare};
}

/* ---- Áreas de caça: do mais fraco ao mais forte. top = superfície, sub = subsolo.
   n = monstros por andar; spots = quantos pontos de lure (8 monstros cada) por andar. ---- */
const LX=[[2,22],[27,47],[52,72],[77,97]],LY=[[82,102],[108,128],[134,154]];
const EX=[[218,240],[246,268],[274,296]],GY=[[4,26],[40,62]],UY=[[118,140],[146,168],[174,196],[202,224]];
const KX={w:[3,25],e0:[77,99],e1:[104,126],e2:[131,153]},KY=[[175,197],[205,227]];
const Z=(city,name,rec,[x1,x2],[y1,y2],top,sub,wall,extra)=>({city,name,rec,x1,y1,x2,y2,top,sub,wall:wall||2,n:[12,20],spots:[1,2],...(extra||{})});
const zones=[
 // Lawl · Free · ao sul da cidade, a pé
 Z("Lawl","Prado dos Ratos","1–6",LX[0],LY[0],["Rat","Snake","Maggot"],["Carcass","Rat","Larva"]),
 Z("Lawl","Gruta dos Morcegos","4–12",LX[1],LY[0],["Spider","Larva","Specter"],["Bat","Spider","Specter"]),
 Z("Lawl","Bosque Élfico","5–18",LX[2],LY[0],["Wounded Elf","Elf Patrol","Elf","Elf Vigilante"],["Elf Mage","Elf Knight","Enchanter"]),
 Z("Lawl","Mina dos Anões","5–18",LX[3],LY[0],["Dwarf Apprentice","Dwarf Warrior","Dwarf Lumberjack"],["Dwarf Combatant","Dwarf Mage","Dwarf Ancient"],11),
 Z("Lawl","Posto da Fronteira","10–25",LX[0],LY[1],["Young Soldier","Archer","Minotaur Warrior"],["Orc Paladin","Orc Soldier"]),
 Z("Lawl","Cripta Esquecida","10–30",LX[1],LY[1],["Rotten Mummy","Skeleton","Skeleton Warrior"],["Cold Skeleton","Demon Skeleton","Rotten Skeleton"],4),
 Z("Lawl","Colinas dos Ciclopes","8–35",LX[2],LY[1],["Weak Cyclops","Cyclops","Primal Cyclops"],["Cyclops Hunter","Mad Cyclops","Cyclops Mage"],11),
 Z("Lawl","Mosteiro em Ruínas","12–35",LX[3],LY[1],["Monk","Monk Renegade","Dark Monk"],["Monk Rebel","Former Monk","Flame"],4),
 Z("Lawl","Ninho dos Dragões Jovens","15–35",LX[0],LY[2],["Young Dragon","Small Dragon"],["Small Dragon"],11),
 Z("Lawl","Toca das Aranhas Negras","20–40",LX[1],LY[2],["Spider","Black Spider"],["Black Spider"]),
 Z("Lawl","Fortaleza Orc","30–50",LX[2],LY[2],["Orc Rampage","Orc Soldier"],["Orc Mage","Orc Assaulter"],4),
 Z("Lawl","Labirinto dos Minotauros","25–50",LX[3],LY[2],["Minotaur","Minotaur Patrol"],["Minotaur Warlock","Minotaur Sentinel","Minotaur Vanguard"],11),
 // Porto Aurora · Premium (barco ou ponte)
 Z("Porto Aurora","Praia das Marés","40–60",[110,130],[48,65],["Peasant","Hunter"],["Hunter","Savage"],11),
 Z("Porto Aurora","Selva Esmeralda","40–70",[136,156],[6,26],["Tiger","Savage"],["Giant Spider","Tiger"]),
 Z("Porto Aurora","Ruínas do Farol","45–75",[136,156],[44,67],["Vampire Apprentice","Ghost"],["Ghost","Hollow"],4),
 Z("Porto Aurora","Penhasco dos Dragões","45–80",[110,132],[70,92],["Dragon"],["Dragon","Thunder Dragon"],11),
 // Glacira · Premium
 Z("Glacira","Planície Gelada","45–70",EX[0],GY[0],["Frozen Minotaur","Cold Banshee"],["Glacial Spider","Cold Banshee"]),
 Z("Glacira","Pico dos Dragões Reais","70–110",EX[0],GY[1],["Royal Dragon","Mystic Hydra"],["Dark Hydra","Royal Dragon"],11),
 Z("Glacira","Ninho Congelado","80–130",EX[1],GY[0],["Frozen Dragon"],["Frozen Dragon","Frost Hydra"],11),
 Z("Glacira","Tundra das Presas","90–130",EX[1],GY[1],["Rhino","Sabertooth"],["Sabertooth"]),
 Z("Glacira","Gruta das Bruxas do Gelo","120–170",EX[2],GY[0],["Ice Witch"],["Ice Witch","Frost Demon"],11),
 Z("Glacira","Trono do Gelo","160–220",EX[2],GY[1],["Frost Demon"],["Turamak","Frost Demon"],4),
 // Umbra · Premium
 Z("Umbra","Floresta Uivante","50–90",EX[0],UY[0],["Bloodlust Werewolf","Bitterpaw Werewolf"],["Eventooth Werewolf","Lonefang Werewolf"]),
 Z("Umbra","Bosque Noturno","70–110",EX[0],UY[1],["Elf Guard","Night Elf"],["Night Elf","Elf Lord"]),
 Z("Umbra","Cemitério de Umbra","70–120",EX[1],UY[0],["Banshee","Grim Reaper"],["Vampire","Banshee"],4),
 Z("Umbra","Pântano das Bruxas","90–140",EX[1],UY[1],["Witch","Medusa"],["Earth Witch","Medusa"]),
 Z("Umbra","Plantação Podre","90–130",EX[0],UY[2],["Possessed Pumpkin","Ripped Eye"],["Munch","Muncher"]),
 Z("Umbra","Torre Sombria","100–150",EX[2],UY[0],["Sorcerer","Ominous"],["Ominous","Slaughterer"],4),
 Z("Umbra","Teia Sombria","130–180",EX[2],UY[1],["Vicious Spider","Panther"],["Orbweaver","Omothymus"]),
 Z("Umbra","Fornalha Infernal","130–200",EX[1],UY[2],["Demon","Behemoth"],["Incinerator","Demon"],11),
 Z("Umbra","Tribunal das Sombras","180–250",EX[2],UY[2],["The Judge","The Jury"],["The Executioner","Undertaker","Bloodthirsty"],4),
 Z("Umbra","Academia Arcana","190–260",EX[0],UY[3],["Earth Education","Energy Expertise"],["Fire Facts","Death Data","Ice Insights"],4),
 Z("Umbra","Estepe dos Centauros","200–300",EX[1],UY[3],["Centaur","Centaur Striker"],["Centaur Deceiver","Centaur Berserker","Centaur Plunderer"],11),
 // Kharum · Premium
 Z("Kharum","Dunas Errantes","50–90",KX.e0,KY[0],["Nomad","Nomad Forager"],["Nomad Gatherer","Nomad Leader"],11),
 Z("Kharum","Ruínas dos Exploradores","70–110",KX.w,KY[0],["Mummy","Explorer"],["Explorer","Guardian"],4),
 Z("Kharum","Vale dos Destruidores","70–110",KX.e1,KY[0],["Smasher","Destroyer"],["Destroyer"],11),
 Z("Kharum","Prisão de Kharum","100–150",KX.e0,KY[1],["Prison Warder"],["Prison Warder"],4),
 Z("Kharum","Pirâmide dos Faraós","100–160",KX.w,KY[1],["Rubia","Akheraten","Nepherides"],["Ahamon","Ahmoje"],4),
 Z("Kharum","Ninho Seco","110–160",KX.e2,KY[0],["Dry Dragon","Dark Dragon"],["Dry Dragon","Dark Dragon"],11),
 Z("Kharum","Templo das Areias","140–200",KX.e1,KY[1],["Sand Djinn","Sand Wizard"],["Sand Witch","Tomb Guardian"],4),
 Z("Kharum","Câmara dos Reis Antigos","250+",KX.e2,KY[1],["Aharon","Ahmose","Akhenaten"],["Nepherites","Nubia","Taharqa"],4,{n:[3,3],spots:[0,0]})
];
zones.forEach(z=>{z.cx=(z.x1+z.x2)>>1;z.cy=(z.y1+z.y2)>>1;z.premium=premiumAt(z.cx,z.cy)});
/* Pontes: a primeira faixa Premium tem um portão (tile 12) que só deixa passar contas Premium. */
const bridges=[
 {name:"Ponte de Lawl a Porto Aurora",x1:99,y1:30,x2:108,y2:32,ends:[[99,31],[108,31]],gate:{x1:100,y1:30,x2:100,y2:32}},
 {name:"Ponte de Porto Aurora a Glacira",x1:158,y1:31,x2:167,y2:33,ends:[[158,32],[167,32]]},
 {name:"Ponte de Glacira a Umbra",x1:242,y1:106,x2:244,y2:114,ends:[[243,106],[243,114]]},
 {name:"Ponte de Kharum a Umbra",x1:158,y1:199,x2:167,y2:201,ends:[[158,200],[167,200]]},
 {name:"Ponte de Lawl a Kharum",x1:50,y1:163,x2:52,y2:171,ends:[[51,163],[51,171]],gate:{x1:50,y1:164,x2:52,y2:164}}
];

/* ---- Terreno base (aplicado depois de Lawl e do mar de Porto Aurora) ---- */
function base(bi,x,y){const h=gh(x,y,1);
 if(bi==="desert")return h<.035?11:h<.05?2:0;
 if(bi==="ice")return h<.05?2:h<.08?11:0;
 if(bi==="dark")return h<.13?2:h<.145?11:0;
 return h<.09?2:h<.102?1:0}
function terrain(x,y,t){
 if(x<=0||y<=0||x>=W-1||y>=H-1)return 1;
 if(x>=159&&x<=166)return 1;
 if(x>=167)return y>=107&&y<=113?1:base(biomeAt(x,y),x,y);
 if(y>=164&&y<=170)return 1;
 if(y>=171)return base("desert",x,y);
 if(x<100&&y>=108)return base(null,x,y);
 return t;
}
function inRect(r,x,y){return x>=r.x1&&x<=r.x2&&y>=r.y1&&y<=r.y2}
function buildCities(M){
 for(const c of cities){
  for(let y=c.y1;y<=c.y2;y++)for(let x=c.x1;x<=c.x2;x++){const edge=x===c.x1||x===c.x2||y===c.y1||y===c.y2,gate=((y===c.y1||y===c.y2)&&Math.abs(x-c.cx)<=1)||((x===c.x1||x===c.x2)&&Math.abs(y-c.cy)<=1);M[y][x]=edge&&!gate?4:3}
  for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const b=Math.abs(dx)===4||Math.abs(dy)===4,open=(Math.abs(dy)===4&&Math.abs(dx)<=1)||(Math.abs(dx)===4&&Math.abs(dy)<=1);M[c.cy+dy][c.cx+dx]=b&&!open?4:3}
  const d=c.depot;for(let y=d.y1;y<=d.y2;y++)for(let x=d.x1;x<=d.x2;x++)M[y][x]=(x===d.x1||x===d.x2||y===d.y1||y===d.y2)?4:3;M[d.door[1]][d.door[0]]=3;
  const P=c.pool,q=c.port;for(let y=P.y1;y<=P.y2;y++)for(let x=P.x1;x<=P.x2;x++)M[y][x]=1;
  for(let y=q.y-3;y<=q.y+3;y++)for(let x=q.x-2;x<=q.x+2;x++)if((y>=q.y-1)||x===q.x)M[y][x]=3;
  for(const [x,y] of [[c.x1+27,c.y1+21],[c.x1+37,c.y1+21],[c.x1+27,c.y1+24],[c.x1+37,c.y1+24]])M[y][x]=2;
 }
}
function buildBridges(M){for(const b of bridges)for(let y=b.y1;y<=b.y2;y++)for(let x=b.x1;x<=b.x2;x++)M[y][x]=b.gate&&inRect(b.gate,x,y)?12:3}
/* Estradas de 3 SQM: cada ponte e cada área de caça é ligada por terra à rede de ruas mais próxima. */
function roads(M,zs){
 const Wd=M[0].length,Hd=M.length,N=Wd*Hd,id=(x,y)=>y*Wd+x,block=new Uint8Array(N),net=new Uint8Array(N);
 for(const r of [...zs,...cities,AURORA])for(let y=r.y1;y<=r.y2;y++)for(let x=r.x1;x<=r.x2;x++)if(M[y]&&M[y][x]!==undefined)block[id(x,y)]=1;
 const flood=(sx,sy)=>{const st=[[sx,sy]];while(st.length){const [x,y]=st.pop();if(x<0||y<0||x>=Wd||y>=Hd)continue;const i=id(x,y);if(net[i]||M[y][x]!==3)continue;net[i]=1;st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1])}};
 flood(30,30);flood(AURORA.cx,AURORA.cy);for(const c of cities)flood(c.cx,c.cy);
 const free=t=>t===0||t===2||t===11||t===3;
 const pave=path=>{for(const [x,y] of path){net[id(x,y)]=1;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<1||ny<1||nx>=Wd-1||ny>=Hd-1)continue;const t=M[ny][nx],i=id(nx,ny);if(!block[i]&&(t===0||t===2||t===11)){M[ny][nx]=3;net[i]=1}}}};
 const bfs=(starts,forbid)=>{const prev=new Int32Array(N).fill(-2),q=[];
  for(const [x,y] of starts){if(x<1||y<1||x>=Wd-1||y>=Hd-1)continue;const i=id(x,y);if(prev[i]!==-2)continue;if(!free(M[y][x])||block[i])continue;prev[i]=-1;q.push(i)}
  for(let h=0;h<q.length;h++){const i=q[h],x=i%Wd,y=(i/Wd)|0;
   if(net[i]&&prev[i]!==-1||net[i]&&starts.length&&h>=starts.length){const path=[];for(let k=i;k>=0;k=prev[k])path.push([k%Wd,(k/Wd)|0]);return path}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<1||ny<1||nx>=Wd-1||ny>=Hd-1)continue;const j=id(nx,ny);if(prev[j]!==-2||block[j]||(forbid&&forbid(nx,ny)))continue;
    if(net[j]){prev[j]=i;const path=[];for(let k=j;k>=0;k=prev[k])path.push([k%Wd,(k/Wd)|0]);return path}
    if(!free(M[ny][nx]))continue;prev[j]=i;q.push(j)}}
  return null};
 for(const b of bridges){const own=(x,y)=>inRect(b,x,y);
  for(const [ex,ey] of b.ends){const st=[];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=ex+dx,y=ey+dy;if(!own(x,y))st.push([x,y])}const path=bfs(st,own);if(path)pave(path)}
  for(let y=b.y1;y<=b.y2;y++)for(let x=b.x1;x<=b.x2;x++)net[id(x,y)]=1}
 const home=z=>z.city==="Lawl"?[30,30]:z.city==="Porto Aurora"?[AURORA.cx,AURORA.cy]:(c=>[c.cx,c.cy])(cities.find(c=>c.name===z.city));
 const order=[...zs].sort((a,b)=>{const [ax,ay]=home(a),[bx,by]=home(b);return Math.hypot(a.cx-ax,a.cy-ay)-Math.hypot(b.cx-bx,b.cy-by)});
 for(const z of order){const st=[[z.cx,z.y1-1],[z.cx,z.y2+1],[z.x1-1,z.cy],[z.x2+1,z.cy]];const path=bfs(st);if(path)pave(path)}
}

/* ---- Desenho ---- */
const GROUND={desert:["#e2c27a","#dcbb72","#e8c983"],ice:["#e3eef6","#dae8f1","#edf4f9"],dark:["#3f4b3a","#3a4636","#44513f"]};
function drawGround(ctx,sx,sy,tile,x,y){const bi=biomeAt(x,y);if(!bi)return false;const u=tile/16,R=(c,a,b,w,h)=>{ctx.fillStyle=c;ctx.fillRect(sx+a*u,sy+b*u,w*u,h*u)},B=GROUND[bi];
 ctx.fillStyle=B[Math.floor(gh(x,y,3)*B.length)];ctx.fillRect(sx,sy,tile+1,tile+1);
 if((x+y)&1){ctx.fillStyle="rgba(255,255,255,.04)";ctx.fillRect(sx,sy,tile+1,tile+1)}
 if(bi==="desert"){for(let i=0;i<4;i++)R(i&1?"#f3dea6":"#c39e58",1+gh(x,y,i)*13,1+gh(x,y,i+7)*13,1,1);if(gh(x,y,40)<.05){R("#efe6d2",5,9,5,1);R("#efe6d2",4,8,1,3);R("#efe6d2",10,8,1,3)}else if(gh(x,y,41)<.06){R("#a8834a",6,10,3,2);R("#c9a35f",6,10,2,1)}}
 else if(bi==="ice"){for(let i=0;i<3;i++)R("#bfd4e4",1+gh(x,y,i)*12,2+gh(x,y,i+5)*11,2,1);if(gh(x,y,42)<.08)R("#ffffff",3+gh(x,y,43)*9,3+gh(x,y,44)*9,1.4,1.4);if(gh(x,y,45)<.04){R("#a9c9e0",4,9,7,3);R("#d5e8f5",5,9,5,1)}}
 else{for(let i=0;i<3;i++){const a=1+gh(x,y,i)*11,b=2+gh(x,y,i+11)*10;R("#2c3529",a,b+1,1,2);R("#2c3529",a+2,b+1,1,2);R("#5d6b4e",a,b,1,1)}if(gh(x,y,46)<.04){R("#e8e2d0",7,11,1,3);R("#8a4fb0",6,9,3,2);R("#c9a0e6",6.5,9,1,1)}}
 return true}
function drawTile(ctx,sx,sy,tile,x,y,type){const u=tile/16,R=(c,a,b,w,h)=>{ctx.fillStyle=c;ctx.fillRect(sx+a*u,sy+b*u,w*u,h*u)};
 if(type===12){R("#d6c296",0,0,16.1,16.1);R("#a88f60",0,7,16,1);R("#a88f60",0,15,16,1);R("#8a6a2c",1,1,2,14);R("#8a6a2c",13,1,2,14);R("#e9c56a",1,1,14,2);R("#fff0b8",2,1.4,12,.6);R("#e9c56a",6,3,4,2);R("#fff0b8",7,3,1,1);R("#e9c56a",7.3,0,1.4,1.2);return true}
 if(type!==11)return false;
 if(!drawGround(ctx,sx,sy,tile,x,y)){ctx.fillStyle=["#6fc24c","#74c851","#6abc47"][Math.floor(gh(x,y,3)*3)];ctx.fillRect(sx,sy,tile+1,tile+1)}
 const bi=biomeAt(x,y),C=bi==="desert"?["#8f6a3a","#b48a50","#d9b778"]:bi==="ice"?["#6f98b8","#9cc4e0","#e6f4ff"]:bi==="dark"?["#2f2a38","#4a4458","#6e6880"]:["#5c606a","#8a8f99","#c3c8d0"];
 ctx.fillStyle="rgba(0,0,0,.25)";ctx.beginPath();ctx.ellipse(sx+8*u,sy+14*u,7*u,2*u,0,0,7);ctx.fill();
 R(C[0],2,5,12,9);R(C[1],3,4,10,8);R(C[1],1.5,8,2,5);R(C[1],12.5,7,2,6);R(C[2],4,4.5,5,1.4);R(C[2],3.5,6,1.2,3);if(gh(x,y,9)<.5){R(C[0],8,7,1,4);R(C[0],8,10,3,1)}return true}
function drawTree(ctx,sx,sy,u,x,y,T){const bi=biomeAt(x,y);if(!bi)return false;const R=(c,a,b,w,h)=>{ctx.fillStyle=c;ctx.fillRect(sx+a*u,sy+b*u,w*u,h*u)};
 ctx.fillStyle="rgba(0,0,0,.25)";ctx.beginPath();ctx.ellipse(sx+8*u,sy+14.6*u,6*u,2*u,0,0,7);ctx.fill();
 if(bi==="desert"){R("#2f6a2c",6,2,4,13);R("#4f9a42",6.6,2.4,1.2,12);R("#2f6a2c",2,6,4,2.4);R("#2f6a2c",2,3,2.4,5);R("#2f6a2c",10,8,4,2.4);R("#2f6a2c",12,4.5,2.4,6);R("#f3e3a0",7,2.8,.8,.8);R("#ff7a9a",7.2,1.2,1.6,1.2);return true}
 if(bi==="ice"){const sw=Math.sin(T*1.1+x*.7)*u*.3;R("#4a3524",7,11,2,4);for(const [w,b] of [[12,9],[9,5.5],[6,2]]){ctx.fillStyle="#2f5f5a";ctx.beginPath();ctx.moveTo(sx+8*u+sw,sy+(b-3.6)*u);ctx.lineTo(sx+(8-w/2)*u,sy+(b+2.6)*u);ctx.lineTo(sx+(8+w/2)*u,sy+(b+2.6)*u);ctx.fill();R("#f4fbff",8-w/2+.6,b+1.8,w-1.2,.9)}R("#ffffff",7.4,-.6,1.2,1.2);return true}
 const b=(cx,cy,r,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(sx+cx*u,sy+cy*u,r*u,0,7);ctx.fill()};
 R("#1e1510",6.4,7,3.2,8);R("#33251c",7,7,1.2,7);R("#1e1510",4,6,3,1.2);R("#1e1510",9,5,3,1.2);
 for(const [cx,cy,r] of [[8,4.8,4.2],[4.8,6.8,3],[11.2,6.4,3]])b(cx,cy,r+.7,"#17121d");for(const [cx,cy,r] of [[8,4.8,4.2],[4.8,6.8,3],[11.2,6.4,3]])b(cx,cy,r,"#3b3150");b(7,3.6,1.6,"#5a4b78");if(gh(x,y,5)<.25)b(10,7,.7,"#c9ff7a");return true}
const MM={desert:{0:"#c9a75e",2:"#5f8a3a",11:"#8a6a3e"},ice:{0:"#cfe0ea",2:"#3f6a6a",11:"#8fb4cc"},dark:{0:"#3a4636",2:"#1f2a1d",11:"#4a4458"}};
function mm(t,x,y){if(t===12)return"#e9c56a";const bi=biomeAt(x,y);return(bi&&MM[bi][t])||(t===11?"#6b6b70":null)}
function cityOf(x,y){if(premiumAt(x,y)){const c=cityAt(x,y);if(c)return c.name;if(y>=171&&x<=158)return"Kharum";if(x>=167)return y<=106?"Glacira":"Umbra";return"Porto Aurora"}return"Lawl"}
root.LawlWorld={W,H,FREE,premiumAt,biomeAt,cities,AURORA,cityAt,isCity,houses,ports,npcs,ROUTES,routes,quote,zones,bridges,terrain,buildCities,buildBridges,roads,drawGround,drawTile,drawTree,mm,cityOf,gh};
})(typeof window!=="undefined"?window:globalThis);

/* Browser-safe mount rules and renderer, shared by the world, the mount menu and remote actors. */
(function(root){
"use strict";
// boss = index in BOSSES (public/reinos.html); seat = rider position as a fraction of the sprite; w = width in tiles;
// leg = bottom fraction of the sprite animated as legs; wave = leg waves along the body (2 for many-legged mounts).
// s/n = front (south) and back (north) views from /mounts/<id>_s|_n.png: [width in tiles, seat y fraction, feet y fraction, leg band fraction, front overlay start].
const catalog=[
 {id:"ratao",boss:0,name:"Ratão Purulento",item:"Rédea do Rei Rato",ic:"🪢",img:"/mounts/ratao.png",seat:[.51,.09],w:1.25,leg:0.32,wave:1,s:[.85,.16,1,.22,0],n:[.75,.28,.83,.2]},
 {id:"aranha",boss:1,name:"Tecelã Sombria",item:"Casulo de Aracna",ic:"🧶",img:"/mounts/aranha.png",seat:[.45,.05],w:1.3,leg:0.5,wave:2,s:[1.45,.12,1,.45,0],n:[1.45,.18,1,.45]},
 {id:"javali",boss:2,name:"Javali de Guerra",item:"Sela de Grokk",ic:"🐗",img:"/mounts/javali.png",seat:[.42,.12],w:1.3,leg:0.32,wave:1,s:[1,.16,1,.22,0],n:[1,.27,1,.2]},
 {id:"hydra",boss:3,name:"Hydra do Lodo",item:"Ovo de Hydra",ic:"🥚",img:"/mounts/hydra.png",seat:[.51,.33],w:1.35,leg:0.34,wave:1,s:[.9,.32,1,.22,0],n:[.85,.3,.81,.2]},
 {id:"escaravelho",boss:4,name:"Escaravelho Dourado",item:"Amuleto do Escaravelho",ic:"🪲",img:"/mounts/escaravelho.png",seat:[.43,.09],w:1.3,leg:0.42,wave:2,s:[1.4,.12,1,.35,0],n:[1.4,.12,1,.35]},
 {id:"tartaruga",boss:5,name:"Tartaruga Rúnica",item:"Runa do Colosso",ic:"🐢",img:"/mounts/tartaruga.png",seat:[.46,.07],w:1.3,leg:0.3,wave:1,s:[1.1,.1,1,.22,0],n:[1.1,.12,1,.22]},
 {id:"corcel",boss:6,name:"Corcel Sanguinário",item:"Ferradura de Sangue",ic:"🩸",img:"/mounts/corcel.png",seat:[.48,.32],w:1.3,leg:0.42,wave:1,s:[.55,.26,1,.25,.12],n:[.75,.28,1,.25]},
 {id:"pesadelo",boss:7,name:"Pesadelo Infernal",item:"Chama de Azaroth",ic:"🔥",img:"/mounts/pesadelo.png",seat:[.51,.39],w:1.35,leg:0.4,wave:1,s:[.52,.27,1,.25,.12],n:[.72,.3,1,.25]}
];
const SPEED=10,MIN_KILLS=1,MAX_KILLS=100;
const byId=id=>catalog.find(m=>m.id===id)||null;
const byItem=name=>catalog.find(m=>m.item===name)||null;
const forBoss=i=>catalog.find(m=>m.boss===i)||null;
function normalizeId(id){return byId(id)?id:""}
function normalizeOwned(list){return Array.isArray(list)?[...new Set(list.filter(id=>byId(id)))]:[]}
function owns(player,id){return normalizeOwned(player&&player.mounts).includes(id)}
/* Sorteia de 1 a 100 vitórias para o próximo item cair. */
function rollNeed(rand=Math.random){const r=Number(rand());const v=MIN_KILLS+Math.floor((Number.isFinite(r)?Math.min(Math.max(r,0),.999999):0)*(MAX_KILLS-MIN_KILLS+1));return Math.min(MAX_KILLS,Math.max(MIN_KILLS,v))}
function dropState(player,i,rand){player.mountDrop=player.mountDrop&&typeof player.mountDrop==="object"?player.mountDrop:{};
 let s=player.mountDrop[i];const okNeed=s&&Number.isInteger(s.need)&&s.need>=MIN_KILLS&&s.need<=MAX_KILLS;
 if(!okNeed)s={c:0,need:rollNeed(rand)};if(!Number.isInteger(s.c)||s.c<0)s.c=0;player.mountDrop[i]=s;return s}
/* Conta uma vitória contra o boss; devolve o nome do item quando ele cai (e sorteia a próxima meta). */
function recordBossKill(player,i,rand=Math.random){const m=forBoss(i);if(!m)return null;const s=dropState(player,i,rand);s.c++;
 if(s.c<s.need)return null;player.loot=player.loot||{};player.loot[m.item]=(player.loot[m.item]||0)+1;player.mountDrop[i]={c:0,need:rollNeed(rand)};return m.item}
/* Usar o item consome 1 unidade e libera a montaria para sempre. */
function useItem(player,itemName){const m=byItem(itemName);if(!m)return {ok:false,msg:"Este item não libera montaria."};
 if(!player.loot||!(player.loot[itemName]>0))return {ok:false,msg:"Você não tem este item."};
 player.mounts=normalizeOwned(player.mounts);if(player.mounts.includes(m.id))return {ok:false,msg:`Você já possui a montaria ${m.name}.`};
 player.loot[itemName]--;if(player.loot[itemName]<=0)delete player.loot[itemName];player.mounts.push(m.id);player.mountPick=m.id;
 return {ok:true,mount:m,msg:`🐎 Nova montaria liberada: ${m.name}!`}}
function ride(player,id){if(!owns(player,id))return false;player.mountPick=id;player.mount=id;return true}
function dismount(player){player.mount="";return true}
function toggle(player){if(player.mount){dismount(player);return ""}const owned=normalizeOwned(player.mounts);const id=owned.includes(player.mountPick)?player.mountPick:owned[0];if(!id)return null;ride(player,id);return id}
function sanitize(player){player.mounts=normalizeOwned(player.mounts);player.mountPick=player.mounts.includes(player.mountPick)?player.mountPick:(player.mounts[0]||"");player.mount=player.mounts.includes(player.mount)?player.mount:"";return player}
const speedBonus=player=>player&&player.mount&&byId(player.mount)?SPEED:0;
const images={};
function image(m,v){if(typeof Image==="undefined")return null;const key=v?m.id+"_"+v:m.id;let im=images[key];if(!im){im=new Image();im.src=(v?`/mounts/${key}.png`:m.img)+"?v=1";images[key]=im}return im.complete&&im.naturalWidth?im:null}
/* Desenha a montaria com os pés em footY e devolve onde (e com que inclinação) o cavaleiro senta.
   Andando: o corpo galopa (sobe/desce e balança para frente e para trás) e as patas, cortadas em colunas,
   vão e voltam em onda (frente e trás opostas). Parada: respira devagar. Cada coluna é um único drawImage inclinado. */
/* Norte/Sul: visão de costas/frente. As patas (faixa de baixo) são cortadas em colunas e as da esquerda e da direita
   pisam alternadas (sobem encolhendo), o corpo sobe/desce e balança de lado. Sul devolve over() para redesenhar a
   frente da montaria por cima do cavaleiro. */
function drawVertical(ctx,cx,footY,tile,m,im,v,time,k){const cfg=m[v],iw=im.naturalWidth,ih=im.naturalHeight;
 const W=tile*cfg[0],H=W*ih/iw,foot=cfg[2]||1,cut=cfg[3]||.25,wave=m.wave||1,ph=time*11;
 const hop=k*Math.abs(Math.sin(ph))*tile*.05,roll=k*Math.sin(ph)*.045,sway=k*Math.sin(ph)*tile*.02,breathe=(1-k)*Math.sin(time*2.4)*.02;
 const top=-H*foot,sy0=ih*foot*(1-cut),hipY=top+sy0*H/ih,x0=-W/2;
 const body=(fromY)=>{const sy=Math.max(0,fromY*ih);if(sy>=sy0)return;ctx.translate(0,hipY);ctx.rotate(roll);ctx.scale(1-breathe*.5,1+breathe);ctx.translate(0,-hipY);
  ctx.drawImage(im,0,sy,iw,sy0+1-sy,x0,top+sy*H/ih,W,(sy0-sy)*H/ih+H/ih)};
 const legs=()=>{const C=8,cw=iw/C,dcw=W/C,ov=ih*.04,ovD=ov*H/ih,lh=(ih-sy0)*H/ih;
  for(let c=0;c<C;c++){const grp=Math.floor(c*2*wave/C),a=ph+(grp%2)*Math.PI,lift=k*Math.max(0,Math.sin(a))*tile*.07;
   ctx.drawImage(im,c*cw,sy0-ov,cw+.6,ih-sy0+ov,x0+c*dcw-.3,hipY-ovD,dcw+.6,lh+ovD-lift)}};
 const begin=()=>{ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(cx+sway,footY-hop)};
 begin();legs();body(0);ctx.restore();
 const sxl=0,syl=top+cfg[1]*H-hipY,co=Math.cos(roll),si=Math.sin(roll),rx=sxl*co-syl*si,ry=(sxl*si+syl*co)*(1+breathe)+hipY;
 const seat={x:cx+sway+rx,y:footY-hop+ry,rot:roll};
 if(v==="s"&&cfg[4]!=null)seat.over=()=>{begin();legs();body(cfg[4]);ctx.restore()};
 return seat}
function draw(ctx,cx,footY,tile,id,dir,time=0,moving=false){const m=byId(id);if(!m)return null;
 const kv=typeof moving==="number"?Math.max(0,Math.min(1,moving)):(moving?1:0),v=dir==="north"?"n":dir==="south"?"s":"";
 if(v&&m[v]){const iv=image(m,v);if(iv)return drawVertical(ctx,cx,footY,tile,m,iv,v,time,kv)}
 const im=image(m);if(!im)return null;
 const k=kv,iw=im.naturalWidth,ih=im.naturalHeight;
 const W=tile*m.w,H=W*ih/iw,flip=dir==="west",cut=m.leg||.35,wave=m.wave||1,ph=time*11;
 const hop=k*Math.abs(Math.sin(ph))*tile*.07,pitch=k*Math.sin(ph)*.06,breathe=(1-k)*Math.sin(time*2.4)*.02;
 const x0=-m.seat[0]*W,pivX=(.5-m.seat[0])*W,pivY=-H*cut,hipY=-H*cut,lh=H*cut;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(cx,footY-hop);if(flip)ctx.scale(-1,1);
 /* patas */
 const C=12,cw=iw/C,dcw=W/C,sy0=ih*(1-cut),ov=ih*.06,ovD=ov*H/ih;
 for(let c=0;c<C;c++){const t=(c+.5)/C,a=ph+t*Math.PI*2*wave,sw=Math.sin(a),lift=k*Math.max(0,Math.cos(a))*tile*.05,sk=k*sw*.42;
  ctx.save();ctx.transform(1,0,sk,1,x0+c*dcw,hipY-ovD);ctx.drawImage(im,c*cw,sy0-ov,cw+.6,ih*cut+ov,-.3,0,dcw+.6,lh+ovD-lift);ctx.restore()}
 /* corpo (balança em volta do quadril) */
 ctx.translate(pivX,pivY);ctx.rotate(pitch);ctx.scale(1-breathe*.5,1+breathe);ctx.translate(-pivX,-pivY);
 ctx.drawImage(im,0,0,iw,sy0+1,x0,-H,W,H*(1-cut)+W/iw);
 ctx.restore();
 /* assento acompanha o pulo e a inclinação do corpo */
 const sxl=-pivX,syl=-H+m.seat[1]*H-pivY,co=Math.cos(pitch),si=Math.sin(pitch),rx=sxl*co-syl*si+pivX,ry=(sxl*si+syl*co)*(1+breathe)+pivY;
 return {x:cx+(flip?-rx:rx),y:footY-hop+ry,rot:flip?-pitch:pitch}}
root.LawlMounts={catalog,SPEED,MIN_KILLS,MAX_KILLS,byId,byItem,forBoss,normalizeId,normalizeOwned,owns,rollNeed,recordBossKill,useItem,ride,dismount,toggle,sanitize,speedBonus,draw};
})(typeof window!=="undefined"?window:globalThis);

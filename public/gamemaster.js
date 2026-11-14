(function(root){
 "use strict";
 const actions=new Set(["invisible","teleport","item","spawn","announce","mute","suspend","release","grant","gems","summon"]);
 const MAP={w:300,h:230,floors:2};
 function eligible(status,player){return status?.isGm===true&&player?.name==="GameMaster"}
 const target=v=>typeof v==="string"&&v.trim().length>0&&v.trim().length<=36;
 function validate(action,data){
  if(!actions.has(action)||!data||typeof data!=="object")throw new Error("Ação inválida.");
  const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  if(action==="invisible"&&typeof data.on!=="boolean")throw new Error("Estado inválido.");
  if(action==="teleport"||action==="spawn"||action==="summon")if(!integer(data.x,0,MAP.w-1)||!integer(data.y,0,MAP.h-1)||!integer(data.z,0,MAP.floors-1))throw new Error(`Posição inválida (X 0 a ${MAP.w-1}, Y 0 a ${MAP.h-1}, andar 0 ou 1).`);
  if(action==="item"){const kind=data.kind??"equip",limits={equip:20,loot:1000,potion:1000,rune:1000,gold:10000000};
   if(!(kind in limits)||!integer(data.quantity,1,limits[kind]))throw new Error(`Quantidade inválida (1 a ${(limits[kind]||20).toLocaleString("pt-BR")}).`);
   if(kind==="equip"&&!integer(data.index,0,999)||kind==="loot"&&(typeof data.name!=="string"||!data.name.trim()||data.name.length>40)||kind==="potion"&&!(typeof data.potion==="string"&&/^[a-z0-9]{1,16}$/.test(data.potion))||kind==="rune"&&!(typeof data.rune==="string"&&/^[a-z0-9]{1,16}$/.test(data.rune)))throw new Error("Item inválido.")}
  if(action==="spawn"&&(!integer(data.index,0,(root.LawlMonsters?.COUNT||169)-1)||!integer(data.quantity,1,10)))throw new Error("Monstro inválido.");
  if(action==="announce"&&(typeof data.text!=="string"||!data.text.trim()||data.text.length>200))throw new Error("Aviso inválido.");
  if(["mute","suspend","release","summon"].includes(action)&&(!target(data.target)||(action==="mute"||action==="suspend")&&!integer(data.minutes,1,10080)))throw new Error("Jogador ou duração inválidos.");
  if(action==="grant"&&(!target(data.target)||!integer(data.levels,0,500)||!integer(data.amount,0,200)||!["sword","distance","magic","shielding"].includes(data.skill)||data.levels+data.amount===0))throw new Error("Concessão inválida.");
  if(action==="gems"&&(typeof data.target!=="string"||!data.target.trim()||!integer(data.amount,1,1000000)))throw new Error("Informe o jogador e uma quantidade inteira de 1 a 1.000.000 gemas.");
 return data;
 }
 function applyGems(player,event,userId){
  if(event?.action!=="gems"||event.payload?.target!==userId||!Number.isSafeInteger(event.id)||event.id<=(player.gmGemCursor||0))return false;
  const amount=event.payload.amount;if(!Number.isInteger(amount)||amount<1||amount>1000000)return false;
  player.gems=(player.gems||0)+amount;player.gmGemCursor=event.id;return true;
 }
 /* Level/skill grants carry a per-character cursor so each grant is applied exactly once, even if it arrives later. */
 function applyGrant(player,event){
  if(event?.action!=="grant"||!Number.isSafeInteger(event.id)||event.id<=(player.gmGrantCursor||0))return null;
  const d=event.payload||{},lv=Number.isInteger(d.levels)?Math.max(0,Math.min(500,d.levels)):0,amt=Number.isInteger(d.amount)?Math.max(0,Math.min(200,d.amount)):0;
  player.gmGrantCursor=event.id;
  if(lv>0)player.level=(player.level||1)+lv;
  if(amt>0&&player.skills&&d.skill in player.skills){player.skills[d.skill]+=amt;if(player.tries)player.tries[d.skill]=0}
  return {levels:lv,amount:amt,skill:d.skill};
 }

 /* ===== Comandos digitados (/comando) ===== */
 const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 const SKILLS={espada:"sword",sword:"sword",distancia:"distance",distance:"distance",dist:"distance",magia:"magic",magic:"magic",ml:"magic",defesa:"shielding",shielding:"shielding",escudo:"shielding"};
 const COMMANDS=[
  {c:"ajuda",a:["help","comandos","h","?"],u:"/ajuda",d:"Lista os comandos",player:true},
  {c:"onde",a:["where","pos","posicao"],u:"/onde [Nome]",d:"Mostra a sua posição ou a de um jogador online",player:true},
  {c:"painel",a:["gm","menu"],u:"/painel",d:"Abre o painel do GameMaster"},
  {c:"tp",a:["teleporte","teleportar","goto-pos"],u:"/tp X Y [andar]",d:"Teleporta você (andar 0 superfície, 1 subsolo)"},
  {c:"ir",a:["goto","irate"],u:"/ir Nome",d:"Vai até um jogador online"},
  {c:"puxar",a:["summon","trazer"],u:"/puxar Nome",d:"Traz um jogador até você"},
  {c:"invisivel",a:["invis","ghost"],u:"/invisivel",d:"Liga ou desliga a invisibilidade"},
  {c:"curar",a:["heal"],u:"/curar",d:"Recupera toda a sua vida e mana"},
  {c:"item",a:["i","criar"],u:"/item Nome do item [quantidade]",d:"Cria equipamento, drop, troféu, item de montaria ou poção"},
  {c:"ouro",a:["gold","dinheiro"],u:"/ouro quantidade",d:"Cria ouro na sua mochila"},
  {c:"monstro",a:["m","invocar","spawn"],u:"/monstro Nome [quantidade]",d:"Invoca monstros ao seu lado"},
  {c:"aviso",a:["b","anuncio","broadcast"],u:"/aviso mensagem",d:"Envia um aviso para todos os jogadores"},
  {c:"mutar",a:["mute","silenciar"],u:"/mutar Nome minutos [motivo]",d:"Silencia um jogador no chat"},
  {c:"suspender",a:["ban","suspend"],u:"/suspender Nome minutos [motivo]",d:"Suspende a conta do jogador"},
  {c:"liberar",a:["unmute","unban","release"],u:"/liberar Nome",d:"Remove silêncio e suspensão"},
  {c:"nivel",a:["level","lvl","nv"],u:"/nivel Nome quantidade",d:"Adiciona níveis a um jogador"},
  {c:"skill",a:["habilidade","sk"],u:"/skill Nome espada|distancia|magia|defesa quantidade",d:"Adiciona pontos de skill"},
  {c:"gemas",a:["gems","gema"],u:"/gemas Nome quantidade",d:"Concede gemas"}
 ];
 const isInt=s=>/^\d+$/.test(String(s).trim());
 function parseCommand(text){
  const t=String(text??"").trim();if(!t.startsWith("/"))return null;
  const m=t.slice(1).match(/^(\S+)\s*([\s\S]*)$/);if(!m)return {error:"Digite um comando. Use /ajuda para ver a lista."};
  const key=norm(m[1]),def=COMMANDS.find(c=>c.c===key||c.a.includes(key));
  if(!def)return {error:`Comando desconhecido: /${m[1]}. Use /ajuda para ver a lista.`};
  const rest=m[2].trim(),comma=rest.includes(","),toks=comma?rest.split(",").map(s=>s.trim()).filter(Boolean):rest.split(/\s+/).filter(Boolean);
  const usage={error:`Uso: ${def.u}`},num=s=>parseInt(s,10);
  /* Nome seguido de números: com vírgula o nome é a 1ª parte; sem vírgula, tudo antes do primeiro número. */
  const nameThen=(stop=isInt)=>{if(comma)return {name:toks[0]||"",after:toks.slice(1)};const i=toks.findIndex(stop);return i<0?{name:toks.join(" "),after:[]}:{name:toks.slice(0,i).join(" "),after:toks.slice(i)}};
  const out={cmd:def.c,def};
  switch(def.c){
   case "ajuda":case "invisivel":case "curar":case "painel":return out;
   case "onde":return {...out,name:rest};
   case "tp":{if(toks.length<2||toks.length>3||!toks.every(isInt))return usage;return {...out,x:num(toks[0]),y:num(toks[1]),z:toks[2]==null?null:num(toks[2])}}
   case "ir":case "puxar":case "liberar":return rest?{...out,name:rest}:usage;
   case "aviso":return rest?{...out,text:rest.slice(0,200)}:usage;
   case "ouro":return toks.length===1&&isInt(toks[0])?{...out,quantity:num(toks[0])}:usage;
   case "item":case "monstro":{if(!toks.length)return usage;const hasQ=toks.length>1&&isInt(toks[toks.length-1]);const name=(hasQ?toks.slice(0,-1):toks).join(" ");return name?{...out,name,quantity:hasQ?num(toks[toks.length-1]):1}:usage}
   case "mutar":case "suspender":{const {name,after}=nameThen();if(!name||!after.length||!isInt(after[0]))return usage;return {...out,name,minutes:num(after[0]),reason:after.slice(1).join(" ").slice(0,200)}}
   case "nivel":case "gemas":{const {name,after}=nameThen();if(!name||after.length!==1||!isInt(after[0]))return usage;return {...out,name,amount:num(after[0])}}
   case "skill":{const {name,after}=nameThen(s=>norm(s) in SKILLS);const sk=SKILLS[norm(after[0])];if(!name||!sk||after.length!==2||!isInt(after[1]))return usage;return {...out,name,skill:sk,amount:num(after[1])}}
  }
  return usage;
 }
 function helpText(gm){return COMMANDS.filter(c=>gm||c.player).map(c=>`${c.u} — ${c.d}`)}
 /* Busca por nome sem acento/maiúsculas: exato, depois começa com, depois contém. */
 function findByName(list,query,nameOf){const q=norm(query);if(!q)return [];
  for(const test of [n=>n===q,n=>n.startsWith(q),n=>n.includes(q)]){const hit=list.filter(x=>test(norm(nameOf(x))));if(hit.length)return hit}return []}
 root.LawlGameMaster={eligible,validate,applyGems,applyGrant,parseCommand,helpText,findByName,norm,MAP,COMMANDS};
})(globalThis);

/* Browser-safe item catalog: the 18 item categories, extra gear slots (Colar/Mochila) and consumables. */
(function(root){
"use strict";
// Exactly the categories requested by the owner, in this order. en = original label.
const CATEGORIES=[
 {id:"shield",en:"Shield",nm:"Escudos",ic:"🛡️"},
 {id:"melee",en:"Melee",nm:"Corpo a Corpo",ic:"⚔️"},
 {id:"distance",en:"Distance",nm:"Distância",ic:"🏹"},
 {id:"wands",en:"Wands",nm:"Varinhas",ic:"🪄"},
 {id:"backpack",en:"Backpack",nm:"Mochilas",ic:"🎒"},
 {id:"helmet",en:"Helmet",nm:"Capacetes",ic:"⛑️"},
 {id:"armor",en:"Armor",nm:"Armaduras",ic:"🥋"},
 {id:"legs",en:"Legs",nm:"Calças",ic:"👖"},
 {id:"boots",en:"Boots",nm:"Botas",ic:"🥾"},
 {id:"necklace",en:"Necklace",nm:"Colares",ic:"📿"},
 {id:"ring",en:"Ring",nm:"Anéis",ic:"💍"},
 {id:"regular",en:"Regular",nm:"Comuns",ic:"📦"},
 {id:"creature",en:"Creature Product",nm:"Produtos de Criatura",ic:"🐾"},
 {id:"ammo",en:"Ammunition",nm:"Munição",ic:"🎯"},
 {id:"rune",en:"Rune",nm:"Runas",ic:"🔮"},
 {id:"blended",en:"Blended",nm:"Poções Mistas",ic:"🧪"},
 {id:"mana",en:"Mana Potion",nm:"Poções de Mana",ic:"💧"},
 {id:"health",en:"Health Potion",nm:"Poções de Vida",ic:"❤️"}];
const GEAR_CATS=["shield","melee","distance","wands","backpack","helmet","armor","legs","boots","necklace","ring"];
const SLOT_CAT={Escudo:"shield",Capacete:"helmet",Armadura:"armor","Calças":"legs",Botas:"boots",Colar:"necklace",Anel:"ring",Mochila:"backpack"};
const WEAPON_CAT={knight:"melee",paladin:"distance",sorcerer:"wands",druid:"wands"};
function gearCategory(e){if(!e||!e.slot)return null;if(e.slot==="Arma")return WEAPON_CAT[(e.voc||[])[0]]||null;return SLOT_CAT[e.slot]||null}
// Necklace and backpack gear, one per tier and vocation; appended after the original equipment so old indices stay valid.
const EXTRA_NAMES={knight:{Colar:"Colar",Mochila:"Mochila"},paladin:{Colar:"Colar",Mochila:"Mochila"},sorcerer:{Colar:"Amuleto",Mochila:"Mochila"},druid:{Colar:"Amuleto",Mochila:"Mochila"}};
function extraGear(tiers){const out=[];
 for(const [voc,names] of Object.entries(EXTRA_NAMES)){const mage=voc==="sorcerer"||voc==="druid";
  (tiers||[]).forEach(([lvl,mat],t)=>{const k=t+1;
   out.push({name:`${names.Colar} de ${mat}`,slot:"Colar",voc:[voc],lvl,tier:t,atk:0,def:Math.round(k*.5),[mage?"mp":"hp"]:15*k,price:90*k*k});
   out.push({name:`${names.Mochila} de ${mat}`,slot:"Mochila",voc:[voc],lvl,tier:t,atk:0,def:0,hp:5*k,mp:5*k,price:30*k*k})})}
 return out}
// Shields and spellbooks from the lawlmmorpg.com wiki (English names kept). Appended after all older gear so GM indices stay stable.
// [name, level, defense, skill bonus, resistances, smith buy price (0 = not sold), sell price (0 = not sellable), drops {monster: chance}]
const KP=["knight","paladin"],MAGE=["sorcerer","druid"];
const WIKI_SHIELDS=[
 ["Wooden Shield",1,4,0,{},0,2,{"Rato":.03,"Rato Gigante":.03,"Caranguejo das Marés":.03}],
 ["Chain Shield",1,12,0,{},30,5,{"Aranha":.02}],
 ["Soldier Shield",5,14,0,{},150,40,{"Esqueleto":.02,"Orc":.015,"Pirata Saqueador":.015}],
 ["Viking Shield",10,16,0,{},1500,200,{"Orc Guerreiro":.012}],
 ["Gladiator Shield",15,18,0,{},3000,300,{"Orc Guerreiro":.008,"Troll":.01}],
 ["Dark Shield",20,20,1,{},0,2000,{"Esqueleto":.008,"Aranha da Selva":.01,"Serpente":.008}],
 ["Knight Shield",30,22,1,{},0,5500,{"Troll":.008,"Múmia":.008,"Grokk, Senhor da Guerra":.05}],
 ["Iron Shield",40,24,1,{},0,16500,{"Vampiro":.006,"Guardião do Farol":.006,"Golem":.006}],
 ["Dragon Shield",50,26,2,{fire:2},0,22000,{"Dragão":.008,"Hydra do Pântano":.04}],
 ["Sleek Shield",60,27,2,{energy:2},0,24750,{"Dragão":.005,"Espectro das Marés":.005}],
 ["Guardian Shield",75,28,2,{earth:2},0,27500,{"Demônio":.005,"Dragão":.003}],
 ["Black Shield",90,30,3,{energy:3},0,33000,{"Demônio":.004,"Faraó Amaldiçoado":.04}],
 ["Golden Shield",100,31,3,{earth:3},0,35750,{"Demônio":.003,"Faraó Amaldiçoado":.03}],
 ["Vampire Shield",110,32,3,{death:3},0,38500,{"Vampiro":.002,"Conde Sanguinário":.05}],
 ["Royal Shield",130,36,3,{phys:2,fire:3},0,44000,{"Demônio":.002,"Azaroth, Arquidemônio":.04}],
 ["Frost Shield",150,40,4,{ice:5},0,55000,{"Espectro das Marés":.002,"Hydra do Pântano":.02}],
 ["Grooved Shield",200,42,4,{phys:5},0,0,{"Colosso de Pedra":.03,"Demônio":.001}],
 ["Supremacy Shield",200,42,4,{earth:5},0,0,{"Aracna, a Tecelã":.03}],
 ["Hell Shield",300,42,4,{fire:5},0,0,{"Azaroth, Arquidemônio":.02}],
 ["Thunder Shield",400,42,4,{energy:5},0,0,{"Colosso de Pedra":.02}],
 ["Oblivion Shield",500,42,4,{death:3,fire:3},0,0,{"Azaroth, Arquidemônio":.01}]];
const WIKI_BOOKS=[
 ["Apprentice Spellbook",20,16,1,{},0,0,{"Esqueleto":.008,"Serpente Esmeralda":.008}],
 ["Mystic Spellbook",30,18,1,{},0,0,{"Múmia":.008,"Aranha da Selva":.006}],
 ["Dark Spellbook",40,20,1,{},0,0,{"Vampiro":.006,"Guardião do Farol":.006}],
 ["Holy Spellbook",50,16,2,{death:3},0,0,{"Espectro das Marés":.005,"Vampiro":.004}],
 ["Ice Spellbook",60,20,2,{ice:3},0,0,{"Espectro das Marés":.004,"Dragão":.004}],
 ["Shiny Spellbook",75,22,2,{earth:3},0,0,{"Dragão":.004,"Demônio":.004}],
 ["Cleric Spellbook",90,16,3,{death:5},0,0,{"Demônio":.003,"Faraó Amaldiçoado":.04}],
 ["Witchcraft Spellbook",110,20,3,{energy:5},0,0,{"Demônio":.002,"Colosso de Pedra":.04}],
 ["Demon Spellbook",130,24,3,{fire:6},0,0,{"Demônio":.002,"Azaroth, Arquidemônio":.04}],
 ["Frost Spellbook",150,16,4,{ice:6},0,0,{"Espectro das Marés":.002,"Hydra do Pântano":.02}],
 ["Supremacy Spellbook",200,20,4,{death:6},0,0,{"Conde Sanguinário":.03}],
 ["Relic Spellbook",300,24,4,{earth:6},0,0,{"Faraó Amaldiçoado":.02}],
 ["Nightfall Spellbook",400,16,5,{energy:7},0,0,{"Conde Sanguinário":.02}],
 ["Oblivion Spellbook",500,20,5,{death:4,fire:3},0,0,{"Azaroth, Arquidemônio":.01}]];
const SHIELDS=[...WIKI_SHIELDS.map(r=>[r,KP,"shielding"]),...WIKI_BOOKS.map(r=>[r,MAGE,"magic"])].map(([[name,lvl,def,bonus,res,buy,sell,drops],voc,sk])=>
 ({name,slot:"Escudo",voc:[...voc],lvl,tier:null,atk:0,def,price:buy,sell,shop:buy>0,wiki:true,skill:bonus?{[sk]:bonus}:{},res:{...res},drops:{...drops}}));
// Knight melee weapons from lawlmmorpg.com/wiki/items/Melee (English names kept), appended after the wiki shields so GM indices stay stable.
// [name, level, attack, defense, two-handed, +melee, +shielding, enchanted copies (0 none, 1 not sellable, 2 same sell price), smith buy price (0 = not sold), sell price, drops {monster: chance}]
const WIKI_MELEE=[
 ["Training Knife",1,1,3,0,0,0,0,500,0,{"Rato":.02}],
 ["Dagger",1,6,4,0,0,0,0,150,40,{"Rato":.03,"Rato Gigante":.03,"Caranguejo das Marés":.03}],
 ["Short Sword",5,12,6,0,0,0,0,500,100,{"Lobo":.02,"Orc":.015}],
 ["Sabre",10,18,9,0,0,0,0,3000,300,{"Orc":.012,"Pirata Saqueador":.015}],
 ["Corsair Cutlass",15,24,12,0,0,0,0,5000,450,{"Pirata Saqueador":.012,"Orc Guerreiro":.01}],
 ["Scimitar",20,30,15,0,0,1,0,0,2000,{"Esqueleto":.008,"Serpente Esmeralda":.008}],
 ["Double Axe",20,34,12,1,1,0,0,0,0,{"Orc Guerreiro":.008,"Esqueleto":.008}],
 ["Oriental Blade",30,36,19,0,0,1,0,0,5500,{"Múmia":.008,"Aranha da Selva":.006}],
 ["Crude Axe",30,40,16,1,1,0,0,0,0,{"Troll":.008,"Grokk, Senhor da Guerra":.05}],
 ["The Bonecrusher",40,40,23,0,0,1,0,0,16500,{"Golem":.006,"Troll":.005}],
 ["The Smasher",40,44,20,1,1,0,0,0,0,{"Golem":.006,"Guardião do Farol":.006}],
 ["The Great Blade",45,41,24,0,1,1,0,0,0,{"Vampiro":.006,"Guardião do Farol":.005}],
 ["Claymore",50,42,26,0,1,1,2,0,22000,{"Dragão":.008,"Faraó Amaldiçoado":.04}],
 ["The Splitter",50,46,23,1,2,0,1,0,0,{"Dragão":.006,"Hydra do Pântano":.04}],
 ["Ice Sword",60,43,28,0,1,1,1,0,24750,{"Espectro das Marés":.005,"Dragão":.005}],
 ["Ice Axe",60,48,25,1,2,0,1,0,0,{"Espectro das Marés":.005,"Colosso de Pedra":.04}],
 ["Shiny Sword",75,44,30,0,1,1,1,0,27500,{"Dragão":.004,"Demônio":.004}],
 ["Shiny Axe",75,49,27,1,2,0,1,0,0,{"Demônio":.004,"Colosso de Pedra":.03}],
 ["Sword of Honor",90,46,32,0,1,2,1,0,33000,{"Demônio":.003,"Faraó Amaldiçoado":.03}],
 ["Glory Axe",90,50,29,1,3,0,1,0,0,{"Demônio":.003,"Conde Sanguinário":.04}],
 ["Vampire Sword",110,47,36,0,1,2,1,0,38500,{"Vampiro":.002,"Conde Sanguinário":.05}],
 ["Vampire Axe",110,51,33,1,3,0,1,0,0,{"Vampiro":.002,"Conde Sanguinário":.04}],
 ["Demon Sword",130,49,38,0,1,2,1,0,44000,{"Demônio":.002,"Azaroth, Arquidemônio":.04}],
 ["Demon Axe",130,53,35,1,3,0,1,0,0,{"Demônio":.002,"Azaroth, Arquidemônio":.03}],
 ["Frost Sword",150,50,40,0,1,3,1,0,55000,{"Espectro das Marés":.002,"Hydra do Pântano":.02}],
 ["Frost Axe",150,54,37,1,4,0,1,0,0,{"Espectro das Marés":.002,"Hydra do Pântano":.015}],
 ["Supremacy Sword",200,51,42,0,1,3,1,0,0,{"Aracna, a Tecelã":.03,"Demônio":.001}],
 ["Supremacy Axe",200,55,39,1,4,0,1,0,0,{"Colosso de Pedra":.03,"Demônio":.001}],
 ["Relic Sword",300,53,44,0,1,3,1,0,0,{"Faraó Amaldiçoado":.02}],
 ["Relic Axe",300,57,41,1,4,0,1,0,0,{"Azaroth, Arquidemônio":.02}],
 ["Nightfall Sword",400,54,45,0,1,4,1,0,0,{"Conde Sanguinário":.02}],
 ["Nightfall Axe",400,58,42,1,5,0,1,0,0,{"Colosso de Pedra":.02}],
 ["Oblivion Sword",500,55,46,0,1,4,1,0,0,{"Azaroth, Arquidemônio":.01}],
 ["Oblivion Axe",500,59,43,1,5,0,1,0,0,{"Azaroth, Arquidemônio":.008}]];
// Enchanted copies (DE/EA/EN/FI/IC) deal 85% of the hit as their element plus 20% physical, like the wiki.
const ENCHANTS=[["DE","death"],["EA","earth"],["EN","energy"],["FI","fire"],["IC","ice"]];
const MELEE=[];
for(const [name,lvl,atk,def,two,mel,sh,en,buy,sell,drops] of WIKI_MELEE){
 const skill={};if(mel)skill.sword=mel;if(sh)skill.shielding=sh;
 const base={slot:"Arma",voc:["knight"],lvl,tier:null,atk,def,wiki:true,two:!!two,res:{}};
 MELEE.push({...base,name,price:buy,sell,shop:buy>0,skill:{...skill},dmg:{phys:100},drops:{...drops}});
 if(en)for(const [tag,el] of ENCHANTS)MELEE.push({...base,name:`${name} (${tag})`,price:0,sell:en===2?sell:0,shop:false,skill:{...skill},dmg:{[el]:85,phys:20},
  drops:Object.fromEntries(Object.entries(drops).map(([k,v])=>[k,+(v/5).toFixed(5)]))})}
// Paladin distance weapons from lawlmmorpg.com/wiki/items/Distance (English names kept), appended after the melee weapons so GM indices stay stable.
// [name, level, attack, two-handed, +distance, +speed, enchanted copies, smith buy price (0 = not sold), sell price, drops {monster: chance}]
const WIKI_DISTANCE=[
 ["Training Bow",1,1,0,0,0,0,500,0,{}],
 ["Bow",1,7,0,0,0,0,150,40,{"Rato":.03,"Rato Gigante":.03,"Caranguejo das Marés":.03}],
 ["Stable Bow",5,13,0,0,0,0,500,100,{"Lobo":.02,"Orc":.015}],
 ["Wired Bow",10,19,0,0,0,0,0,300,{"Orc":.012,"Pirata Saqueador":.015}],
 ["Rosewood Bow",15,25,0,0,0,0,0,450,{"Pirata Saqueador":.012,"Orc Guerreiro":.01}],
 ["Iron Bow",20,31,0,0,1,0,0,0,{"Esqueleto":.008,"Serpente Esmeralda":.008}],
 ["Iron Crossbow",20,35,1,1,0,0,0,0,{"Orc Guerreiro":.008,"Esqueleto":.008}],
 ["Nebulous Bow",30,37,0,0,1,0,0,500,{"Múmia":.008,"Aranha da Selva":.006}],
 ["Nebulous Crossbow",30,41,1,1,0,0,0,0,{"Troll":.008,"Grokk, Senhor da Guerra":.05}],
 ["Light Bow",40,41,0,0,1,0,0,500,{"Golem":.006,"Troll":.005}],
 ["Light Crossbow",40,45,1,1,0,0,0,0,{"Golem":.006,"Guardião do Farol":.006}],
 ["Nature Bow",50,43,0,1,2,1,0,0,{"Dragão":.008,"Faraó Amaldiçoado":.04}],
 ["Nature Crossbow",50,47,1,2,0,1,0,0,{"Dragão":.006,"Hydra do Pântano":.04}],
 ["Ice Bow",60,44,0,1,2,1,0,750,{"Espectro das Marés":.005,"Dragão":.005}],
 ["Ice Crossbow",60,48,1,2,0,1,0,0,{"Espectro das Marés":.005,"Colosso de Pedra":.04}],
 ["Hunting Bow",75,45,0,1,2,1,0,500,{"Dragão":.004,"Demônio":.004}],
 ["Hunting Crossbow",75,49,1,2,0,1,0,0,{"Demônio":.004,"Colosso de Pedra":.03}],
 ["Shiny Bow",90,47,0,2,2,1,0,0,{"Demônio":.003,"Faraó Amaldiçoado":.03}],
 ["Shiny Crossbow",90,51,1,3,0,1,0,0,{"Demônio":.003,"Conde Sanguinário":.04}],
 ["Vampire Bow",110,48,0,2,2,1,0,500,{"Vampiro":.002,"Conde Sanguinário":.05}],
 ["Vampire Crossbow",110,52,1,3,0,1,0,0,{"Vampiro":.002,"Conde Sanguinário":.04}],
 ["Demon Bow",130,50,0,2,2,1,0,0,{"Demônio":.002,"Azaroth, Arquidemônio":.04}],
 ["Demon Crossbow",130,54,1,3,0,1,0,0,{"Demônio":.002,"Azaroth, Arquidemônio":.03}],
 ["Frost Bow",150,51,0,2,3,1,0,0,{"Espectro das Marés":.002,"Hydra do Pântano":.02}],
 ["Frost Crossbow",150,55,1,4,0,1,0,0,{"Espectro das Marés":.002,"Hydra do Pântano":.015}],
 ["Supremacy Bow",200,52,0,2,3,1,0,0,{"Aracna, a Tecelã":.03,"Demônio":.001}],
 ["Supremacy Crossbow",200,56,1,4,0,1,0,0,{"Colosso de Pedra":.03,"Demônio":.001}],
 ["Relic Bow",300,54,0,2,3,1,0,0,{"Faraó Amaldiçoado":.02}],
 ["Relic Crossbow",300,58,1,4,0,1,0,0,{"Azaroth, Arquidemônio":.02}],
 ["Nightfall Bow",400,55,0,2,4,1,0,0,{"Conde Sanguinário":.02}],
 ["Nightfall Crossbow",400,59,1,5,0,1,0,0,{"Colosso de Pedra":.02}],
 ["Oblivion Bow",500,56,0,2,4,1,0,0,{"Azaroth, Arquidemônio":.01}],
 ["Oblivion Crossbow",500,60,1,5,0,1,0,0,{"Azaroth, Arquidemônio":.008}]];
const DISTANCE=[];
for(const [name,lvl,atk,two,dist,spd,en,buy,sell,drops] of WIKI_DISTANCE){
 const skill=dist?{distance:dist}:{};
 const base={slot:"Arma",voc:["paladin"],lvl,tier:null,atk,def:0,wiki:true,two:!!two,res:{},...(spd?{speed:spd}:{})};
 DISTANCE.push({...base,name,price:buy,sell,shop:buy>0,skill:{...skill},dmg:{phys:100},drops:{...drops}});
 if(en)for(const [tag,el] of ENCHANTS)DISTANCE.push({...base,name:`${name} (${tag})`,price:0,sell:0,shop:false,skill:{...skill},dmg:{[el]:85,phys:20},
  drops:Object.fromEntries(Object.entries(drops).map(([k,v])=>[k,+(v/5).toFixed(5)]))})}
// Mage wands from lawlmmorpg.com/wiki/items/Wands (English names kept), appended after the distance weapons so GM indices stay stable.
// [name, level, element, mana per shot, min damage, max damage, +magic, enchanted copies' +magic for their element (0 none), smith buy price (0 = not sold), sell price, drops {monster: chance}]
const WIKI_WANDS=[
 ["Training Wand",1,"earth",1,1,1,0,0,500,0,{}],
 ["Novice Wand",1,"energy",1,1,4,0,0,150,40,{}],
 ["Chill Wand",5,"ice",3,7,13,0,0,0,0,{"Lobo":.02,"Orc":.015}],
 ["Misty Wand",5,"fire",3,7,13,0,0,500,100,{"Lobo":.02,"Orc":.015}],
 ["Noble Wand",10,"energy",5,13,18,0,0,3000,300,{"Orc":.012,"Pirata Saqueador":.015}],
 ["Wand of Death",15,"death",8,20,28,0,0,5000,450,{"Pirata Saqueador":.012,"Orc Guerreiro":.01}],
 ["Cristal Wand",20,"fire",13,29,37,1,0,0,2000,{"Esqueleto":.008,"Serpente Esmeralda":.008}],
 ["Cosmic Wand",30,"energy",15,40,48,1,0,0,5500,{"Múmia":.008,"Aranha da Selva":.006}],
 ["Wand of Eternal Flame",40,"fire",17,50,65,1,0,0,16500,{"Golem":.006,"Troll":.005}],
 ["Natural Power Wand",50,"earth",18,70,88,2,4,0,22000,{"Dragão":.008,"Faraó Amaldiçoado":.04}],
 ["Wand of Blizzard",60,"ice",18,85,95,2,4,0,24750,{"Espectro das Marés":.005,"Dragão":.005}],
 ["Dragon Wand",75,"fire",19,90,110,2,4,0,27500,{"Dragão":.004,"Demônio":.004}],
 ["Glacier Wand",90,"ice",20,120,140,3,6,0,33000,{"Demônio":.003,"Faraó Amaldiçoado":.03}],
 ["Vampire Wand",110,"death",20,135,155,3,6,0,38500,{"Vampiro":.002,"Conde Sanguinário":.05}],
 ["Demon Wand",130,"fire",21,150,180,3,6,0,44000,{"Demônio":.002,"Azaroth, Arquidemônio":.04}],
 ["Frost Wand",150,"ice",21,160,190,4,8,0,55000,{"Espectro das Marés":.002,"Hydra do Pântano":.02}],
 ["Supremacy Wand",200,"death",21,175,205,4,8,0,0,{"Aracna, a Tecelã":.03,"Demônio":.001}],
 ["Relic Wand",300,"earth",21,190,225,4,8,0,0,{"Faraó Amaldiçoado":.02}],
 ["Nightfall Wand",400,"energy",21,205,245,5,10,0,0,{"Conde Sanguinário":.02}],
 ["Oblivion Wand",500,"death",21,220,260,5,10,0,0,{"Azaroth, Arquidemônio":.01}]];
// Each shot costs mana and hits min..max of the wand's element; enchanted copies (DE/EA/EN/FI/IC) shoot their enchantment's element
// and add +magic only for spells and runes of that element. Only Natural Power Wand copies are sellable on the wiki.
const WANDS=[];
for(const [name,lvl,el,mp,min,max,ml,eml,buy,sell,drops] of WIKI_WANDS){
 const skill=ml?{magic:ml}:{},base={slot:"Arma",voc:[...MAGE],lvl,tier:null,atk:Math.round((min+max)/2),def:0,wiki:true,two:false,res:{}};
 WANDS.push({...base,name,price:buy,sell,shop:buy>0,skill:{...skill},dmg:{[el]:100},wand:{mp,min,max,el},drops:{...drops}});
 if(eml)for(const [tag,en] of ENCHANTS)WANDS.push({...base,name:`${name} (${tag})`,price:0,sell:name==="Natural Power Wand"?sell:0,shop:false,skill:{...skill},elMagic:{[en]:eml},
  dmg:{[en]:100},wand:{mp,min,max,el:en},drops:Object.fromEntries(Object.entries(drops).map(([k,v])=>[k,+(v/5).toFixed(5)]))})}
// Backpacks from lawlmmorpg.com/wiki/items/Backpack: worn in the Mochila slot by any vocation; their slots add room for gear in the bag.
// [name, slots, sell price (0 = not sellable), drops {monster: chance}] — Green and Tribute have no loot source on the wiki (GM only).
const WIKI_BACKPACKS=[
 ["Green Backpack",15,0,{}],
 ["Brown Backpack",20,100,{"Rato Gigante":.01,"Lobo":.01}],
 ["Blue Backpack",25,300,{"Aranha":.008,"Pirata Saqueador":.008}],
 ["Yellow Backpack",30,450,{"Orc":.008}],
 ["Gray Backpack",35,2000,{"Orc Guerreiro":.006,"Troll":.006}],
 ["Sky Backpack",40,5000,{"Esqueleto":.005,"Múmia":.005}],
 ["Red Backpack",45,15000,{"Dragão":.004}],
 ["White Backpack",50,20000,{"Serpente Esmeralda":.004,"Aranha da Selva":.004}],
 ["Vampire Backpack",55,0,{"Vampiro":.003,"Conde Sanguinário":.03}],
 ["Demon Backpack",60,0,{"Demônio":.002}],
 ["Bugaboo Backpack",65,0,{"Grokk, Senhor da Guerra":.03}],
 ["Frost Backpack",65,0,{"Espectro das Marés":.002,"Hydra do Pântano":.015}],
 ["Halloween Backpack",65,0,{"Espectro das Marés":.002}],
 ["Santa Backpack",65,0,{"Hydra do Pântano":.02}],
 ["Stick Backpack",65,0,{"Golem":.002}],
 ["Tribute Backpack",65,0,{}],
 ["Tie Dye Backpack",70,0,{"Aracna, a Tecelã":.02}],
 ["Affection Backpack",75,0,{"Faraó Amaldiçoado":.02}],
 ["Explorer Backpack",80,0,{"Colosso de Pedra":.02}],
 ["Moon Backpack",85,0,{"Conde Sanguinário":.015}],
 ["Hell Backpack",90,0,{"Azaroth, Arquidemônio":.015}],
 ["Thunder Backpack",95,0,{"Colosso de Pedra":.01}],
 ["Oblivion Backpack",100,0,{"Azaroth, Arquidemônio":.008}]];
const BACKPACKS=WIKI_BACKPACKS.map(([name,slots,sell,drops])=>({name,slot:"Mochila",voc:["knight","paladin","sorcerer","druid"],lvl:0,tier:null,atk:0,def:0,wiki:true,
 price:0,sell,shop:false,slots,skill:{},res:{},drops:{...drops}}));
// Helmets, armors and legs from lawlmmorpg.com/wiki/items/Helmet|Armor|Legs (English names kept), appended after the wiki backpacks so GM indices stay stable.
// [name, level, armor (defense), classes (A all, K Knight, P Paladin, M Mage+Healer = Sorcerer/Druid), resistances %, skill bonus, +speed, smith buy price (0 = not sold), sell price (0 = not sellable), drops {monster: chance}]
// Wiki "Melee" is the sword skill; pieces that only come from the wiki's Magic Chests (not in the game yet) drop at half the rate of their level band.
const WIKI_HELMETS=[
 ["Black Helmet",90,10,"A",{"energy":3},{},0,0,0,{"Demônio":0.003,"Faraó Amaldiçoado":0.03}],
 ["Blaze Headgear",350,11,"P",{"fire":6},{"distance":2},5,0,0,{"Conde Sanguinário":0.0075}],
 ["Chain Helmet",1,1,"A",{},{},0,150,40,{"Rato":0.03,"Rato Gigante":0.03,"Caranguejo das Marés":0.03}],
 ["Cursed Headgear",75,5,"P",{"death":2},{"distance":1},5,0,0,{"Dragão":0.002,"Demônio":0.002}],
 ["Dark Headgear",110,6,"P",{"death":3},{"distance":1},5,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}],
 ["Dark Helmet",20,5,"A",{},{},0,0,0,{"Esqueleto":0.008,"Serpente Esmeralda":0.008}],
 ["Divine Hat",200,10,"M",{"death":5},{"magic":1},5,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Dragon Helmet",50,8,"A",{"fire":2},{},0,0,0,{"Dragão":0.008,"Faraó Amaldiçoado":0.04}],
 ["Fiery Helmet",450,14,"K",{"fire":6},{"sword":2,"shielding":3},0,0,0,{"Azaroth, Arquidemônio":0.006}],
 ["Flow Helmet",350,14,"K",{"energy":6},{"sword":2,"shielding":3},0,0,0,{"Conde Sanguinário":0.0075}],
 ["Frost Helmet",150,13,"A",{"ice":5},{},0,0,0,{"Espectro das Marés":0.002,"Hydra do Pântano":0.02}],
 ["Gladiator Helmet",15,4,"A",{},{},0,0,450,{"Pirata Saqueador":0.012,"Orc Guerreiro":0.01}],
 ["Glassy Headgear",250,11,"P",{"ice":5},{"distance":1},5,0,0,{"Colosso de Pedra":0.0125}],
 ["Gloom Helmet",50,8,"K",{"phys":2},{"shielding":1},0,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Golden Helmet",100,10,"A",{"earth":3},{},0,750,750,{"Demônio":0.003,"Faraó Amaldiçoado":0.03}],
 ["Grooved Helmet",200,14,"K",{"phys":5},{"shielding":3},0,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Guardian Helmet",75,9,"A",{"earth":2},{},0,500,500,{"Dragão":0.004,"Demônio":0.004}],
 ["Hat of Destruction",150,7,"M",{"death":3},{"magic":1},5,0,0,{"Espectro das Marés":0.001,"Hydra do Pântano":0.01}],
 ["Hat of Inferno",250,11,"M",{"fire":5},{"magic":1},5,0,0,{"Colosso de Pedra":0.0125}],
 ["Hat of the Skies",75,5,"M",{"energy":2},{"magic":1},5,0,0,{"Dragão":0.002,"Demônio":0.002}],
 ["Hell Helmet",300,15,"A",{"fire":5},{},0,0,0,{"Faraó Amaldiçoado":0.02}],
 ["Holy Headgear",450,11,"P",{"death":6},{"distance":2},5,0,0,{"Azaroth, Arquidemônio":0.006}],
 ["Iron Helmet",40,7,"A",{},{},0,500,500,{"Golem":0.006,"Troll":0.005}],
 ["Knight Helmet",30,6,"A",{},{},0,500,500,{"Múmia":0.008,"Aranha da Selva":0.006}],
 ["Luster Hat",450,11,"M",{"energy":6},{"magic":2},5,0,0,{"Azaroth, Arquidemônio":0.006}],
 ["Oblivion Helmet",500,16,"A",{"death":3,"fire":3},{},0,0,0,{"Azaroth, Arquidemônio":0.01}],
 ["Oriental Helmet",110,11,"K",{"phys":3},{"shielding":2},0,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}],
 ["Power Headgear",150,7,"P",{"energy":3},{"distance":1},5,0,0,{"Espectro das Marés":0.001,"Hydra do Pântano":0.01}],
 ["Purple Hat",50,4,"M",{"ice":2},{"magic":1},5,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Ranged Headgear",50,4,"P",{"earth":2},{"distance":1},5,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Royal Helmet",130,12,"A",{"phys":2,"fire":3},{},0,0,0,{"Demônio":0.002,"Azaroth, Arquidemônio":0.04}],
 ["Santa Hat",90,10,"A",{"ice":3},{},0,0,0,{"Demônio":0.003,"Faraó Amaldiçoado":0.03}],
 ["Shiver Hat",350,11,"M",{"ice":6},{"magic":2},5,0,0,{"Conde Sanguinário":0.0075}],
 ["Sleek Helmet",60,8,"A",{"energy":2},{},0,750,750,{"Espectro das Marés":0.005,"Dragão":0.005}],
 ["Snowflake Helmet",150,11,"K",{"ice":3},{"sword":1,"shielding":2},0,0,0,{"Espectro das Marés":0.001,"Hydra do Pântano":0.01}],
 ["Soldier Helmet",5,2,"A",{},{},0,500,100,{"Lobo":0.02,"Orc":0.015}],
 ["Spike Helmet",110,9,"K",{"earth":3},{"sword":1,"shielding":2},0,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}],
 ["Straw Hat",90,9,"A",{"earth":3},{},0,0,0,{"Demônio":0.003,"Faraó Amaldiçoado":0.03}],
 ["Superior Helmet",200,11,"K",{"death":5},{"sword":1,"shielding":3},0,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Supremacy Helmet",200,14,"A",{"earth":5},{},0,0,0,{"Aracna, a Tecelã":0.03,"Demônio":0.001}],
 ["Supreme Headgear",200,10,"P",{"earth":5},{"distance":1},5,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Thrive Helmet",250,14,"K",{"earth":5},{"sword":1,"shielding":3},0,0,0,{"Colosso de Pedra":0.0125}],
 ["Thunder Helmet",400,16,"A",{"energy":5},{},0,0,0,{"Colosso de Pedra":0.02}],
 ["Vampire Helmet",110,11,"A",{"death":3},{},0,500,500,{"Vampiro":0.002,"Conde Sanguinário":0.05}],
 ["Viking Helmet",10,3,"A",{},{},0,0,300,{"Orc":0.012,"Pirata Saqueador":0.015}],
 ["Warm Helmet",75,8,"K",{"fire":2},{"sword":1,"shielding":1},0,0,0,{"Dragão":0.002,"Demônio":0.002}],
 ["Warrior Helmet",50,6,"K",{"energy":2},{"sword":1,"shielding":1},0,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Witch Hat",90,9,"A",{"death":3},{},0,0,0,{"Demônio":0.003,"Faraó Amaldiçoado":0.03}],
 ["Wizard Hat",110,6,"M",{"earth":3},{"magic":1},5,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}]];
const WIKI_ARMORS=[
 ["Black Armor",90,14,"A",{"energy":5},{},0,0,0,{"Demônio":0.003,"Faraó Amaldiçoado":0.03}],
 ["Blaze Plate",350,15,"P",{"fire":9},{"distance":4},5,0,0,{"Conde Sanguinário":0.0075}],
 ["Cape of Destruction",150,11,"M",{"death":5},{"magic":2},5,0,0,{"Espectro das Marés":0.001,"Hydra do Pântano":0.01}],
 ["Cape of Inferno",250,15,"M",{"fire":8},{"magic":3},5,0,0,{"Colosso de Pedra":0.0125}],
 ["Cape of the Skies",75,9,"M",{"energy":3},{"magic":1},5,0,0,{"Dragão":0.002,"Demônio":0.002}],
 ["Chain Armor",1,5,"A",{},{},0,150,40,{"Rato":0.03,"Rato Gigante":0.03,"Caranguejo das Marés":0.03}],
 ["Cursed Plate",75,9,"P",{"death":3},{"distance":1},5,0,0,{"Dragão":0.002,"Demônio":0.002}],
 ["Dark Armor",20,9,"A",{},{},0,0,0,{"Esqueleto":0.008,"Serpente Esmeralda":0.008}],
 ["Dark Plate",110,10,"P",{"death":5},{"distance":2},5,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}],
 ["Divine Cape",200,14,"M",{"death":8},{"magic":3},5,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Dragon Armor",50,12,"A",{"fire":3},{},0,0,0,{"Dragão":0.008,"Faraó Amaldiçoado":0.04}],
 ["Fiery Armor",450,18,"K",{"fire":9},{"sword":4,"shielding":3},0,0,0,{"Azaroth, Arquidemônio":0.006}],
 ["Flow Armor",350,18,"K",{"energy":9},{"sword":4,"shielding":3},0,0,0,{"Conde Sanguinário":0.0075}],
 ["Frost Armor",150,17,"A",{"ice":8},{},0,0,0,{"Espectro das Marés":0.001,"Hydra do Pântano":0.01}],
 ["Gladiator Armor",15,8,"A",{},{},0,0,450,{"Pirata Saqueador":0.012,"Orc Guerreiro":0.01}],
 ["Glassy Plate",250,15,"P",{"ice":8},{"distance":3},5,0,0,{"Colosso de Pedra":0.0125}],
 ["Gloom Armor",50,12,"K",{"phys":3},{"shielding":1},0,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Golden Armor",100,14,"A",{"earth":5},{},0,750,750,{"Demônio":0.003,"Faraó Amaldiçoado":0.03}],
 ["Grooved Armor",200,18,"K",{"phys":8},{"shielding":3},0,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Guardian Armor",75,13,"A",{"earth":3},{},0,500,500,{"Dragão":0.004,"Demônio":0.004}],
 ["Hell Armor",300,19,"A",{"fire":8},{},0,0,0,{"Faraó Amaldiçoado":0.02}],
 ["Holy Plate",450,15,"P",{"death":9},{"distance":4},5,0,0,{"Azaroth, Arquidemônio":0.006}],
 ["Iron Armor",40,11,"A",{},{},0,500,500,{"Golem":0.006,"Troll":0.005}],
 ["Knight Armor",30,10,"A",{},{},0,500,500,{"Múmia":0.008,"Aranha da Selva":0.006}],
 ["Luster Cape",450,15,"M",{"energy":9},{"magic":4},5,0,0,{"Azaroth, Arquidemônio":0.006}],
 ["Oblivion Armor",500,20,"A",{"death":4,"fire":5},{},0,0,0,{"Azaroth, Arquidemônio":0.01}],
 ["Oriental Armor",110,15,"K",{"phys":5},{"shielding":2},0,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}],
 ["Power Plate",150,11,"P",{"energy":5},{"distance":2},5,0,0,{"Espectro das Marés":0.001,"Hydra do Pântano":0.01}],
 ["Purple Cape",50,8,"M",{"ice":3},{"magic":1},5,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Ranger Plate",50,8,"P",{"earth":3},{"distance":1},5,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Royal Armor",130,16,"A",{"phys":4,"fire":4},{},0,0,0,{"Demônio":0.002,"Azaroth, Arquidemônio":0.04}],
 ["Shiver Cape",350,15,"M",{"ice":9},{"magic":4},5,0,0,{"Conde Sanguinário":0.0075}],
 ["Sleek Armor",60,12,"A",{"energy":3},{},0,750,750,{"Espectro das Marés":0.005,"Dragão":0.005}],
 ["Snowflake Armor",150,15,"K",{"ice":5},{"sword":2,"shielding":2},0,0,0,{"Espectro das Marés":0.001,"Hydra do Pântano":0.01}],
 ["Soldier Armor",5,6,"A",{},{},0,500,100,{"Lobo":0.02,"Orc":0.015}],
 ["Spike Armor",110,13,"K",{"earth":5},{"sword":2,"shielding":2},0,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}],
 ["Superior Armor",200,15,"K",{"death":8},{"sword":3,"shielding":3},0,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Supremacy Armor",200,18,"A",{"earth":8},{},0,0,0,{"Aracna, a Tecelã":0.03,"Demônio":0.001}],
 ["Supreme Plate",200,14,"P",{"earth":8},{"distance":3},5,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Thrive Armor",250,18,"K",{"earth":8},{"sword":3,"shielding":3},0,0,0,{"Colosso de Pedra":0.0125}],
 ["Thunder Armor",400,20,"A",{"energy":8},{},0,0,0,{"Colosso de Pedra":0.02}],
 ["Vampire Armor",110,15,"A",{"death":5},{},0,500,500,{"Vampiro":0.002,"Conde Sanguinário":0.05}],
 ["Viking Armor",10,7,"A",{},{},0,0,300,{"Orc":0.012,"Pirata Saqueador":0.015}],
 ["Warm Armor",75,12,"K",{"fire":3},{"sword":1,"shielding":1},0,0,0,{"Dragão":0.002,"Demônio":0.002}],
 ["Warrior Armor",50,10,"K",{"energy":3},{"sword":1,"shielding":1},0,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Wizard Cape",110,10,"M",{"earth":5},{"magic":2},5,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}]];
const WIKI_LEGS=[
 ["Black Legs",90,10,"A",{"energy":4},{},0,0,0,{"Demônio":0.003,"Faraó Amaldiçoado":0.03}],
 ["Blaze Legs",350,11,"P",{"fire":7},{"distance":4},5,0,0,{"Conde Sanguinário":0.0075}],
 ["Chain Legs",1,1,"A",{},{},0,150,40,{"Rato":0.03,"Rato Gigante":0.03,"Caranguejo das Marés":0.03}],
 ["Cursed Legs",75,5,"P",{"death":2},{"distance":1},5,0,0,{"Dragão":0.002,"Demônio":0.002}],
 ["Dark Legs",20,5,"A",{},{},0,0,0,{"Esqueleto":0.008,"Serpente Esmeralda":0.008}],
 ["Dark Ranger Legs",110,7,"P",{"death":4},{"distance":2},5,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}],
 ["Divine Legs",200,10,"M",{"death":6},{"magic":3},5,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Dragon Legs",50,8,"A",{"fire":2},{},0,0,0,{"Dragão":0.008,"Faraó Amaldiçoado":0.04}],
 ["Fiery Legs",450,14,"K",{"fire":7},{"sword":4,"shielding":3},0,0,0,{"Azaroth, Arquidemônio":0.006}],
 ["Flow Legs",350,14,"K",{"energy":7},{"sword":4,"shielding":3},0,0,0,{"Conde Sanguinário":0.0075}],
 ["Frost Legs",150,13,"A",{"ice":6},{},0,0,0,{"Espectro das Marés":0.002,"Hydra do Pântano":0.02}],
 ["Gladiator Kilt",15,4,"A",{},{},0,0,450,{"Pirata Saqueador":0.012,"Orc Guerreiro":0.01}],
 ["Glassy Legs",250,11,"P",{"ice":6},{"distance":3},5,0,0,{"Colosso de Pedra":0.0125}],
 ["Gloom Legs",50,8,"K",{"phys":2},{"shielding":1},0,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Golden Legs",100,10,"A",{"earth":4},{},0,750,750,{"Demônio":0.003,"Faraó Amaldiçoado":0.03}],
 ["Grooved Legs",200,14,"K",{"phys":6},{"shielding":3},0,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Guardian Legs",75,9,"A",{"earth":2},{},0,500,500,{"Dragão":0.004,"Demônio":0.004}],
 ["Hell Legs",300,15,"A",{"fire":6},{},0,0,0,{"Faraó Amaldiçoado":0.02}],
 ["Holy Legs",450,11,"P",{"death":7},{"distance":4},5,0,0,{"Azaroth, Arquidemônio":0.006}],
 ["Iron Legs",40,7,"A",{},{},0,500,500,{"Golem":0.006,"Troll":0.005}],
 ["Knight Legs",30,6,"A",{},{},0,500,500,{"Múmia":0.008,"Aranha da Selva":0.006}],
 ["Legs of Destruction",150,8,"M",{"death":4},{"magic":2},5,0,0,{"Espectro das Marés":0.001,"Hydra do Pântano":0.01}],
 ["Legs of Inferno",250,11,"M",{"fire":6},{"magic":3},5,0,0,{"Colosso de Pedra":0.0125}],
 ["Legs of the Skies",75,5,"M",{"energy":2},{"magic":1},5,0,0,{"Dragão":0.002,"Demônio":0.002}],
 ["Luster Legs",450,11,"M",{"energy":7},{"magic":4},5,0,0,{"Azaroth, Arquidemônio":0.006}],
 ["Oblivion Legs",500,16,"A",{"death":4,"fire":3},{},0,0,0,{"Azaroth, Arquidemônio":0.01}],
 ["Oriental Legs",110,11,"K",{"phys":4},{"shielding":2},0,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}],
 ["Power Legs",150,8,"P",{"energy":4},{"distance":2},5,0,0,{"Espectro das Marés":0.001,"Hydra do Pântano":0.01}],
 ["Purple Legs",50,4,"M",{"ice":2},{"magic":1},5,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Ranger Legs",50,4,"P",{"earth":2},{"distance":1},5,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Royal Legs",130,12,"A",{"phys":3,"fire":3},{},0,0,0,{"Demônio":0.002,"Azaroth, Arquidemônio":0.04}],
 ["Shiver Legs",350,11,"M",{"ice":7},{"magic":4},5,0,0,{"Conde Sanguinário":0.0075}],
 ["Sleek Legs",60,8,"A",{"energy":2},{},0,750,750,{"Espectro das Marés":0.005,"Dragão":0.005}],
 ["Snowflake Legs",150,11,"K",{"ice":4},{"sword":2,"shielding":2},0,0,0,{"Espectro das Marés":0.001,"Hydra do Pântano":0.01}],
 ["Soldier Legs",5,2,"A",{},{},0,500,100,{"Lobo":0.02,"Orc":0.015}],
 ["Spike Legs",110,9,"K",{"earth":4},{"sword":2,"shielding":2},0,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}],
 ["Superior Legs",200,12,"K",{"death":6},{"sword":3,"shielding":3},0,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Supremacy Legs",200,14,"A",{"earth":6},{},0,0,0,{"Aracna, a Tecelã":0.03,"Demônio":0.001}],
 ["Supreme Legs",200,10,"P",{"earth":6},{"distance":3},5,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Thrive Legs",250,14,"K",{"earth":6},{"sword":3,"shielding":3},0,0,0,{"Colosso de Pedra":0.0125}],
 ["Thunder Legs",400,16,"A",{"energy":6},{},0,0,0,{"Colosso de Pedra":0.02}],
 ["Vampire Legs",110,11,"A",{"death":4},{},0,500,500,{"Vampiro":0.002,"Conde Sanguinário":0.05}],
 ["Viking Kilt",10,3,"A",{},{},0,0,300,{"Orc":0.012,"Pirata Saqueador":0.015}],
 ["Warm Legs",75,8,"K",{"fire":2},{"sword":1,"shielding":1},0,0,0,{"Dragão":0.002,"Demônio":0.002}],
 ["Warrior Legs",50,6,"K",{"energy":2},{"sword":1,"shielding":1},0,0,0,{"Dragão":0.004,"Faraó Amaldiçoado":0.02}],
 ["Wizard Legs",110,7,"M",{"earth":4},{"magic":2},5,0,0,{"Vampiro":0.001,"Conde Sanguinário":0.025}]];
// Boots from lawlmmorpg.com/wiki/items/Boots, same row format as the legs; appended after the wiki legs so GM indices stay stable.
// Wiki monsters map to the closest game monster of the same level band; Enchanted Boots is quest-only on the wiki (no stats, no loot), so only the GameMaster gives it.
const WIKI_BOOTS=[
 ["Country Boots",90,2,"A",{"earth":2},{},10,0,0,{"Demônio":0.003,"Faraó Amaldiçoado":0.03}],
 ["Dragon Boots",60,2,"A",{"fire":2},{},10,0,22000,{"Dragão":0.006,"Hydra do Pântano":0.03}],
 ["Earth Boots",150,4,"A",{"earth":3},{},10,0,0,{"Hydra do Pântano":0.02,"Serpente Esmeralda":0.002}],
 ["Enchanted Boots",100,0,"A",{},{},0,0,0,{}],
 ["Frost Boots",150,3,"A",{"ice":3},{},15,0,0,{"Espectro das Marés":0.002,"Hydra do Pântano":0.02}],
 ["Golden Boots",100,5,"A",{"earth":2},{},0,0,24750,{"Múmia":0.002,"Faraó Amaldiçoado":0.03}],
 ["Grooved Boots",200,3,"A",{"phys":3},{},5,0,0,{"Aracna, a Tecelã":0.015,"Demônio":0.0005}],
 ["Hasty Boots",0,0,"A",{},{},30,0,0,{"Múmia":0.001,"Vampiro":0.001}],
 ["Hell Boots",300,4,"A",{"fire":3},{},20,0,0,{"Faraó Amaldiçoado":0.02}],
 ["Iron Boots",40,2,"A",{},{},0,0,16500,{"Golem":0.006,"Múmia":0.006,"Vampiro":0.004,"Espectro das Marés":0.004,"Guardião do Farol":0.006,"Demônio":0.002}],
 ["Leather Boots",0,1,"A",{},{},0,100,50,{"Rato":0.03,"Rato Gigante":0.03,"Caranguejo das Marés":0.03,"Esqueleto":0.02,"Escorpião":0.02}],
 ["Oblivion Boots",500,4,"A",{"death":2,"fire":2},{},20,0,0,{"Azaroth, Arquidemônio":0.01}],
 ["Santa Boots",90,4,"A",{"ice":2},{},5,0,0,{"Espectro das Marés":0.003,"Hydra do Pântano":0.02}],
 ["Supremacy Boots",200,4,"A",{"earth":3},{},15,0,0,{"Aracna, a Tecelã":0.03,"Demônio":0.001}]];
const ARMOR_VOC={A:["knight","paladin","sorcerer","druid"],K:["knight"],P:["paladin"],KP:["knight","paladin"],M:[...MAGE]};
const armorPiece=slot=>([name,lvl,def,cls,res,skill,spd,buy,sell,drops])=>({name,slot,voc:[...ARMOR_VOC[cls]],lvl,tier:null,atk:0,def,wiki:true,
 price:buy,sell,shop:buy>0,skill:{...skill},res:{...res},...(spd?{speed:spd}:{}),drops:{...drops}});
const HELMETS=WIKI_HELMETS.map(armorPiece("Capacete")),ARMORS=WIKI_ARMORS.map(armorPiece("Armadura")),LEGS=WIKI_LEGS.map(armorPiece("Calças")),BOOTS=WIKI_BOOTS.map(armorPiece("Botas"));
// Necklaces and rings from the wiki, same row format as the boots; appended after the wiki boots so GM indices stay stable. The wiki gives them only
// their wiki armor, level, vocation and skill/speed bonuses. They drop only from the wiki monsters that list them (by item name, LawlMonsters.loot), so `drops`
// toward older game monsters stays empty and `from` names those wiki monsters; rings sourced from Magic Chests come out of those chests (chestPool).
// Orc Warden and Santa Impersonator are not in the game, so Old Ring and Santa Ring come only from the GameMaster. Rings have no buyer; Scarf never joins the starter kit.
const WIKI_AMULETS=[
 ["Scarf",0,1,"A",{},{},0,0,250,{}],
 ["Skull Bandana",10,3,"A",{},{},0,0,10000,{}],
 ["Hawk Bandana",20,4,"A",{},{},0,0,12000,{}],
 ["Cowboy Bandana",20,4,"A",{},{},0,0,12000,{}]];
const WIKI_RINGS=[["Crude Ring",5,1,"A",{},{},0,0,0,{}],
 ["Old Ring",10,2,"A",{},{},0,0,0,{}],
 ["Instant Ring",80,0,"A",{},{},5,0,0,{}],
 ["Piercing Ring",80,0,"P",{},{"distance":2},0,0,0,{}],
 ["Protection Ring",80,0,"KP",{},{"shielding":2},0,0,0,{}],
 ["Shiver Ring",80,0,"M",{},{"magic":2},0,0,0,{}],
 ["Slash Ring",80,0,"K",{},{"sword":2},0,0,0,{}],
 ["Santa Ring",90,2,"A",{},{},5,0,0,{}],
 ["Focus Ring",150,0,"P",{},{"distance":3},0,0,0,{}],
 ["Guardian Ring",150,0,"KP",{},{"shielding":3},0,0,0,{}],
 ["Soul Ring",150,0,"M",{},{"magic":3},0,0,0,{}],
 ["Aggressive Ring",150,0,"K",{},{"sword":3},0,0,0,{}]];
const WIKI_FROM={
 "Scarf":["Bloodthirsty","Cyclops","Dwarf Combatant","Enchanter","Ghost","Giant Spider","Medusa","Minotaur Warrior","Mummy","Night Elf","Omothymus","Orbweaver","Panther","Possessed Pumpkin","Sabertooth","Skeleton","Specter","Spider","Vampire Apprentice","Vicious Spider"],
 "Skull Bandana":["Bloodlust Werewolf","Eventooth Werewolf","Former Monk","Ghost","Giant Spider","Glacial Spider","Grim Reaper","Minotaur Vanguard","Night Elf","Possessed Pumpkin","Vampire Apprentice"],
 "Hawk Bandana":["Behemoth","Peasant"],
 "Cowboy Bandana":["Sorcerer"],
 "Crude Ring":["Archer","Primal Cyclops","Rotten Mummy","Young Dragon","Young Soldier"],
 "Prison Key":["Prison Warder"]};
const NO_KIT=new Set(["Scarf"]);
const withFrom=e=>Object.assign(e,{from:[...(WIKI_FROM[e.name]||[])]},NO_KIT.has(e.name)?{noKit:true}:{});
const AMULETS=WIKI_AMULETS.map(armorPiece("Colar")).map(withFrom),RINGS=WIKI_RINGS.map(armorPiece("Anel")).map(withFrom);
// Charged boots (Enchanted Boots, quest-only on the wiki): while worn and charged they add regeneration; the charge is wear time in seconds stored
// on the item copy as `charge` (missing = freshly obtained, full). It only drains while worn in-game and the Encantadora NPC recharges it for gold.
const CHARGED_BOOTS={"Enchanted Boots":{full:4*3600,hp:1,mp:2,every:2,price:10000}};
for(const b of BOOTS)if(CHARGED_BOOTS[b.name])b.regen={...CHARGED_BOOTS[b.name]};
const WIKI_GEAR=[...SHIELDS,...MELEE,...DISTANCE,...WANDS,...BACKPACKS,...HELMETS,...ARMORS,...LEGS,...BOOTS,...AMULETS,...RINGS],WIKI_BY_NAME=new Map(WIKI_GEAR.map(e=>[e.name,e]));
// Regular items and creature products from lawlmmorpg.com/wiki/items/Regular|Creature_Product (English names kept), kept as loot in p.loot like other monster loot.
// [name, category, icon, Mercador price (0 = not sellable), drops {monster: chance}] — wiki monsters do not exist here, so each item drops from the game monster
// closest to its wiki source; items without a loot source on the wiki (quest symbols, feathers, presents…) have no drops and come only from the GameMaster.
const WIKI_LOOT=[
 ["Allure Symbol","regular","🔱",0,{}],
 ["Black Stone","regular","💎",200,{"Lobo":0.02,"Orc":0.02,"Orc Guerreiro":0.02}],
 ["Blue Stolen Present","regular","🎁",0,{}],
 ["Brave Token","regular","🪙",250,{"Orc":0.02,"Orc Guerreiro":0.02,"Guardião do Farol":0.02}],
 ["Brown Magic Feather","regular","🪶",0,{}],
 ["Candy Apple","regular","🍎",0,{"Pirata Saqueador":0.01}],
 ["Cold Token","regular","🪙",0,{"Faraó Amaldiçoado":0.03}],
 ["Crude Black Stone","regular","💎",150,{"Lobo":0.02,"Orc":0.02,"Orc Guerreiro":0.02}],
 ["Crude Green Stone","regular","💎",150,{"Orc":0.02,"Orc Guerreiro":0.02,"Aranha":0.02}],
 ["Crude Red Stone","regular","💎",150,{"Lobo":0.02,"Orc":0.02,"Orc Guerreiro":0.02}],
 ["Cyan Magic Feather","regular","🪶",0,{}],
 ["Delicate Flower","regular","🍎",0,{"Pirata Saqueador":0.01}],
 ["Fate Token","regular","🪙",100,{"Guardião do Farol":0.02,"Orc Guerreiro":0.02,"Pirata Saqueador":0.02}],
 ["Fidelity Symbol","regular","🔱",0,{}],
 ["Fighter Token","regular","🪙",0,{"Colosso de Pedra":0.03}],
 ["Gold Ingot","regular","🥇",0,{"Demônio":0.01,"Vampiro":0.01,"Múmia":0.01}],
 ["Gray Magic Feather","regular","🪶",0,{}],
 ["Green Stolen Present","regular","🎁",0,{}],
 ["Green Stone","regular","💎",200,{"Lobo":0.02,"Aranha":0.02,"Aranha da Selva":0.02}],
 ["Hell Token","regular","🪙",0,{"Azaroth, Arquidemônio":0.03}],
 ["Hero Token","regular","🪙",0,{"Colosso de Pedra":0.03}],
 ["Ice Cube","regular","🧊",0,{"Demônio":0.01,"Espectro das Marés":0.01}],
 ["Immortality Symbol","regular","🔱",0,{}],
 ["Magic Chest Advanced","regular","🧰",0,{"Golem":0.004,"Guardião do Farol":0.004}],
 ["Magic Chest Amateur","regular","🧰",0,{"Múmia":0.004,"Troll":0.004}],
 ["Magic Chest Apex","regular","🧰",0,{"Azaroth, Arquidemônio":0.02}],
 ["Magic Chest Beginner","regular","🧰",0,{"Orc":0.004,"Esqueleto":0.004}],
 ["Magic Chest Expert","regular","🧰",0,{"Dragão":0.004}],
 ["Magic Chest Lord","regular","🧰",0,{"Conde Sanguinário":0.02}],
 ["Magic Chest Master","regular","🧰",0,{"Demônio":0.004}],
 ["Magic Chest Professional","regular","🧰",0,{"Vampiro":0.004,"Espectro das Marés":0.004}],
 ["Magic Chest Warden","regular","🧰",0,{"Colosso de Pedra":0.02,"Hydra do Pântano":0.02}],
 ["Magic Death Token","regular","🪙",0,{"Azaroth, Arquidemônio":0.03}],
 ["Magic Earth Token","regular","🪙",0,{"Colosso de Pedra":0.03}],
 ["Magic Energy Token","regular","🪙",0,{"Faraó Amaldiçoado":0.03}],
 ["Magic Fire Token","regular","🪙",0,{"Colosso de Pedra":0.03}],
 ["Magic Ice Token","regular","🪙",0,{"Faraó Amaldiçoado":0.03}],
 ["Magic Key Advanced","regular","🗝️",0,{"Golem":0.003,"Guardião do Farol":0.003}],
 ["Magic Key Amateur","regular","🗝️",0,{"Múmia":0.003,"Troll":0.003}],
 ["Magic Key Apex","regular","🗝️",0,{"Azaroth, Arquidemônio":0.015}],
 ["Magic Key Beginner","regular","🗝️",0,{"Orc":0.003,"Esqueleto":0.003}],
 ["Magic Key Expert","regular","🗝️",0,{"Dragão":0.003}],
 ["Magic Key Lord","regular","🗝️",0,{"Conde Sanguinário":0.015}],
 ["Magic Key Master","regular","🗝️",0,{"Demônio":0.003}],
 ["Magic Key Professional","regular","🗝️",0,{"Vampiro":0.003,"Espectro das Marés":0.003}],
 ["Magic Key Warden","regular","🗝️",0,{"Colosso de Pedra":0.015,"Hydra do Pântano":0.015}],
 ["Nightfall Token","regular","🪙",0,{"Faraó Amaldiçoado":0.03}],
 ["Oblivion Token","regular","🪙",0,{"Azaroth, Arquidemônio":0.03}],
 ["Orange Stolen Present","regular","🎁",0,{"Pirata Saqueador":0.01}],
 ["Perfection Symbol","regular","🔱",0,{}],
 ["Prison Key","regular","🗝️",0,{}],
 ["Polished Purple Stone","regular","💎",250,{"Lobo":0.02,"Aranha":0.02,"Aranha da Selva":0.02}],
 ["Polished Red Stone","regular","💎",250,{"Lobo":0.02,"Dragão":0.02,"Demônio":0.02}],
 ["Polished Yellow Stone","regular","💎",250,{"Lobo":0.02,"Aranha":0.02,"Aranha da Selva":0.02}],
 ["Purple Magic Feather","regular","🪶",0,{}],
 ["Purple Stone","regular","💎",200,{"Orc":0.02,"Orc Guerreiro":0.02,"Aranha":0.02}],
 ["Red Magic Feather","regular","🪶",0,{}],
 ["Relic Token","regular","🪙",0,{"Grokk, Senhor da Guerra":0.03}],
 ["Sacrifice Symbol","regular","🔱",0,{}],
 ["Small Pumpkin","regular","🍎",0,{"Pirata Saqueador":0.01}],
 ["Special Garlic","regular","🍎",0,{"Pirata Saqueador":0.01}],
 ["Supremacy Token","regular","🪙",0,{"Colosso de Pedra":0.03}],
 ["Undead Token","regular","🪙",0,{"Colosso de Pedra":0.03}],
 ["Vampire Coffin","regular","🏺",0,{"Vampiro":0.01,"Pirata Saqueador":0.01}],
 ["Vitality Token","regular","🪙",0,{"Azaroth, Arquidemônio":0.03}],
 ["Warrior Token","regular","🪙",500,{"Dragão":0.02}],
 ["White Stolen Present","regular","🎁",0,{}],
 ["Wisdom Token","regular","🪙",0,{"Conde Sanguinário":0.03}],
 ["Witch Broom","regular","🏺",0,{"Pirata Saqueador":0.01,"Guardião do Farol":0.01}],
 ["Yellow Stolen Present","regular","🎁",0,{}],
 ["Ankh","creature","🏺",100,{"Múmia":0.06}],
 ["Bat Wing","creature","🦇",250,{"Vampiro":0.06,"Espectro das Marés":0.06}],
 ["Blue Piece of Cloth","creature","🧵",500,{"Pirata Saqueador":0.06}],
 ["Broken Talisman","creature","🏺",0,{}],
 ["Celestial Powder","creature","⚗️",0,{"Rato":0.06,"Lobo":0.06}],
 ["Clover","creature","🍀",100,{}],
 ["Cobwebs","creature","🕸️",0,{"Aranha":0.06,"Aranha da Selva":0.06,"Espectro das Marés":0.06}],
 ["Coconut","creature","🍎",250,{"Demônio":0.06,"Caranguejo das Marés":0.06}],
 ["Comfy Saddle","creature","🏺",0,{"Troll":0.06}],
 ["Compass","creature","🏺",0,{}],
 ["Court Subpoena","creature","📜",0,{}],
 ["Cyclops Eye","creature","👁️",110,{"Troll":0.06,"Guardião do Farol":0.06}],
 ["Cyclops Hair","creature","👁️",110,{"Troll":0.06}],
 ["Dark Dragon Claw","creature","🦅",750,{"Dragão":0.06}],
 ["Dark Dragon Leather","creature","🟫",450,{"Dragão":0.06}],
 ["Darkness Essence","creature","⚗️",500,{"Esqueleto":0.06}],
 ["Demon Horn","creature","📯",550,{"Demônio":0.06}],
 ["Destroyer Piece of Cloth","creature","🧵",500,{"Vampiro":0.06,"Golem":0.06}],
 ["Dragon Claw","creature","🦅",500,{"Dragão":0.06}],
 ["Dragon Egg","creature","🥚",200,{"Dragão":0.06,"Demônio":0.06,"Serpente":0.06}],
 ["Dragon Leather","creature","🟫",100,{"Dragão":0.06}],
 ["Dry Dragon Bones","creature","💀",500,{"Dragão":0.06,"Esqueleto":0.06}],
 ["Dwarf Beard","creature","👁️",20,{"Guardião do Farol":0.06,"Orc Guerreiro":0.06,"Pirata Saqueador":0.06}],
 ["Dwarvin Skull","creature","💀",100,{"Orc Guerreiro":0.06,"Pirata Saqueador":0.06}],
 ["Elf Belt","creature","🏺",450,{"Orc Guerreiro":0.06,"Pirata Saqueador":0.06}],
 ["Elf Ear","creature","👁️",30,{"Orc Guerreiro":0.06,"Pirata Saqueador":0.06}],
 ["Elf Tiara","creature","🏺",50,{"Guardião do Farol":0.06,"Orc Guerreiro":0.06,"Pirata Saqueador":0.06}],
 ["Execution List","creature","📜",850,{"Esqueleto":0.06}],
 ["Explorer Map","creature","📜",350,{"Pirata Saqueador":0.06}],
 ["Eye","creature","👁️",900,{"Dragão":0.06,"Demônio":0.06}],
 ["Fancy Mirror","creature","🏺",500,{"Pirata Saqueador":0.06}],
 ["Four-Leaf Clover","creature","🍀",0,{}],
 ["Frozen Dragon Claw","creature","🦅",700,{"Dragão":0.06,"Espectro das Marés":0.06}],
 ["Frozen Dragon Leather","creature","🟫",350,{"Dragão":0.06,"Espectro das Marés":0.06}],
 ["Frozen Heart","creature","👁️",0,{}],
 ["Green Piece of Cloth","creature","🧵",500,{"Guardião do Farol":0.06}],
 ["Grim Reaper Hood","creature","🏺",400,{"Esqueleto":0.06}],
 ["Heavy Metal","creature","⚙️",0,{}],
 ["Hollow Bone","creature","💀",350,{"Esqueleto":0.06}],
 ["Hunter Quiver","creature","🏺",350,{"Pirata Saqueador":0.06}],
 ["Hydra Egg","creature","🥚",500,{"Serpente":0.06,"Serpente Esmeralda":0.06,"Espectro das Marés":0.06}],
 ["Key to the Castle","creature","🗝️",0,{}],
 ["Lumberjack Piece of Cloth","creature","🧵",50,{"Orc Guerreiro":0.06,"Pirata Saqueador":0.06}],
 ["Magic Sand Bag","creature","⚗️",850,{"Múmia":0.06,"Guardião do Farol":0.06}],
 ["Magic Sand Bottle","creature","⚗️",850,{"Múmia":0.06,"Guardião do Farol":0.06}],
 ["Message in Blood","creature","📜",0,{"Esqueleto":0.06}],
 ["Minotaur Horn","creature","📯",130,{"Troll":0.06}],
 ["Minotaur Skull","creature","💀",120,{"Troll":0.06}],
 ["Mysterious Artifact","creature","🏺",0,{"Troll":0.06}],
 ["Mystic Trinket","creature","🏺",500,{"Esqueleto":0.06}],
 ["Necromancy Witchcraft","creature","📜",250,{"Demônio":0.06,"Múmia":0.06,"Esqueleto":0.06}],
 ["Nose Ring","creature","🏺",300,{"Troll":0.06}],
 ["Orange Piece of Cloth","creature","🧵",500,{"Pirata Saqueador":0.06}],
 ["Orc Chain","creature","🏺",100,{"Orc":0.06,"Orc Guerreiro":0.06}],
 ["Orc Ear","creature","👁️",100,{"Orc":0.06,"Orc Guerreiro":0.06}],
 ["Orc Skin","creature","🟫",85,{"Orc":0.06,"Orc Guerreiro":0.06}],
 ["Orc Tiara","creature","🏺",100,{"Orc":0.06,"Orc Guerreiro":0.06,"Guardião do Farol":0.06}],
 ["Panther Doll","creature","🧸",0,{"Lobo":0.06}],
 ["Preserved Spider","creature","📦",0,{}],
 ["Purple Piece of Cloth","creature","🧵",500,{"Orc Guerreiro":0.06,"Pirata Saqueador":0.06}],
 ["Rat Tail","creature","🐀",20,{"Rato":0.06,"Rato Gigante":0.06}],
 ["Red Piece of Cloth","creature","🧵",500,{"Troll":0.06}],
 ["Remains of a Hydra","creature","📦",600,{"Serpente":0.06,"Serpente Esmeralda":0.06,"Espectro das Marés":0.06}],
 ["Rhino Doll","creature","🧸",0,{"Troll":0.06}],
 ["Ritual Scroll","creature","📜",0,{"Rato":0.06,"Lobo":0.06}],
 ["Rotten Dragon Egg","creature","🥚",500,{"Dragão":0.06,"Esqueleto":0.06}],
 ["Rotten Frozen Heart","creature","👁️",0,{}],
 ["Royal Dragon Claw","creature","🦅",600,{"Dragão":0.06}],
 ["Royal Dragon Leather","creature","🟫",200,{"Dragão":0.06}],
 ["Sabertooth Doll","creature","🧸",0,{"Lobo":0.06}],
 ["Scream in a Bottle","creature","⚗️",500,{"Esqueleto":0.06}],
 ["Scythe","creature","🏺",550,{"Esqueleto":0.06}],
 ["Snake Skin","creature","🟫",550,{"Serpente":0.06,"Serpente Esmeralda":0.06}],
 ["Spider Poison","creature","⚗️",250,{"Aranha":0.06,"Aranha da Selva":0.06,"Espectro das Marés":0.06}],
 ["The Judge Mask Piece","creature","🏺",850,{"Dragão":0.06,"Demônio":0.06}],
 ["Thunder Dragon Claw","creature","🦅",650,{"Dragão":0.06}],
 ["Thunder Dragon Leather","creature","🟫",250,{"Dragão":0.06}],
 ["Tiger Doll","creature","🧸",0,{"Lobo":0.06}],
 ["Turamak Beard","creature","👁️",0,{}],
 ["Turamak Charm","creature","🏺",0,{}],
 ["Turamak Cloth","creature","🧵",0,{}],
 ["Unfinished Test","creature","📜",0,{"Demônio":0.06,"Espectro das Marés":0.06}],
 ["Werewolf Tooth","creature","👁️",550,{"Lobo":0.06}],
 ["White Piece of Cloth","creature","🧵",500,{"Múmia":0.06,"Guardião do Farol":0.06,"Espectro das Marés":0.06}],
 ["Witch Finger","creature","👁️",750,{"Guardião do Farol":0.06,"Espectro das Marés":0.06}],
 ["Yellow Piece of Cloth","creature","🧵",500,{"Múmia":0.06}]];
// Magic Chests open with the Magic Key of the same tier: [chest, key, gold min/max, possible gear]. Listed gear not in the catalog yet (e.g. most amulets) is skipped when opening.
const WIKI_CHESTS=[
 ["Magic Chest Advanced","Magic Key Advanced",[800,4000],["Cape of the Skies","Cursed Headgear","Cursed Legs","Cursed Plate","Hat of the Skies","Instant Amulet","Instant Ring","Legs of the Skies","Piercing Amulet","Piercing Ring","Protection Amulet","Protection Ring","Shiny Spellbook","Shiver Amulet","Shiver Ring","Slash Amulet","Slash Ring","Warm Armor","Warm Helmet","Warm Legs"]],
 ["Magic Chest Amateur","Magic Key Amateur",[300,1500],["Gloom Armor","Gloom Helmet","Gloom Legs","Holy Spellbook","Ice Spellbook","Purple Cape","Purple Hat","Purple Legs","Ranged Headgear","Ranger Legs","Ranger Plate","Warrior Armor","Warrior Helmet","Warrior Legs"]],
 ["Magic Chest Apex","Magic Key Apex",[60000,250000],["Fiery Armor","Fiery Helmet","Fiery Legs","Holy Headgear","Holy Legs","Holy Plate","Luster Cape","Luster Hat","Luster Legs","Oblivion Spellbook"]],
 ["Magic Chest Beginner","Magic Key Beginner",[100,500],["Apprentice Spellbook","Dark Spellbook","Mystic Spellbook"]],
 ["Magic Chest Expert","Magic Key Expert",[4000,15000],["Aggressive Amulet","Aggressive Ring","Cape of Destruction","Focus Amulet","Focus Ring","Frost Spellbook","Guardian Amulet","Guardian Ring","Hat of Destruction","Legs of Destruction","Power Headgear","Power Legs","Power Plate","Snowflake Armor","Snowflake Helmet","Snowflake Legs","Soul Amulet","Soul Ring"]],
 ["Magic Chest Lord","Magic Key Lord",[15000,60000],["Cape of Inferno","Glassy Headgear","Glassy Legs","Glassy Plate","Hat of Inferno","Legs of Inferno","Relic Spellbook","Thrive Armor","Thrive Helmet","Thrive Legs"]],
 ["Magic Chest Master","Magic Key Master",[8000,30000],["Divine Cape","Divine Hat","Divine Legs","Grooved Armor","Grooved Boots","Grooved Helmet","Grooved Legs","Grooved Shield","Superior Armor","Superior Helmet","Superior Legs","Supremacy Spellbook","Supreme Headgear","Supreme Legs","Supreme Plate"]],
 ["Magic Chest Professional","Magic Key Professional",[2000,8000],["Cleric Spellbook","Dark Headgear","Dark Plate","Dark Ranger Legs","Demon Spellbook","Oriental Armor","Oriental Helmet","Oriental Legs","Spike Armor","Spike Helmet","Spike Legs","Witchcraft Spellbook","Wizard Cape","Wizard Hat","Wizard Legs"]],
 ["Magic Chest Warden","Magic Key Warden",[30000,120000],["Blaze Headgear","Blaze Legs","Blaze Plate","Flow Armor","Flow Helmet","Flow Legs","Nightfall Spellbook","Shiver Cape","Shiver Hat","Shiver Legs"]]];
const LOOT_ITEMS=WIKI_LOOT.map(([name,cat,ic,sell,drops])=>({name,cat,ic,sell,drops:{...drops},from:[...(WIKI_FROM[name]||[])]})),LOOT_BY_NAME=new Map(LOOT_ITEMS.map(x=>[x.name,x]));
const lootItem=n=>LOOT_BY_NAME.get(n)||null;
// Wiki loot a defeated monster drops (one of each at most); rnd() is injectable for tests.
function rollLootDrops(monster,rnd){const r=typeof rnd==="function"?rnd:Math.random;const out=[];for(const x of LOOT_ITEMS){const c=x.drops[monster];if(c&&r()<c)out.push(x.name)}return out}
const CHESTS=WIKI_CHESTS.map(([name,key,[min,max],items])=>({name,key,min,max,items:[...items]}));
const chestOf=n=>CHESTS.find(c=>c.name===n)||null;
// Chest contents: gold between min and max half of the time, otherwise one listed piece that exists in the catalog.
function chestPool(c){return c?c.items.filter(n=>WIKI_BY_NAME.has(n)):[]}
function chestRoll(c,rnd){const r=typeof rnd==="function"?rnd:Math.random;if(!c)return null;const pool=chestPool(c);
 if(!pool.length||r()<.5)return {gold:Math.round(c.min+(c.max-c.min)*r())};return {gear:pool[Math.min(pool.length-1,Math.floor(r()*pool.length))]}}
// Prison Key (no wiki page; only the Prison Warder drops it) opens the Prison Chest by itself, no chest item needed: 40% gold, 30% Large potions
// for the vocation (wiki Prison Warder potions; blended for Paladins) and 30% one wiki necklace or ring that exists in the gear catalog.
const PRISON_CHEST={name:"Baú da Prisão",key:"Prison Key",min:1000,max:5000,potMin:5,potMax:10,pots:{knight:"hp3",paladin:"bp1",sorcerer:"mp3",druid:"mp3"},
 items:["Scarf","Skull Bandana","Hawk Bandana","Cowboy Bandana","Crude Ring"]};
const prisonPot=voc=>PRISON_CHEST.pots[voc]||"hp3";
const prisonPool=()=>PRISON_CHEST.items.filter(n=>WIKI_BY_NAME.has(n));
function prisonRoll(voc,rnd){const r=typeof rnd==="function"?rnd:Math.random,C=PRISON_CHEST,a=r(),pool=prisonPool();
 if(a<.4||(a>=.7&&!pool.length))return {gold:Math.round(C.min+(C.max-C.min)*r())};
 if(a<.7)return {cons:prisonPot(voc),n:C.potMin+Math.min(C.potMax-C.potMin,Math.floor(r()*(C.potMax-C.potMin+1)))};
 return {gear:pool[Math.min(pool.length-1,Math.floor(r()*pool.length))]}}
// Equipment entries (drops stay in the catalog only, so saved copies stay small).
const gearCopy=({drops,from,noKit,...e})=>({...e,voc:[...e.voc],skill:{...e.skill},res:{...e.res},...(e.regen?{regen:{...e.regen}}:{}),...(e.dmg?{dmg:{...e.dmg}}:{}),...(e.wand?{wand:{...e.wand}}:{}),...(e.elMagic?{elMagic:{...e.elMagic}}:{})});
function shieldGear(){return SHIELDS.map(gearCopy)}
function meleeGear(){return MELEE.map(gearCopy)}
function distanceGear(){return DISTANCE.map(gearCopy)}
function wandGear(){return WANDS.map(gearCopy)}
function backpackGear(){return BACKPACKS.map(gearCopy)}
function helmetGear(){return HELMETS.map(gearCopy)}
function armorGear(){return ARMORS.map(gearCopy)}
function legsGear(){return LEGS.map(gearCopy)}
function bootsGear(){return BOOTS.map(gearCopy)}
// Older saves kept these wiki necklaces/rings as plain loot (before they were gear): turns each copy into a gear piece in the bag (depot loot into
// depot items), even past the bag capacity like trades, so nothing is lost. Returns how many pieces were converted.
function lootToGear(pl){let n=0;if(!pl||typeof pl!=="object")return 0;
 const move=(loot,items)=>{if(!loot||typeof loot!=="object")return;for(const e of [...AMULETS,...RINGS]){const c=Math.min(1000,Math.floor(Number(loot[e.name])||0));if(!(e.name in loot))continue;delete loot[e.name];for(let i=0;i<c;i++){items.push(gearCopy(e));n++}}};
 move(pl.loot,pl.bag??=[]);if(pl.depot&&typeof pl.depot==="object")move(pl.depot.loot,pl.depot.items??=[]);return n}
function amuletGear(){return AMULETS.map(gearCopy)}
function ringGear(){return RINGS.map(gearCopy)}
// Catalog entry of any wiki gear piece (shields, spellbooks and melee weapons) by name.
const shieldByName=n=>WIKI_BY_NAME.get(n)||null;
// Base stats of a worn piece: wiki shields always use the catalog numbers, so a stale or edited saved copy cannot change them.
function gearStat(e,k){if(!e)return 0;const s=shieldByName(e.name);return Number((s||e)[k])||0}
const RES_CAP=50,SKILL_KEYS=["sword","distance","magic","shielding"],RES_KEYS=["phys","fire","ice","energy","earth","death","holy"];
// Bonuses come from the catalog by item name, never from numbers stored in a save.
function equipBonus(equip){const out={skill:{},res:{}};
 for(const it of Object.values(equip||{})){const s=it&&shieldByName(it.name);if(!s)continue;
  for(const k in s.skill)out.skill[k]=(out.skill[k]||0)+s.skill[k];for(const k in s.res)out.res[k]=Math.min(RES_CAP,(out.res[k]||0)+s.res[k]);if(s.speed)out.speed=(out.speed||0)+s.speed;if(s.elMagic){out.elMagic??={};for(const k in s.elMagic)out.elMagic[k]=(out.elMagic[k]||0)+s.elMagic[k]}}
 return out}
// Regeneration rules of a charged piece, always from the catalog by name (null for ordinary gear).
function regenOf(e){const s=e&&shieldByName(e.name);return s&&s.regen?s.regen:null}
// Remaining charge in seconds (null for gear without charge); a copy without a saved charge is a fresh, full pair.
function chargeOf(e){const r=regenOf(e);if(!r)return null;if(e.charge===undefined||e.charge===null)return r.full;const c=Number(e.charge);return Number.isFinite(c)?Math.max(0,Math.min(r.full,c)):0}
// One game tick of the worn boots: drains up to dt seconds of charge and returns the life/mana regenerated in that time, or null when nothing applies.
function bootsRegen(equip,dt){const e=equip&&equip.Botas,c=chargeOf(e);if(c===null||c<=0)return null;const r=regenOf(e),t=Math.max(0,Math.min(Number(dt)||0,c));
 e.charge=c-t;return {hp:r.hp*t/r.every,mp:r.mp*t/r.every,left:e.charge,emptied:e.charge<=0}}
// Charged pieces the player carries (worn first, then the backpack), for the recharge NPC.
function chargedOwned(player){const out=[],w=player&&player.equip&&player.equip.Botas;if(chargeOf(w)!==null)out.push({e:w,worn:true});
 for(const e of (player&&player.bag)||[])if(chargeOf(e)!==null)out.push({e,worn:false});return out}
// Recharges one carried pair to full for its catalog gold price; never charges when the pair is already full or gold is short.
function rechargeBoots(player,e){const r=regenOf(e);if(!r)return {error:"Este item não tem carga."};
 if(!chargedOwned(player).some(x=>x.e===e))return {error:"As botas precisam estar com você."};
 if(chargeOf(e)>=r.full)return {error:"Essas botas já estão com a carga cheia."};
 if((Number(player.gold)||0)<r.price)return {error:`Você precisa de ${r.price.toLocaleString("pt-BR")} 🪙 para recarregar.`};
 player.gold-=r.price;e.charge=r.full;return {ok:true,price:r.price}}
function chargeText(e){const c=chargeOf(e);if(c===null)return "";if(c<=0)return "Sem carga — recarregue com Selene";const m=Math.ceil(c/60);return `Carga ${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}min`}
// Damage after a resistance percentage; any hit still deals at least 1.
function resistHit(dmg,pct){const d=Number(dmg)||0;if(d<=0)return 0;const r=Math.min(RES_CAP,Math.max(0,Number(pct)||0));return Math.max(1,Math.round(d*(1-r/100)))}
// Shot of the worn wand from the catalog ({name,mp,min,max,el,atk}) or null; mana per shot and damage never come from a save.
function wandShot(equip){const w=equip&&equip.Arma&&shieldByName(equip.Arma.name);return w&&w.wand?{name:w.name,atk:w.atk,...w.wand}:null}
// Damage of one wand shot between min and max; rnd 0..1 is injectable for tests.
function wandRoll(w,rnd){if(!w)return 0;const r=typeof rnd==="number"?Math.min(1,Math.max(0,rnd)):Math.random();return Math.round(w.min+(w.max-w.min)*r)}
// Spaces the bag holds: BAG_BASE (pockets only) without a backpack, otherwise exactly the worn wiki backpack slots.
const BAG_BASE=5;
function bagCapacity(equip){const b=equip&&equip.Mochila&&shieldByName(equip.Mochila.name);return b&&b.slots||BAG_BASE}
// Element of each monster's basic hit (default physical).
const MONSTER_HIT_EL={"Dragão":"fire","Demônio":"fire","Golem":"energy","Guardião do Farol":"energy","Esqueleto":"death","Múmia":"death","Vampiro":"death",
 "Aranha":"earth","Serpente":"earth","Escorpião":"earth","Lagarto":"earth","Serpente Esmeralda":"earth","Aranha da Selva":"earth","Espectro das Marés":"ice"};
const hitElement=name=>MONSTER_HIT_EL[name]||"phys";
// Shields a defeated monster drops; rnd() is injectable for tests.
function rollShieldDrops(monster,rnd){const r=typeof rnd==="function"?rnd:Math.random;const out=[];
 for(const s of WIKI_GEAR){const c=s.drops[monster];if(c&&r()<c)out.push(s.name)}return out}
// Damage split of the worn weapon in percent per element: plain weapons {phys:100}, enchanted ones {fire:85,phys:20}.
function damageMix(equip){const w=equip&&equip.Arma&&shieldByName(equip.Arma.name);return w&&w.dmg?{...w.dmg}:{phys:100}}
const mixPct=mix=>Object.values(mix||{}).reduce((n,v)=>n+v,0)||100;
// Element shown for a hit: the enchantment when there is one, otherwise physical.
function mainElement(mix){let best="phys",n=-1;for(const [k,v] of Object.entries(mix||{}))if(k!=="phys"&&v>n){best=k;n=v}return best}
// Total basic-attack damage with the weapon split (85% + 20% = 105% of the hit).
function mixTotal(dmg,mix){return Math.max(1,Math.round((Number(dmg)||0)*mixPct(mix)/100))}
// Only known elements with 0..100% each; anything else (e.g. a forged broadcast) falls back to null.
function sanitizeMix(mix){if(!mix||typeof mix!=="object"||Array.isArray(mix))return null;const out={};let n=0;
 for(const [k,v] of Object.entries(mix)){const x=Number(v);if(!RES_KEYS.includes(k)||!Number.isFinite(x)||x<0||x>100||++n>2)return null;out[k]=x}return n?out:null}
// Resistances applied to each element part of a hit in its share; any hit still deals at least 1.
function mixedResist(dmg,mix,resOf){const d=Number(dmg)||0;if(d<=0)return 0;const m=sanitizeMix(mix)||{phys:100},tot=mixPct(m);let sum=0;
 for(const [k,v] of Object.entries(m)){const part=d*v/tot,r=Math.min(RES_CAP,Math.max(0,Number(typeof resOf==="function"?resOf(k):0)||0));sum+=part*(1-r/100)}
 return Math.max(1,Math.round(sum))}
// Two-handed weapons (wiki "Two Handed: Yes") cannot be worn together with a shield.
const isTwoHanded=e=>!!(e&&shieldByName(e.name)?.two);
// Slot that must be freed before wearing it, or null.
function handConflict(equip,it){const q=equip||{};if(!it)return null;
 if(it.slot==="Arma"&&isTwoHanded(it)&&q.Escudo)return "Escudo";
 if(it.slot==="Escudo"&&q.Arma&&isTwoHanded(q.Arma))return "Arma";return null}
// Older saves wearing a two-handed weapon and a shield move the shield to the bag; returns the moved piece or null.
function fixTwoHanded(pl){const q=pl&&pl.equip;if(!q||!isTwoHanded(q.Arma)||!q.Escudo)return null;const s=q.Escudo;delete q.Escudo;(pl.bag??=[]).push(s);return s}
// Reason the player cannot equip a piece of gear, or "" when allowed. GMs skip both checks.
function canEquip(e,player,gm){if(!e)return "Item desconhecido.";if(gm)return "";
 if((player&&player.level||1)<(e.lvl||1))return `Precisa do nível ${e.lvl} para usar ${e.name}.`;
 if(Array.isArray(e.voc)&&e.voc.length&&!e.voc.includes(player&&player.voc))return `${e.name} só pode ser usado por ${e.voc.map(v=>VOC_NAME[v]||v).join(", ")}.`;
 return ""}
const RES_NAME={phys:"Físico",fire:"Fogo",ice:"Gelo",energy:"Energia",earth:"Terra",death:"Morte",holy:"Sagrado"};
const SKILL_NAME={shielding:"Defesa",magic:"Magia",sword:"Espada",distance:"Distância"};
function bonusText(e){const s=e&&shieldByName(e.name);if(!s)return [];const mix=s.dmg&&!s.wand&&mainElement(s.dmg)!=="phys"?s.dmg:null;
 return [...Object.entries(s.skill).map(([k,v])=>`${SKILL_NAME[k]||k} +${v}`),...Object.entries(s.res).map(([k,v])=>`${RES_NAME[k]||k} ${v}%`),
  ...Object.entries(s.elMagic||{}).map(([k,v])=>`Magia +${v} em magias e runas de ${RES_NAME[k]||k}`),
  ...(s.wand?[`Dano ${s.wand.min}-${s.wand.max} de ${RES_NAME[s.wand.el]||s.wand.el}`,`${s.wand.mp} de mana por tiro`]:[]),...(s.slots?[`+${s.slots} espaços na mochila`]:[]),
  ...(s.speed?[`Velocidade +${s.speed}`]:[]),...(s.regen?[`Regenera +${s.regen.hp} vida e +${s.regen.mp} mana a cada ${s.regen.every}s enquanto tiver carga (${s.regen.full/3600}h de uso)`]:[]),...(mix?[Object.entries(mix).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${v}% ${RES_NAME[k]||k}`).join(" + ")]:[]),...(s.two?["Duas mãos (sem escudo)"]:[])]}
function shieldSource(e){const s=e&&shieldByName(e.name);if(!s)return "";const fmt=n=>n.toLocaleString("pt-BR");
 const by=Object.keys(s.drops);return [s.shop?`Ferreiro · ${fmt(s.price)} 🪙`:"",by.length?`Drop raro: ${by.join(", ")}`:"",s.from&&s.from.length?`Drop: ${s.from.join(", ")}`:"",(c=>c.length?`Baú: ${c.join(", ")}`:"")(CHESTS.filter(c=>c.items.includes(s.name)).map(c=>c.name)),s.regen?`Recarga com Selene · ${fmt(s.regen.price)} 🪙`:""].filter(Boolean).join(" · ")}
// Tiered gear (Nv 1 Aprendiz … Nv 100 Lenda: weapons, armor, helmets, legs, boots, rings, tier shields, necklaces, backpacks) was removed.
// The entries stay in the equipment array only so GM item indices keep pointing at the same shields; players never get or keep them.
const RETIRED_MATERIALS=["Aprendiz","Bronze","Ferro","Aço","Prata","Mithril","Runas","Dragão","Titã","Abismo","Lenda"];
const RETIRED_RE=new RegExp(` de (${RETIRED_MATERIALS.join("|")})$`);
function isRetired(e){if(!e||typeof e!=="object"||shieldByName(e.name))return false;return typeof e.tier==="number"||RETIRED_RE.test(String(e.name||""))}
// Removes retired gear from what the character wears, carries and stores; returns how many pieces were removed (no refund).
function purgeRetired(pl){let n=0;if(!pl||typeof pl!=="object")return 0;const keep=e=>{if(isRetired(e)){n++;return false}return true};
 if(Array.isArray(pl.bag))pl.bag=pl.bag.filter(keep);
 if(pl.depot&&Array.isArray(pl.depot.items))pl.depot.items=pl.depot.items.filter(keep);
 if(pl.equip&&typeof pl.equip==="object")for(const k of Object.keys(pl.equip))if(isRetired(pl.equip[k])){delete pl.equip[k];n++}
 return n}
const smithSellPrice=e=>{const s=e&&shieldByName(e.name);return s?s.sell:Math.floor(((e&&e.price)||0)/2)};
// Consumables. legacy items are the original potions kept in p.hpPot / p.mpPot.
const C=(id,cat,ic,nm,price,q,lvl,x)=>Object.assign({id,cat,ic,nm,price,q,lvl},x||{});
const CONSUMABLES=[
 C("hp","health","❤️","Small Health Potion",40,1,0,{hp:85,legacy:true,img:"/__l5e/assets-v1/e5b1d42c-be9c-401b-a09b-58e29af1511e/small-health-potion.png"}),
 C("hp2","health","🍷","Medium Health Potion",110,1,50,{hp:160,voc:["knight","paladin"],img:"/__l5e/assets-v1/572553a8-dca8-4ebc-af39-2c1c37248af7/medium-health-potion.png"}),
 C("hp3","health","🍒","Large Health Potion",220,1,85,{hp:300,voc:["knight"],img:"/__l5e/assets-v1/459df24a-3a30-405e-9a59-b46aba312b58/large-health-potion.png"}),
 C("hp4","health","💗","Ultra Health Potion",350,1,130,{hp:500,voc:["knight"],img:"/__l5e/assets-v1/e13f87db-0a46-4140-a074-157513ce8a72/ultra-health-potion.png"}),
 C("hp5","health","♥️","Extreme Health Potion",500,1,200,{hp:800,voc:["knight"],img:"/__l5e/assets-v1/1f59ed28-a6b0-4266-85ee-fed78deb28ae/extreme-health-potion.png"}),
 C("mp","mana","💧","Small Mana Potion",50,1,0,{mp:64,legacy:true,img:"/__l5e/assets-v1/18076dc1-5dd9-4d71-a0ff-2cf489bde3b1/small-mana-potion.png"}),
 C("mp2","mana","🔵","Medium Mana Potion",100,1,50,{mp:120,voc:["sorcerer","druid","paladin"],img:"/__l5e/assets-v1/63127339-5c9d-4872-a305-e90299208392/medium-mana-potion.png"}),
 C("mp3","mana","🫐","Large Mana Potion",150,1,85,{mp:220,voc:["sorcerer","druid","paladin"],img:"/__l5e/assets-v1/1d906f4b-4c03-4748-bb70-da9d6422a84e/large-mana-potion.png"}),
 C("mp4","mana","🌀","Advanced Mana Potion",95,1,85,{mp:150,voc:["knight"],img:"/__l5e/assets-v1/e14b4623-dc04-4463-b2e5-767fc0881d8f/advanced-mana-potion.png"}),
 C("mp5","mana","🌊","Ultra Mana Potion",445,1,130,{mp:400,voc:["sorcerer","druid"],img:"/__l5e/assets-v1/dd0001fc-6540-4a64-90da-7c7d21da5242/ultra-mana-potion.png"}),
// Wiki runes (lawlmmorpg.com/wiki/items/Rune), in wiki order; older rune ids keep their saved counts under the wiki names.
 C("rmissile","rune","⚡","Energy Blast",12,1,1,{rune:"hit",el:"energy",base:15,lk:.3,mk:2,r:7}),
 C("rearthblast","rune","🪨","Earth Blast",12,1,1,{rune:"hit",el:"earth",base:15,lk:.3,mk:2,r:7}),
 C("rfireblast","rune","☄️","Fire Blast",12,1,1,{rune:"hit",el:"fire",base:15,lk:.3,mk:2,r:7}),
 C("riceblast","rune","🧊","Ice Blast",12,1,1,{rune:"hit",el:"ice",base:15,lk:.3,mk:2,r:7}),
 C("renergyball","rune","🟣","Energy Ball",57,1,25,{rune:"area",el:"energy",base:30,lk:.6,mk:3,r:7}),
 C("rearthball","rune","🟢","Earth Ball",57,1,25,{rune:"area",el:"earth",base:30,lk:.6,mk:3,r:7}),
 C("rfire","rune","🔥","Fire Ball",57,1,25,{rune:"area",el:"fire",base:30,lk:.6,mk:3,r:7}),
 C("riceball","rune","🔵","Ice Ball",57,1,25,{rune:"area",el:"ice",base:30,lk:.6,mk:3,r:7}),
 C("rblast","rune","💥","Outbreak",31,1,30,{rune:"area",el:"phys",base:35,lk:.7,mk:3.5,r:7,rad:2,voc:["sorcerer","druid"]}),
 C("rdeath","rune","💀","Spirit of Doom",135,1,45,{rune:"hit",el:"death",base:120,lk:1.5,mk:8,r:7,voc:["sorcerer","druid","paladin"]}),
 C("rheal1","rune","💚","Life Healing",35,1,0,{rune:"heal",base:60,lk:1.5,mk:4}),
 C("rpara","rune","🕸️","Paralyze",700,1,60,{rune:"para",dur:5,r:7}),
 C("rfield","rune","✨","Magic Field",80,1,40,{rune:"field",el:"energy",base:12,lk:.25,mk:1.5,r:7,dur:8,every:1}),
 // Retired: not in the wiki. Hidden from shops and lists, but saved copies stay usable.
 C("rheal2","rune","💖","Runa de Cura Intensa",95,1,15,{rune:"heal",base:120,lk:2.5,mk:7,retired:true}),
 // Wiki blended potions (lawlmmorpg.com/wiki/items/Blended): health and mana in one drink, Paladin only.
 C("bp1","blended","🧪","Large Blended Potion",235,1,85,{hp:250,mp:150,voc:["paladin"]}),
 C("bp2","blended","⚗️","Ultra Blended Potion",445,1,130,{hp:420,mp:300,voc:["paladin"]}),
 // Wiki ammunition (lawlmmorpg.com/wiki/items/Ammunition): wiki Attack = bonus per shot, store price = wiki price per unit × 100. Arrows need a bow, bolts a crossbow.
 // Explosive Arrow and Flare Bolt (low attack) also hit around the target; Explosive Arrow is not sold on the wiki, its price here is set between Hunting Arrow and Flash Arrow.
 // el = element of the ammo's bonus part (Flash energy, Cursed death, Explosive/Flare fire); drops = {monster:[chance,min,max]} mapped from the wiki "Loot of" to the game's monsters.
 C("arrow","ammo","🏹","Arrow",200,100,1,{bonus:9,ammo:"arrow",voc:["paladin"],drops:{"Orc":[.12,3,10],"Orc Guerreiro":[.12,4,12]}}),
 C("huntarrow","ammo","🎯","Hunting Arrow",600,100,10,{bonus:11,ammo:"arrow",voc:["paladin"]}),
 C("bolt","ammo","🔩","Bolt",400,100,20,{bonus:10,ammo:"bolt",voc:["paladin"]}),
 C("explarrow","ammo","💥","Explosive Arrow",1000,100,25,{bonus:4,burst:1,el:"fire",ammo:"arrow",voc:["paladin"],drops:{"Dragão":[.06,2,6],"Hydra do Pântano":[.06,2,6]}}),
 C("heavybolt","ammo","🔨","Heavy Bolt",1200,100,50,{bonus:11,ammo:"bolt",voc:["paladin"]}),
 C("flasharrow","ammo","⚡","Flash Arrow",2000,100,90,{bonus:12,el:"energy",ammo:"arrow",voc:["paladin"]}),
 C("cursedbolt","ammo","☠️","Cursed Bolt",6000,100,100,{bonus:14,el:"death",ammo:"bolt",voc:["paladin"],drops:{"Demônio":[.06,3,8],"Colosso de Pedra":[.04,2,6]}}),
 C("flarebolt","ammo","🔥","Flare Bolt",6500,100,150,{bonus:5,burst:1,el:"fire",ammo:"bolt",voc:["paladin"]}),
 // Retired: not in the wiki. Hidden from shops and lists, but saved copies stay usable.
 C("firearrow","ammo","🔥","Flecha de Fogo",600,100,20,{bonus:5,burst:1,voc:["paladin"],retired:true}),
 C("sniper","ammo","🎯","Flecha Sniper",900,100,40,{bonus:8,voc:["paladin"],retired:true}),
 C("dart","ammo","🗡️","Dardo",400,50,10,{bonus:6,voc:["paladin"],retired:true}),
 C("spear","ammo","🔱","Lança",250,10,25,{bonus:12,voc:["paladin"],retired:true}),
 C("bread","regular","🍞","Pão",20,10,1,{food:40}),
 C("ham","regular","🍖","Presunto",40,5,1,{food:100}),
 C("scroll","regular","📜","Pergaminho do Templo",200,1,1,{temple:true})];
const byId=id=>CONSUMABLES.find(c=>c.id===id)||null;
const ofCategory=cat=>CONSUMABLES.filter(c=>c.cat===cat&&!c.retired);
const icon=it=>it&&it.img?`<img class="item-icon" src="${it.img}" alt="" decoding="async" draggable="false">`:(it&&it.ic||"📦");
const VOC_NAME={knight:"Knight",paladin:"Paladin",sorcerer:"Sorcerer",druid:"Druid"};
// Returns a reason string when the player cannot use the item, or "" when allowed. GMs skip level/vocation limits.
function canUse(it,player,gm){if(!it)return "Item desconhecido.";if(gm)return "";
 if((player&&player.level||1)<it.lvl)return `Precisa do nível ${it.lvl} para usar ${it.nm}.`;
 if(it.voc&&!it.voc.includes(player&&player.voc))return `${it.nm} só pode ser usado por ${it.voc.map(v=>VOC_NAME[v]||v).join(", ")}.`;
 return ""}
// Wiki arrows only fire from bows and bolts only from crossbows (two-handed distance weapons); older ammo and conjured ammo fit any distance weapon.
function ammoFits(it,equip){if(!it||!it.ammo)return true;const w=equip&&equip.Arma&&shieldByName(equip.Arma.name);if(!w||!w.voc.includes("paladin"))return false;return it.ammo==="bolt"?!!w.two:!w.two}
// Ammo dropped by a monster: [{id,nm,n}] with n between the catalog min and max (rnd is called once for the chance and once for the amount).
function rollAmmoDrops(monster,rnd){const r=typeof rnd==="function"?rnd:Math.random,out=[];
 for(const c of CONSUMABLES){const d=c.cat==="ammo"&&!c.retired&&c.drops&&c.drops[monster];if(!d||!(r()<d[0]))continue;
  out.push({id:c.id,nm:c.nm,n:d[1]+Math.min(d[2]-d[1],Math.floor(r()*(d[2]-d[1]+1)))})}return out}
const ammoByName=nm=>CONSUMABLES.find(c=>c.cat==="ammo"&&c.nm===nm)||null;
// Weapon split with the ammo's elemental bonus: the bonus share of the hit moves to the ammo element, the total percent stays the same.
function ammoMix(mix,total,bonus,el){const base=mix&&Object.keys(mix).length?mix:{phys:100};if(!el||!(bonus>0)||!(total>0))return {...base};
 const P=mixPct(base),f=Math.min(1,bonus/total),out={};for(const [k,v] of Object.entries(base))out[k]=Math.round(v*(1-f));
 out[el]=(out[el]||0)+Math.round(P*f);const diff=P-Object.values(out).reduce((n,v)=>n+v,0);out[el]+=diff;for(const k in out)if(out[k]<=0)delete out[k];return out}
// Rune strength grows with character level and magic level; rnd 0..1 spreads it ±15%.
function runePower(it,level,ml,rnd){const r=typeof rnd==="number"?Math.min(1,Math.max(0,rnd)):.5;
 return Math.max(1,Math.round(((it.base||0)+(level||1)*(it.lk||0)+(ml||0)*(it.mk||0))*(.85+.3*r)))}
const EL_NAME={energy:"energia",fire:"fogo",phys:"físico",death:"morte",ice:"gelo",earth:"terra"};
// Squares a rune hits around the target: 3×3 by default, rad 2 = 5×5 without the corners; fields cover 3×3.
function runeCells(it,x,y){const r=it&&it.rad||1,out=[];for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(r>1&&Math.abs(dx)===r&&Math.abs(dy)===r)continue;out.push([x+dx,y+dy])}return out}
function describe(it){if(!it)return "";
 if(it.hp&&it.mp)return `Recupera ${it.hp} de vida e ${it.mp} de mana.`;
 if(it.hp)return `Recupera ${it.hp} de vida.`;if(it.mp)return `Recupera ${it.mp} de mana.`;
 if(it.rune==="heal")return "Cura você; fica mais forte com nível e magia.";
 if(it.rune==="hit")return `Dano de ${EL_NAME[it.el]||it.el} no alvo (até ${it.r} SQM).`;
 if(it.rune==="area")return `Dano de ${EL_NAME[it.el]||it.el} em área ${it.rad>1?"grande (5×5)":"3×3"} ao redor do alvo.`;
 if(it.rune==="field")return `Cria um campo de ${EL_NAME[it.el]||it.el} 3×3 no alvo por ${it.dur}s; fere a cada ${it.every}s quem estiver nele.`;
 if(it.rune==="para")return `Paralisa o alvo por ${it.dur}s.`;
 if(it.bonus)return `+${it.bonus} de dano${it.el?` de ${EL_NAME[it.el]||it.el}`:""} por ataque${it.burst?` e atinge quem está ao lado do alvo${it.el?` (${EL_NAME[it.el]||it.el})`:""}`:""}. Só Paladin${it.ammo==="bolt"?", com besta":it.ammo==="arrow"?", com arco":""}.`;
 if(it.food)return `Comida: recupera ${it.food} de vida.`;
 if(it.temple)return "Leva você ao templo de Lawl (fora de combate).";
 return ""}
// Sanitizes the saved consumables map: known non-legacy ids with whole positive counts only.
function normalizeCons(c){const out={};if(!c||typeof c!=="object"||Array.isArray(c))return out;
 for(const [k,v] of Object.entries(c)){const it=byId(k),n=Math.floor(Number(v));if(it&&!it.legacy&&Number.isFinite(n)&&n>0)out[k]=Math.min(n,100000)}return out}
// The two HUD potion buttons (Vida bottom-left / Mana top-right) each hold one chosen potion id; defaults are the original potions.
// Seconds every potion waits after another one (Lawl/Tibia potion exhaust), shared by health and mana potions.
const POTION_DELAY=1;
// Tempo de treino vendido pela Treinadora: 1 hora por ouro ou por gemas (mesmos valores do Lawl).
const TRAIN_PACKS=[{k:"t60g",secs:3600,cur:"gold",price:1200000},{k:"t60d",secs:3600,cur:"gems",price:60}];
function buyTraining(p,k){const pk=TRAIN_PACKS.find(x=>x.k===k);if(!p||!pk)return {ok:false,reason:"pack"};
 const have=Number(p[pk.cur])||0;if(have<pk.price)return {ok:false,reason:pk.cur};
 p[pk.cur]=have-pk.price;p.trainTime=(Number(p.trainTime)||0)+pk.secs;return {ok:true,pack:pk}}
const POTION_CATS=["health","mana","blended"];
const isPotion=it=>!!it&&POTION_CATS.includes(it.cat);
const potions=()=>CONSUMABLES.filter(isPotion);
function normalizePotSlots(v){const o=v&&typeof v==="object"&&!Array.isArray(v)?v:{};const pick=(k,d)=>isPotion(byId(o[k]))?o[k]:d;return {hp:pick("hp","hp"),mp:pick("mp","mp")}}
function potionCount(it,player){if(!it||!player)return 0;if(it.legacy)return it.id==="hp"?(player.hpPot||0):it.id==="mp"?(player.mpPot||0):0;return (player.cons&&player.cons[it.id])||0}
// Two HUD rune buttons hold a chosen rune id each (or null); runeList shows wiki runes plus retired ones the player still owns.
const RUNE_SLOT_N=2;
function normalizeRuneSlots(v){const a=Array.isArray(v)?v:[];return Array.from({length:RUNE_SLOT_N},(_,i)=>{const it=byId(a[i]);return it&&it.cat==="rune"?it.id:null})}
function runeCount(it,player){return (it&&player&&player.cons&&player.cons[it.id])||0}
function runeList(player){const own=(player&&player.cons)||{};return CONSUMABLES.filter(c=>c.cat==="rune"&&(!c.retired||own[c.id]>0))}
// Starter kit: for each gear slot the vocation can wear at level 1, the weakest active piece of the given catalog (lowest total bonus,
// then price, then catalog order), so gear added in future updates joins the kit automatically. A two-handed weapon drops the shield.
function gearPower(e){const s=shieldByName(e&&e.name)||e||{},sum=o=>Object.values(o||{}).reduce((n,v)=>n+(Number(v)||0),0);
 return ["atk","def","hp","mp","slots","speed"].reduce((n,k)=>n+(Number(s[k])||0),0)+sum(s.skill)+sum(s.res)+sum(s.elMagic)}
function starterKit(voc,catalog){const list=Array.isArray(catalog)?catalog:WIKI_GEAR,best={};
 list.forEach((e,i)=>{if(!e||!e.slot||isRetired(e)||(shieldByName(e.name)||e).noKit||(Number(e.lvl)||0)>1||!Array.isArray(e.voc)||!e.voc.includes(voc))return;
  const k=[gearPower(e),Number(e.price)||0,i],b=best[e.slot];if(!b||k[0]<b.k[0]||(k[0]===b.k[0]&&(k[1]<b.k[1]||(k[1]===b.k[1]&&k[2]<b.k[2]))))best[e.slot]={e,k}});
 const kit={};for(const [slot,{e}] of Object.entries(best))kit[slot]=gearCopy(e);
 if(handConflict({Arma:kit.Arma},kit.Escudo))delete kit.Escudo;return kit}
// Every cell of the Mochila tab takes one space: each gear piece and each potion/consumable stack (loot has its own bag).
function bagUsed(pl){if(!pl)return 0;let n=(Array.isArray(pl.bag)?pl.bag.length:0)+((Number(pl.hpPot)||0)>0?1:0)+((Number(pl.mpPot)||0)>0?1:0);
 for(const [id,c] of Object.entries(pl.cons||{}))if(byId(id)&&c>0)n++;return n}
// New spaces an addition needs: gear pieces plus stacks the player does not hold yet ({gear:n, hpPot, mpPot, cons:{id:n}}).
function bagNeed(pl,add){const a=add||{},have=(pl&&pl.cons)||{};let n=Math.max(0,Math.floor(Number(a.gear)||0));
 if(a.hpPot>0&&!((pl&&pl.hpPot)>0))n++;if(a.mpPot>0&&!((pl&&pl.mpPot)>0))n++;
 for(const [id,v] of Object.entries(a.cons||{}))if(v>0&&byId(id)&&!(have[id]>0))n++;return n}
// Characters made before starter kits get the weakest backpack once (flag kitBag), only if they own none worn, in the bag or in the depot.
function grantStarterBag(pl){if(!pl||pl.kitBag)return null;pl.kitBag=1;const isBp=e=>e&&e.slot==="Mochila";
 if(isBp(pl.equip&&pl.equip.Mochila)||(pl.bag||[]).some(isBp)||((pl.depot&&pl.depot.items)||[]).some(isBp))return null;
 const bp=starterKit(pl.voc,BACKPACKS).Mochila;if(!bp)return null;(pl.equip??={}).Mochila=bp;return bp}
root.LawlItems={TRAIN_PACKS,buyTraining,lootToGear,AMULETS,RINGS,amuletGear,ringGear,PRISON_CHEST,prisonPot,prisonPool,prisonRoll,CHARGED_BOOTS,regenOf,chargeOf,bootsRegen,chargedOwned,rechargeBoots,chargeText,LOOT_ITEMS,rollAmmoDrops,ammoByName,ammoMix,EL_NAME,lootItem,rollLootDrops,CHESTS,chestOf,chestPool,chestRoll,ammoFits,HELMETS,ARMORS,LEGS,BOOTS,helmetGear,armorGear,legsGear,bootsGear,starterKit,gearPower,bagUsed,bagNeed,grantStarterBag,MELEE,meleeGear,DISTANCE,distanceGear,WANDS,wandGear,BACKPACKS,backpackGear,wandShot,wandRoll,BAG_BASE,bagCapacity,WIKI_GEAR,damageMix,mainElement,mixTotal,sanitizeMix,mixedResist,isTwoHanded,handConflict,fixTwoHanded,POTION_DELAY,CATEGORIES,GEAR_CATS,SLOT_CAT,WEAPON_CAT,gearCategory,extraGear,CONSUMABLES,byId,ofCategory,icon,canUse,runePower,runeCells,describe,normalizeCons,VOC_NAME,SHIELDS,shieldGear,shieldByName,equipBonus,resistHit,hitElement,rollShieldDrops,canEquip,bonusText,shieldSource,smithSellPrice,RES_NAME,RES_CAP,RETIRED_MATERIALS,isRetired,purgeRetired,gearStat,POTION_CATS,isPotion,potions,normalizePotSlots,potionCount,RUNE_SLOT_N,normalizeRuneSlots,runeCount,runeList};
})(typeof window!=="undefined"?window:globalThis);

/* Browser-safe Tibia instant spells for Knight, Paladin, Sorcerer and Druid (Monk intentionally absent).
   Catalog + pure helpers (formulas, areas, cooldown groups, elements). The game executes each spell kind. */
(function(root){
"use strict";
const VOC={k:"knight",p:"paladin",s:"sorcerer",d:"druid"};
// Tibia exhaustion groups: attack 2s, healing 1s, support 2s. Secondary groups share extra cooldowns.
const GROUP_CD={atk:2,heal:1,sup:2};
const GROUP2_CD={focus:4,special:8,ultimate:30,beams:6,bursts:22,crippling:6,party:2};
const EL={phys:{n:"Físico",c:[236,236,255],ic:"⚔️"},fire:{n:"Fogo",c:[255,122,44],ic:"🔥"},ice:{n:"Gelo",c:[110,200,255],ic:"❄️"},
 energy:{n:"Energia",c:[190,120,255],ic:"⚡"},earth:{n:"Terra",c:[120,210,80],ic:"🌿"},death:{n:"Morte",c:[150,40,60],ic:"💀"},
 holy:{n:"Sagrado",c:[255,226,120],ic:"✨"},heal:{n:"Cura",c:[98,200,93],ic:"💚"}};
// Elemental resistances: multiplier of damage taken (0 = imune, <1 = resistente, >1 = fraco); missing element = 1.
// Values come from the closest lawlmmorpg.com/wiki monster (Resistances, e.g. Demon "Fire 0%, Ice 115%"); elements the wiki leaves out
// keep the older Tibia-like values, and holy (not in the wiki) stays as before. Bosses use their base monster.
const RESIST={
 "Dragão":{phys:1.15,energy:1.1,fire:0,ice:1.15,earth:.8},                                  // Dragon
 "Demônio":{phys:1.04,death:.9,fire:0,ice:1.15,holy:1.12,energy:1.1},                       // Demon
 "Esqueleto":{death:0,holy:1.25,earth:0},"Múmia":{death:0,holy:1.25,fire:1.1,earth:0},      // Skeleton/Mummy: no wiki resistances
 "Vampiro":{phys:.75,death:.3,fire:1.1,ice:1.1,earth:.7,holy:1.25},                         // Vampire
 "Golem":{phys:.8,death:1.04,energy:.9,fire:.6,ice:1.1,earth:1.1},                          // Behemoth
 "Aranha":{energy:1.1,fire:1.15,earth:.8},"Aranha da Selva":{energy:1.1,fire:1.15,earth:.8}, // Giant Spider
 "Serpente":{earth:.9,ice:1.1},"Lagarto":{earth:.9,ice:1.1},                                // Snake
 "Escorpião":{phys:1.04,fire:1.1,earth:.9,ice:1.1},                                         // Larva
 "Orc":{phys:1.15,fire:.8,earth:1.1},                                                       // Orc Soldier
 "Espectro das Marés":{phys:.7,death:.3,energy:.9,fire:1.24,ice:1.1,earth:.9},              // Ghost
 "Guardião do Farol":{energy:1.1,fire:0,ice:1.1},                                           // Guardian
 "Serpente Esmeralda":{phys:1.04,energy:1.04,fire:1.1,earth:.7},                            // Medusa
 "Rato":{earth:.9},"Rato Gigante":{earth:.9},"Orc Guerreiro":{},"Troll":{earth:.9},"Lobo":{earth:.95},
 "Caranguejo das Marés":{},"Pirata Saqueador":{}};
// Conditions some monsters inflict on players (curable with exana spells).
const MONSTER_COND={"Aranha":"poison","Serpente":"poison","Escorpião":"poison","Lagarto":"poison","Dragão":"burning","Demônio":"burning",
 "Golem":"electrified","Múmia":"cursed","Vampiro":"bleeding","Orc Guerreiro":"bleeding","Troll":"bleeding"};
const COND={poison:{n:"Envenenado",ic:"🤢",el:"earth"},burning:{n:"Queimando",ic:"🔥",el:"fire"},electrified:{n:"Eletrificado",ic:"⚡",el:"energy"},
 cursed:{n:"Amaldiçoado",ic:"💀",el:"death"},bleeding:{n:"Sangrando",ic:"🩸",el:"phys"},dazzled:{n:"Ofuscado",ic:"✨",el:"holy"}};
/* Spell fields: w words, n name, v vocations, lv level, mp mana, cd cooldown(s), g group, g2 secondary group,
   k kind, el element, f formula [aMin,bMin,aMax,bMax] -> level/5 + S*a + b (S from src: ml|melee|dist|shield),
   r range, sh area shape, dur duration(s), d description. */
const L=[
// ---------- KNIGHT ----------
{w:"exori infir min",n:"Lesser Front Sweep",v:"k",lv:1,mp:6,cd:6,g:"atk",k:"area",el:"phys",src:"melee",f:[.3,1,.6,2],sh:{t:"front"},ic:"🗡️",d:"Golpe nos 3 quadrados à sua frente (magia de treino)."},
{w:"exori ico",n:"Brutal Strike",v:"k",lv:16,mp:30,cd:6,g:"atk",k:"strike",el:"phys",src:"melee",f:[1,5,2,10],r:1,ic:"🗡️",d:"Golpe físico forte no alvo ao lado."},
{w:"exori ico scu",n:"Shield Bash",v:"k",lv:18,mp:30,cd:6,g:"atk",k:"strike",el:"phys",src:"shield",f:[.8,4,1.6,8],r:1,bash:1,ic:"🛡️",d:"Bate com o escudo no alvo e reduz em 50% o próximo ataque dele (10s)."},
{w:"exori hur",n:"Whirlwind Throw",v:"k",lv:28,mp:40,cd:6,g:"atk",k:"strike",el:"phys",src:"melee",f:[.9,4,1.8,8],r:5,ic:"🪃",d:"Arremessa a arma como um bumerangue no alvo até 5 quadrados."},
{w:"exori scu",n:"Shield Slam",v:"k",lv:30,mp:110,cd:8,g:"atk",k:"area",el:"phys",src:"shield",f:[.9,5,1.8,10],sh:{t:"circle",T:2},bash:1,ic:"🛡️",d:"Atinge todos os inimigos ao redor com o escudo e reduz em 50% o próximo ataque deles."},
{w:"exori mas",n:"Groundshaker",v:"k",lv:33,mp:200,cd:8,g:"atk",k:"area",el:"phys",src:"melee",f:[1.1,5,2.2,10],sh:{t:"circle",T:10},ic:"🌋",d:"Faz o chão tremer e atinge 37 quadrados ao seu redor."},
{w:"exori",n:"Berserk",v:"k",lv:35,mp:115,cd:4,g:"atk",k:"area",el:"phys",src:"melee",f:[1.3,6,2.6,12],sh:{t:"circle",T:2},ic:"🌀",d:"Gira a arma e atinge todos os inimigos nos 8 quadrados ao redor."},
{w:"exori min",n:"Front Sweep",v:"k",lv:70,mp:200,cd:6,g:"atk",k:"area",el:"phys",src:"melee",f:[1.8,8,3.6,16],sh:{t:"front"},ic:"🗡️",d:"Golpe amplo nos 3 quadrados à sua frente."},
{w:"exori gran",n:"Fierce Berserk",v:"k",lv:90,mp:340,cd:6,g:"atk",k:"area",el:"phys",src:"melee",f:[2.2,10,4.4,20],sh:{t:"circle",T:2},ic:"⚔️",d:"Versão feroz do Berserk: dano alto em todos ao redor."},
{w:"exori gran ico",n:"Annihilation",v:"k",lv:110,mp:300,cd:30,g:"atk",k:"strike",el:"phys",src:"melee",f:[5,20,10,40],r:1,ic:"💥",d:"O golpe mais forte do Knight em um único alvo ao lado."},
{w:"exori amp kor",n:"Executioner's Throw",v:"k",lv:150,mp:225,cd:18,g:"atk",k:"chain",el:"phys",src:"melee",f:[2.5,10,5,20],r:5,jumps:3,ic:"🪓",d:"Lança a arma no alvo e ela ricocheteia em até 3 inimigos próximos."},
{w:"exura infir ico",n:"Bruise Bane",v:"k",lv:1,mp:10,cd:1,g:"heal",k:"heal",el:"heal",src:"ml",f:[.4,2,.8,5],ic:"🩹",d:"Pequena cura de treino."},
{w:"exura ico",n:"Wound Cleansing",v:"k",lv:8,mp:40,cd:1,g:"heal",k:"heal",el:"heal",src:"ml",f:[4,25,7.95,51],ic:"🩹",d:"Fecha as feridas do Knight e recupera vida."},
{w:"exura gran ico",n:"Intense Wound Cleansing",v:"k",lv:80,mp:300,cd:600,g:"heal",k:"heal",el:"heal",src:"ml",f:[24,150,40,250],ic:"❤️‍🩹",d:"Cura enorme de emergência (recarga de 10 minutos)."},
{w:"exura med ico",n:"Fair Wound Cleansing",v:"k",lv:300,mp:135,cd:1,g:"heal",k:"heal",el:"heal",src:"ml",f:[8,50,14,90],ic:"❤️‍🩹",d:"Cura maior que Wound Cleansing e menor que a Intense."},
{w:"utito tempo",n:"Blood Rage",v:"k",lv:20,mp:20,cd:2,g:"sup",g2:"focus",k:"buff",buff:"bloodrage",dur:10,ic:"😡",d:"+25% de skill de espada por 10s, mas recebe 15% a mais de dano. Cancela o Protector."},
{w:"utamo tempo",n:"Protector",v:"k",lv:20,mp:20,cd:2,g:"sup",g2:"focus",k:"buff",buff:"protector",dur:13,ic:"🛡️",d:"+30% de defesa e 15% menos dano recebido por 13s, mas causa 15% menos dano. Cancela o Blood Rage."},
{w:"exeta res",n:"Challenge",v:"k",lv:20,mp:40,cd:2,g:"sup",k:"taunt",r:2,dur:6,ic:"📣",d:"Chama a atenção das criaturas ao redor, que passam a atacar você."},
{w:"utani tempo hur",n:"Charge",v:"k",lv:25,mp:100,cd:2,g:"sup",k:"haste",speed:1.9,dur:5,ic:"🐂",d:"+90% de velocidade por 5 segundos."},
{w:"exeta amp res",n:"Chivalrous Challenge",v:"k",lv:150,mp:80,cd:6,g:"sup",k:"pull",r:5,max:4,dur:6,ic:"⛓️",d:"Acorrenta até 4 criaturas a até 5 quadrados, puxa para perto e as obriga a atacar você."},
{w:"utito mas sio",n:"Train Party",v:"k",lv:32,mp:60,cd:2,g:"sup",g2:"party",k:"party",buff:"train",dur:120,ic:"🏋️",d:"+3 de skill de espada e distância para você e o grupo ao redor por 2 minutos."},
{w:"uteta res eq",n:"Avatar of Steel",v:"k",lv:300,mp:800,cd:7200,g:"sup",k:"buff",buff:"avatar",dur:15,ic:"🗿",d:"Vira um avatar de aço por 15s: +35% de dano causado e 15% menos dano recebido."},
{w:"utevo gran res eq",n:"Summon Knight Familiar",v:"k",lv:200,mp:1000,cd:1800,g:"sup",k:"familiar",dur:900,ic:"🐺",d:"Invoca um Familiar Knight que luta ao seu lado por 15 minutos."},
// ---------- PALADIN ----------
{w:"exori infir con",n:"Lesser Ethereal Spear",v:"p",lv:1,mp:6,cd:2,g:"atk",k:"strike",el:"phys",src:"dist",f:[.3,1,.6,3],r:7,ic:"🔱",d:"Lança etérea fraca (magia de treino)."},
{w:"exori con",n:"Ethereal Spear",v:"p",lv:23,mp:25,cd:2,g:"atk",k:"strike",el:"phys",src:"dist",f:[.8,4,1.6,8],r:7,ic:"🔱",d:"Lança uma lança etérea no alvo até 7 quadrados."},
{w:"exori san",n:"Divine Missile",v:"p",lv:40,mp:20,cd:2,g:"atk",k:"strike",el:"holy",src:"ml",f:[1.79,11,3,18],r:7,ic:"✨",d:"Míssil sagrado no alvo. Muito forte contra mortos-vivos."},
{w:"exevo mas san",n:"Divine Caldera",v:"p",lv:50,mp:160,cd:4,g:"atk",k:"area",el:"holy",src:"ml",f:[4,23,8,38],sh:{t:"circle",T:10},ic:"🌟",d:"Explosão sagrada em 37 quadrados ao seu redor."},
{w:"exori dir moe",n:"Ethereal Barrage",v:"p",lv:60,mp:135,cd:6,g:"atk",k:"tarea",el:"phys",src:"dist",f:[1.2,6,2.4,12],r:7,sh:{t:"circle",T:2},ic:"🏹",d:"Chuva etérea no alvo e na área ao redor dele."},
{w:"exori dir san",n:"Divine Barrage",v:"p",lv:70,mp:175,cd:6,g:"atk",k:"tarea",el:"holy",src:"ml",f:[3,15,5,25],r:7,sh:{t:"circle",T:2},ic:"🌠",d:"Chuva sagrada no alvo e na área ao redor dele."},
{w:"utori san",n:"Holy Flash",v:"p",lv:70,mp:30,cd:40,g:"atk",k:"cond",cond:"dazzled",el:"holy",src:"ml",f:[2,20,3,30],r:7,ticks:5,ic:"💫",d:"Ofusca o alvo com dano sagrado contínuo."},
{w:"exori gran con",n:"Strong Ethereal Spear",v:"p",lv:90,mp:55,cd:8,g:"atk",g2:"special",k:"strike",el:"phys",src:"dist",f:[2,10,4,20],r:7,ic:"🔱",d:"Versão mais forte da Ethereal Spear."},
{w:"exevo tempo mas san",n:"Divine Grenade",v:"p",lv:150,mp:160,cd:26,g:"atk",k:"grenade",el:"holy",src:"ml",f:[6,30,9,45],sh:{t:"circle",T:5},delay:3,ic:"💣",d:"Planta um marcador sob o alvo (ou sob você) que explode após 3 segundos."},
{w:"utevo grav san",n:"Divine Empowerment",v:"p",lv:150,mp:500,cd:32,g:"sup",k:"field",dur:5,ic:"🔆",d:"Cria um campo sagrado 3x3 sob seus pés por 5s: +25% de dano enquanto estiver nele."},
{w:"utori hur",n:"Divine Defiance",v:"p",lv:20,mp:250,cd:2,g:"sup",k:"stance",stance:"defiance",ic:"⚜️",d:"Postura: 6% da Distância vira poder sagrado e de cura, e 12% de esquiva contra ataques à distância."},
{w:"utori con",n:"Sharpshooter",v:"p",lv:20,mp:250,cd:2,g:"sup",k:"stance",stance:"sharpshooter",ic:"🎯",d:"Postura ofensiva: +32% de skill de Distância."},
{w:"exana ina",n:"Cancel Invisibility",v:"p",lv:26,mp:200,cd:2,g:"sup",k:"reveal",r:3,ic:"👁️",d:"Revela criaturas e jogadores invisíveis ao redor."},
{w:"utamo tempo san",n:"Swift Foot",v:"p",lv:55,mp:400,cd:2,g:"sup",g2:"focus",k:"haste",speed:1.8,dur:10,dealt:.7,ic:"🦶",d:"+80% de velocidade por 10s; enquanto ativa, todo dano causado é 30% menor."},
{w:"utamo mas sio",n:"Protect Party",v:"p",lv:32,mp:90,cd:2,g:"sup",g2:"party",k:"party",buff:"protect",dur:120,ic:"🛡️",d:"+3 de defesa para você e o grupo ao redor por 2 minutos."},
{w:"exana amp res",n:"Divine Dazzle",v:"p",lv:250,mp:80,cd:16,g:"sup",k:"pull",r:6,max:3,dur:8,ic:"⛓️",d:"Acorrenta até 3 criaturas, puxa para perto e as obriga a lutar corpo a corpo por 8s."},
{w:"uteta res sac",n:"Avatar of Light",v:"p",lv:300,mp:1500,cd:7200,g:"sup",k:"buff",buff:"avatar",dur:15,ic:"👼",d:"Vira um avatar de luz por 15s: +35% de dano causado e 15% menos dano recebido."},
{w:"utevo gran res sac",n:"Summon Paladin Familiar",v:"p",lv:200,mp:2000,cd:1800,g:"sup",k:"familiar",dur:900,ic:"🦅",d:"Invoca um Familiar Paladin que ataca à distância por 15 minutos."},
{w:"exevo infir con",n:"Arrow Call",v:"p",lv:1,mp:30,cd:2,g:"sup",k:"ammo",ammo:"simple",ic:"🏹",d:"Conjura 30 flechas simples (+2 de dano por ataque)."},
{w:"exevo con",n:"Conjure Arrow",v:"p",lv:13,mp:100,cd:2,g:"sup",k:"ammo",ammo:"arrow",ic:"🏹",d:"Conjura 10 flechas (+4 de dano por ataque)."},
{w:"exevo con flam",n:"Conjure Explosive Arrow",v:"p",lv:25,mp:290,cd:2,g:"sup",k:"ammo",ammo:"burst",ic:"🎆",d:"Conjura 8 flechas explosivas: cada ataque também queima os inimigos ao redor do alvo."},
{w:"exeta con",n:"Enchant Spear",v:"p",lv:45,mp:350,cd:2,g:"sup",k:"ammo",ammo:"spear",ic:"🔱",d:"Encanta uma lança (+10 de dano por 15 ataques)."},
{w:"exura san",n:"Divine Healing",v:"p",lv:35,mp:160,cd:1,g:"heal",k:"heal",el:"heal",src:"ml",f:[18.5,0,25,0],ic:"🌟",d:"Cura sagrada poderosa dos Paladins."},
{w:"exura gran san",n:"Salvation",v:"p",lv:60,mp:210,cd:1,g:"heal",k:"heal",el:"heal",src:"ml",f:[24,0,32,0],ic:"🌞",d:"Cura uma grande quantidade de vida."},
{w:"exana mort",n:"Cure Curse",v:"p",lv:80,mp:40,cd:6,g:"heal",k:"cure",cond:"cursed",ic:"🧪",d:"Remove a maldição."},
// ---------- SORCERER ----------
{w:"exori infir vis",n:"Buzz",v:"s",lv:1,mp:6,cd:2,g:"atk",k:"strike",el:"energy",src:"ml",f:[.4,2,.8,4],r:3,ic:"⚡",d:"Pequeno choque elétrico (magia de treino)."},
{w:"exevo infir flam hur",n:"Scorch",v:"s",lv:1,mp:8,cd:4,g:"atk",k:"area",el:"fire",src:"ml",f:[.4,2,.8,4],sh:{t:"wave",w:[1,3]},ic:"🔥",d:"Pequena onda de fogo à frente (magia de treino)."},
{w:"exori mort",n:"Death Strike",v:"s",lv:16,mp:20,cd:2,g:"atk",k:"strike",el:"death",src:"ml",f:[1.403,8,2.203,13],r:3,ic:"💀",d:"Golpe de morte no alvo."},
{w:"exevo flam hur",n:"Fire Wave",v:"s",lv:18,mp:25,cd:4,g:"atk",k:"area",el:"fire",src:"ml",f:[1.25,4,2,12],sh:{t:"wave",w:[1,3,3]},ic:"🔥",d:"Onda de fogo em cone na direção em que você olha."},
{w:"exevo vis lux",n:"Energy Beam",v:"s",lv:23,mp:40,cd:4,g:"atk",k:"area",el:"energy",src:"ml",f:[2.5,0,4,0],sh:{t:"beam",len:5},beam:1,ic:"⚡",d:"Raio de energia de 5 quadrados à sua frente."},
{w:"utori flam",n:"Ignite",v:"s",lv:26,mp:30,cd:30,g:"atk",k:"cond",cond:"burning",el:"fire",src:"ml",f:[2,20,3,30],r:3,ticks:8,ic:"🕯️",d:"Põe fogo no alvo, causando dano contínuo."},
{w:"exevo gran vis lux",n:"Great Energy Beam",v:"s",lv:29,mp:110,cd:6,g:"atk",g2:"beams",k:"area",el:"energy",src:"ml",f:[4,0,7,0],sh:{t:"beam",len:8},beam:1,ic:"🌩️",d:"Raio forte nos 8 quadrados à sua frente."},
{w:"utori vis",n:"Electrify",v:"s",lv:34,mp:30,cd:30,g:"atk",k:"cond",cond:"electrified",el:"energy",src:"ml",f:[2,20,3,30],r:3,ticks:8,ic:"🔌",d:"Eletrifica o alvo, causando dano contínuo."},
{w:"exevo vis hur",n:"Energy Wave",v:"s",lv:38,mp:170,cd:8,g:"atk",k:"area",el:"energy",src:"ml",f:[4.5,20,9,30],sh:{t:"wave",w:[1,1,3,3,3]},ic:"🌊",d:"Onda de energia em cone (1/1/3/3/3 quadrados)."},
{w:"exevo gran flam hur",n:"Great Fire Wave",v:"s",lv:38,mp:120,cd:4,g:"atk",k:"area",el:"fire",src:"ml",f:[2.2,10,4,18],sh:{t:"wave",w:[1,3,3,5]},ic:"🔥",d:"Grande onda de fogo à sua frente."},
{w:"exori amp vis",n:"Lightning",v:"s",lv:55,mp:60,cd:8,g:"atk",k:"strike",el:"energy",src:"ml",f:[2.2,12,3.4,20],r:5,ic:"🌩️",d:"Relâmpago no alvo."},
{w:"exevo gran mas vis",n:"Rage of the Skies",v:"s",lv:55,mp:600,cd:40,g:"atk",g2:"focus",k:"area",el:"energy",src:"ml",f:[5,0,12,0],sh:{t:"circle",T:25},ic:"⛈️",d:"Tempestade elétrica gigante ao seu redor."},
{w:"exevo gran mas flam",n:"Hell's Core",v:"s",lv:60,mp:1100,cd:40,g:"atk",g2:"focus",k:"area",el:"fire",src:"ml",f:[7,0,14,0],sh:{t:"circle",T:32},ic:"☄️",d:"Inferno em 101 quadrados ao seu redor."},
{w:"exevo max mort",n:"Great Death Beam",v:"s",lv:66,mp:140,cd:10,g:"atk",g2:"beams",k:"area",el:"death",src:"ml",f:[5,10,9,20],sh:{t:"beam",len:7},beam:1,ic:"☠️",d:"Feixe de morte de 7 quadrados à sua frente."},
{w:"exori gran flam",n:"Strong Flame Strike",v:"s",lv:70,mp:60,cd:8,g:"atk",g2:"special",k:"strike",el:"fire",src:"ml",f:[2.8,16,4.4,28],r:3,ic:"🔥",d:"Golpe de fogo forte no alvo (ou no quadrado à frente)."},
{w:"utori mort",n:"Curse",v:"s",lv:75,mp:30,cd:50,g:"atk",k:"cond",cond:"cursed",el:"death",src:"ml",f:[3,25,4.5,40],r:3,ticks:10,grow:1,ic:"🧿",d:"Amaldiçoa o alvo: dano de morte que cresce a cada turno."},
{w:"exori gran vis",n:"Strong Energy Strike",v:"s",lv:80,mp:60,cd:8,g:"atk",g2:"special",k:"strike",el:"energy",src:"ml",f:[2.8,16,4.4,28],r:3,ic:"⚡",d:"Golpe de energia forte no alvo (ou no quadrado à frente)."},
{w:"exori max flam",n:"Ultimate Flame Strike",v:"s",lv:90,mp:100,cd:30,g:"atk",g2:"ultimate",k:"strike",el:"fire",src:"ml",f:[4.5,35,7.3,55],r:3,ic:"🌋",d:"O golpe de fogo mais forte em um alvo."},
{w:"exori max vis",n:"Ultimate Energy Strike",v:"s",lv:100,mp:100,cd:30,g:"atk",g2:"ultimate",k:"strike",el:"energy",src:"ml",f:[4.5,35,7.3,55],r:3,ic:"🌩️",d:"O golpe de energia mais forte em um alvo."},
{w:"exevo mort ora",n:"Death Echo",v:"s",lv:120,mp:150,cd:6,g:"atk",k:"echo",el:"death",src:"ml",f:[3,10,5,20],r:5,ic:"🔊",d:"Impacto de morte no alvo e, logo depois, um segundo impacto numa área maior."},
{w:"exori moe tempo",n:"Aura of Exposed Weakness",v:"s",lv:175,mp:1500,cd:2,g:"sup",k:"stance",stance:"expose",ic:"🩻",d:"Postura: seus golpes deixam os inimigos 8% mais vulneráveis a dano elemental."},
{w:"exori kor tempo",n:"Aura of Sapped Strength",v:"s",lv:175,mp:1500,cd:2,g:"sup",k:"stance",stance:"sap",ic:"🥀",d:"Postura: seus golpes reduzem em 10% o dano causado pelos inimigos atingidos."},
{w:"uteta flam",n:"Master of Flames",v:"s",lv:20,mp:400,cd:2,g:"sup",k:"stance",stance:"flames",ic:"🔥",d:"Postura de fogo: +4% de poder nas magias de fogo."},
{w:"uteta vis",n:"Master of Thunder",v:"s",lv:20,mp:400,cd:2,g:"sup",k:"stance",stance:"thunder",ic:"⚡",d:"Postura de energia: +4% de chance de crítico nas magias de energia."},
{w:"uteta mort",n:"Master of Decay",v:"s",lv:20,mp:400,cd:2,g:"sup",k:"stance",stance:"decay",ic:"💀",d:"Postura de morte: +5% de chance de crítico e +30% de dano crítico nas magias de morte."},
{w:"exevo gran mort",n:"Conjure Wand of Darkness",v:"s",lv:41,mp:250,cd:2,g:"sup",k:"wand",dur:600,ic:"🪄",d:"Conjura uma Varinha da Escuridão: seus ataques básicos causam +20% de dano por 10 minutos."},
{w:"utori mas sio",n:"Enchant Party",v:"s",lv:32,mp:120,cd:2,g:"sup",g2:"party",k:"party",buff:"enchant",dur:120,ic:"🔮",d:"+1 de nível mágico para você e o grupo ao redor por 2 minutos."},
{w:"uteta res ven",n:"Avatar of Storm",v:"s",lv:300,mp:2200,cd:7200,g:"sup",k:"buff",buff:"avatar",dur:15,ic:"🌪️",d:"Vira um avatar da tempestade por 15s: +35% de dano causado e 15% menos dano recebido."},
{w:"utevo gran res ven",n:"Summon Sorcerer Familiar",v:"s",lv:200,mp:3000,cd:1800,g:"sup",k:"familiar",dur:900,ic:"🐉",d:"Invoca um Familiar Sorcerer que lança magias por 15 minutos."},
// ---------- DRUID ----------
{w:"exori infir tera",n:"Mud Attack",v:"d",lv:1,mp:6,cd:2,g:"atk",k:"strike",el:"earth",src:"ml",f:[.4,2,.8,4],r:3,ic:"🪨",d:"Pequeno ataque de lama (magia de treino)."},
{w:"exevo infir frigo hur",n:"Chill Out",v:"d",lv:1,mp:8,cd:4,g:"atk",k:"area",el:"ice",src:"ml",f:[.4,2,.8,4],sh:{t:"wave",w:[1,3]},ic:"❄️",d:"Pequena onda de gelo à frente (magia de treino)."},
{w:"exori moe ico",n:"Physical Strike",v:"d",lv:16,mp:20,cd:2,g:"atk",k:"strike",el:"phys",src:"ml",f:[1.403,8,2.203,13],r:3,ic:"👊",d:"Golpe físico mágico no alvo."},
{w:"exevo frigo hur",n:"Ice Wave",v:"d",lv:18,mp:25,cd:4,g:"atk",k:"area",el:"ice",src:"ml",f:[1,4,1.8,12],sh:{t:"wave",w:[1,3,3]},ic:"❄️",d:"Onda de gelo em cone na direção em que você olha."},
{w:"exevo tera hur",n:"Terra Wave",v:"d",lv:38,mp:170,cd:4,g:"atk",k:"area",el:"earth",src:"ml",f:[3.5,10,7,20],sh:{t:"wave",w:[1,3,3,5]},ic:"🌿",d:"Onda de terra em cone à sua frente."},
{w:"exevo gran frigo hur",n:"Strong Ice Wave",v:"d",lv:40,mp:170,cd:8,g:"atk",k:"area",el:"ice",src:"ml",f:[4.5,20,7.6,30],sh:{t:"wave",w:[1,3,3,5,5]},ic:"🌨️",d:"Onda de gelo mais forte e mais larga."},
{w:"utori pox",n:"Envenom",v:"d",lv:50,mp:30,cd:40,g:"atk",k:"cond",cond:"poison",el:"earth",src:"ml",f:[2,20,3,30],r:3,ticks:10,ic:"🐍",d:"Envenena o alvo, causando dano contínuo."},
{w:"exevo gran mas tera",n:"Wrath of Nature",v:"d",lv:55,mp:700,cd:40,g:"atk",g2:"focus",k:"area",el:"earth",src:"ml",f:[5,0,10,0],sh:{t:"circle",T:32},ic:"🌳",d:"A natureza se revolta em 101 quadrados ao seu redor."},
{w:"exevo gran mas frigo",n:"Eternal Winter",v:"d",lv:60,mp:1050,cd:40,g:"atk",g2:"focus",k:"area",el:"ice",src:"ml",f:[6,0,12,0],sh:{t:"circle",T:18},ic:"🌨️",d:"Inverno eterno em 61 quadrados ao seu redor."},
{w:"exori gran tera",n:"Strong Terra Strike",v:"d",lv:70,mp:60,cd:8,g:"atk",g2:"special",k:"strike",el:"earth",src:"ml",f:[2.8,16,4.4,28],r:7,ic:"🪨",d:"Golpe de terra forte no alvo até 7 quadrados (ou no quadrado à frente)."},
{w:"exori gran frigo",n:"Strong Ice Strike",v:"d",lv:80,mp:60,cd:8,g:"atk",g2:"special",k:"strike",el:"ice",src:"ml",f:[2.8,16,4.4,28],r:7,ic:"🧊",d:"Golpe de gelo forte no alvo até 7 quadrados (ou no quadrado à frente)."},
{w:"exevo fur tera",n:"Forked Thorns",v:"d",lv:80,mp:180,cd:8,g:"atk",k:"chain",el:"earth",src:"ml",f:[2,10,3.5,18],r:5,jumps:5,ic:"🌵",d:"Acerta o alvo e até 5 inimigos próximos com espinhos."},
{w:"exevo fur frigo",n:"Forked Glacier",v:"d",lv:90,mp:180,cd:8,g:"atk",k:"chain",el:"ice",src:"ml",f:[2,10,3.5,18],r:5,jumps:6,ic:"🧊",d:"Acerta o alvo e até 6 inimigos próximos com gelo."},
{w:"exori max tera",n:"Ultimate Terra Strike",v:"d",lv:90,mp:100,cd:30,g:"atk",g2:"ultimate",k:"strike",el:"earth",src:"ml",f:[4.5,35,7.3,55],r:3,ic:"🌋",d:"O golpe de terra mais forte em um alvo."},
{w:"exori max frigo",n:"Ultimate Ice Strike",v:"d",lv:100,mp:100,cd:30,g:"atk",g2:"ultimate",k:"strike",el:"ice",src:"ml",f:[4.5,35,7.3,55],r:3,ic:"🧊",d:"O golpe de gelo mais forte em um alvo."},
{w:"exevo ulus frigo",n:"Ice Burst",v:"d",lv:150,mp:230,cd:22,g:"atk",g2:"bursts",k:"area",el:"ice",src:"ml",f:[5,0,9,0],sh:{t:"ring"},burst:1,ic:"💠",d:"Anel poderoso de gelo ao seu redor (divide recarga com Terra Burst)."},
{w:"exevo ulus tera",n:"Terra Burst",v:"d",lv:150,mp:230,cd:22,g:"atk",g2:"bursts",k:"area",el:"earth",src:"ml",f:[5,0,9,0],sh:{t:"ring"},burst:1,ic:"🟢",d:"Anel poderoso de terra ao seu redor (divide recarga com Ice Burst)."},
{w:"exura sio",n:"Heal Friend",v:"d",lv:18,mp:120,cd:1,g:"heal",k:"healfriend",el:"heal",src:"ml",f:[8,50,14,90],r:7,ic:"💞",d:"Cura um jogador: diga exura sio \"Nome. Sem nome, cura o aliado mais ferido do grupo (ou você)."},
{w:"utura mas sio",n:"Heal Party",v:"d",lv:32,mp:120,cd:2,g:"heal",g2:"party",k:"party",buff:"healparty",dur:120,ic:"💗",d:"Você e o grupo ao redor recebem 20 de vida a cada 2s por 2 minutos."},
{w:"exura gran mas res",n:"Mass Healing",v:"d",lv:36,mp:150,cd:2,g:"heal",k:"massheal",el:"heal",src:"ml",f:[5.7,26,10.43,62],r:3,ic:"💖",d:"Cura você, seus aliados e suas criaturas ao redor."},
{w:"exura gran sio",n:"Nature's Embrace",v:"d",lv:275,mp:400,cd:60,g:"heal",k:"healfriend",noself:1,el:"heal",src:"ml",f:[20,100,30,150],r:7,ic:"🌺",d:"Cura enorme em outro jogador (não funciona em você)."},
{w:"exana flam",n:"Cure Burning",v:"d",lv:30,mp:30,cd:6,g:"heal",k:"cure",cond:"burning",ic:"🧯",d:"Apaga as queimaduras."},
{w:"exana vis",n:"Cure Electrification",v:"d",lv:22,mp:30,cd:6,g:"heal",k:"cure",cond:"electrified",ic:"🧪",d:"Remove a eletrificação."},
{w:"exevo pan",n:"Food",v:"d",lv:14,mp:120,cd:2,g:"sup",k:"food",dur:300,ic:"🍖",d:"Cria comida: sua regeneração de vida e mana dobra por 5 minutos."},
{w:"utito dru",n:"Elemental Synthesis",v:"d",lv:20,mp:400,cd:2,g:"sup",k:"stance",stance:"synthesis",ic:"🍃",d:"Postura: +10% de nível mágico nas magias de gelo e terra."},
{w:"utura sio",n:"Shared Conservation",v:"d",lv:20,mp:400,cd:2,g:"sup",k:"stance",stance:"conservation",ic:"🤝",d:"Postura: +10% na autocura; Heal Friend e Nature's Embrace curam também um 2º aliado em 30%."},
{w:"uteta res dru",n:"Avatar of Nature",v:"d",lv:300,mp:2200,cd:7200,g:"sup",k:"buff",buff:"avatar",dur:15,ic:"🌳",d:"Vira um avatar da natureza por 15s: +35% de dano causado e 15% menos dano recebido."},
{w:"utevo gran res dru",n:"Summon Druid Familiar",v:"d",lv:200,mp:3000,cd:1800,g:"sup",k:"familiar",dur:900,ic:"🦌",d:"Invoca um Familiar Druid que luta e cura ao seu lado por 15 minutos."},
// ---------- SHARED ----------
{w:"exura infir",n:"Magic Patch",v:"psd",lv:1,mp:6,cd:1,g:"heal",k:"heal",el:"heal",src:"ml",f:[.7,4,.9,6],ic:"🩹",d:"Pequena cura de treino."},
{w:"exura",n:"Light Healing",v:"psd",lv:8,mp:20,cd:1,g:"heal",k:"heal",el:"heal",src:"ml",f:[1.4,8,1.795,11],ic:"💚",d:"Cura uma pequena quantidade de vida."},
{w:"exura gran",n:"Intense Healing",v:"psd",lv:20,mp:70,cd:1,g:"heal",k:"heal",el:"heal",src:"ml",f:[3.184,20,5.59,35],ic:"💖",d:"Cura uma quantidade média de vida."},
{w:"exura vita",n:"Ultimate Healing",v:"sd",lv:30,mp:160,cd:1,g:"heal",k:"heal",el:"heal",src:"ml",f:[7.22,44,12.79,79],ic:"💗",d:"Cura uma grande quantidade de vida."},
{w:"exura max vita",n:"Restoration",v:"sd",lv:300,mp:260,cd:6,g:"heal",k:"heal",el:"heal",src:"ml",f:[12,80,20,120],ic:"🌈",d:"A cura mais potente dos magos."},
{w:"utamo vita",n:"Magic Shield",v:"sd",lv:14,mp:50,cd:14,g:"sup",k:"mshield",dur:180,ic:"🔵",d:"Por 3 min, o dano recebido sai da mana em vez da vida, até o escudo quebrar."},
{w:"exana vita",n:"Cancel Magic Shield",v:"sd",lv:14,mp:50,cd:2,g:"sup",k:"unshield",ic:"⭕",d:"Remove o seu Magic Shield."},
{w:"utani gran hur",n:"Strong Haste",v:"sd",lv:20,mp:100,cd:2,g:"sup",k:"haste",speed:1.7,dur:22,ic:"💨",d:"+70% de velocidade por 22 segundos."},
{w:"utevo res ina",n:"Creature Illusion",v:"sd",lv:23,mp:100,cd:2,g:"sup",k:"illusion",dur:180,ic:"🎭",d:"Transforma você em uma criatura por 3 min: utevo res ina \"Lobo."},
{w:"utevo res",n:"Summon Creature",v:"sd",lv:25,mp:0,cd:2,g:"sup",k:"summon",dur:600,ic:"🐾",d:"Invoca até 2 criaturas para lutar por você: utevo res \"Lobo. A mana depende da criatura."},
{w:"utevo vis lux",n:"Ultimate Light",v:"sd",lv:26,mp:140,cd:2,g:"sup",k:"light",light:9,dur:2000,ic:"🔆",d:"Luz enorme (raio 9) por cerca de 33 minutos."},
{w:"utana vid",n:"Invisible",v:"sd",lv:35,mp:440,cd:2,g:"sup",k:"invis",dur:200,ic:"👻",d:"Fica invisível para as criaturas por 200 segundos."},
{w:"exana kor",n:"Cure Bleeding",v:"kd",lv:45,mp:30,cd:6,g:"heal",k:"cure",cond:"bleeding",ic:"🩸",d:"Estanca o sangramento."},
{w:"utura",n:"Recovery",v:"kp",lv:50,mp:75,cd:60,g:"heal",k:"hot",per:20,every:3,dur:60,ic:"♻️",d:"Recupera vida aos poucos durante 60 segundos (cerca de 400)."},
{w:"utura gran",n:"Intense Recovery",v:"kp",lv:100,mp:165,cd:60,g:"heal",k:"hot",per:40,every:3,dur:60,ic:"♻️",d:"Recupera muita vida aos poucos durante 60 segundos (cerca de 800)."},
{w:"exana pox",n:"Cure Poison",v:"kpsd",lv:10,mp:30,cd:6,g:"heal",k:"cure",cond:"poison",ic:"🧪",d:"Remove o envenenamento."},
{w:"utevo lux",n:"Light",v:"kpsd",lv:8,mp:20,cd:2,g:"sup",k:"light",light:3,dur:370,ic:"💡",d:"Luz de raio 3 por 6 minutos e 10 segundos."},
{w:"exiva",n:"Find Person",v:"kpsd",lv:8,mp:20,cd:2,g:"sup",k:"find",ic:"🧭",d:"Mostra a direção e a distância de um jogador: exiva \"Nome."},
{w:"exani tera",n:"Magic Rope",v:"kpsd",lv:9,mp:20,cd:2,g:"sup",k:"rope",ic:"🪢",d:"No subsolo, leva você de volta à superfície."},
{w:"exani hur",n:"Levitate",v:"kpsd",lv:12,mp:50,cd:2,g:"sup",k:"levitate",ic:"🪽",d:"Levita um andar para cima ou para baixo no quadrado à sua frente: exani hur \"up ou \"down."},
{w:"utevo gran lux",n:"Great Light",v:"kpsd",lv:13,mp:60,cd:2,g:"sup",k:"light",light:6,dur:695,ic:"💡",d:"Luz de raio 6 por cerca de 11 minutos."},
{w:"utani hur",n:"Haste",v:"kpsd",lv:14,mp:60,cd:2,g:"sup",k:"haste",speed:1.3,dur:33,ic:"💨",d:"+30% de velocidade por 33 segundos."},
{w:"exiva moe res",n:"Find Fiend",v:"kpsd",lv:25,mp:20,cd:2,g:"sup",k:"fiend",ic:"👹",d:"Mostra a direção da criatura mais perigosa por perto."},
// ---------- PASSIVES (nível 300, sem palavras) ----------
{w:"gift of life",n:"Gift of Life",v:"kpsd",lv:300,mp:0,cd:3600,g:"sup",k:"passive",pas:"gift",ic:"🎁",d:"Passiva: um golpe que mataria você recupera 20% da vida (e mana nos magos). Recarga de 1 hora."},
{w:"combat mastery",n:"Combat Mastery",v:"k",lv:300,mp:0,cd:0,g:"sup",k:"passive",pas:"combat",ic:"🏅",d:"Passiva: recebe 1% menos dano a cada 10% de vida perdida (dobro com escudo) e causa mais dano em alvos feridos."},
{w:"beam mastery",n:"Beam Mastery",v:"s",lv:300,mp:0,cd:0,g:"sup",k:"passive",pas:"beam",ic:"🔦",d:"Passiva: feixes ficam 1 quadrado maiores e +10% de dano; cada alvo atingido reduz 1s das outras recargas (máx. 3s)."},
{w:"lord of destruction",n:"Lord of Destruction",v:"s",lv:300,mp:0,cd:0,g:"sup",k:"passive",pas:"lord",ic:"👑",d:"Passiva: dobra os bônus das posturas Master of Flames, Thunder e Decay."},
{w:"blessing of the grove",n:"Blessing of the Grove",v:"d",lv:300,mp:0,cd:0,g:"sup",k:"passive",pas:"grove",ic:"🌲",d:"Passiva: curas 10% maiores em alvos abaixo de 60% de vida (20% abaixo de 30%) e 10% de chance de cura crítica."},
{w:"twin bursts",n:"Twin Bursts",v:"d",lv:300,mp:0,cd:0,g:"sup",k:"passive",pas:"twin",ic:"♊",d:"Passiva: Ice Burst e Terra Burst causam +20% de dano e recarregam 4s mais rápido."}
];
const SPELLS=L.map(s=>Object.freeze({...s,v:s.v.split("").map(c=>VOC[c]),g2:s.g2||null}));
const BY_WORDS=new Map(SPELLS.filter(s=>s.k!=="passive").map(s=>[s.w,s]));
function norm(t){return String(t||"").trim().toLowerCase().replace(/\s+/g," ")}
// "exura sio "Nome" / exiva "Nome / utevo res Lobo -> {spell,param}; longest words win.
function parse(text){const raw=String(text||"").trim();const t=norm(raw);if(!t)return null;let best=null;
 for(const s of BY_WORDS.values()){if(t===s.w||t.startsWith(s.w+" ")||t.startsWith(s.w+'"')){if(!best||s.w.length>best.w.length)best=s}}
 if(!best)return null;const param=raw.slice(best.w.length).trim().replace(/^"+|"+$/g,"").trim();return {spell:best,param}}
function forVoc(voc){return SPELLS.filter(s=>s.v.includes(voc))}
// Magic-based spells add the wand's elemental magic bonus (st.mlEl, e.g. {fire:6}) for their own element.
function stat(sp,st){const s=sp.src==="melee"?st.melee:sp.src==="dist"?st.dist:sp.src==="shield"?st.shield:(Number(st.ml)||0)+(Number(st.mlEl&&st.mlEl[sp.el])||0);return Math.max(0,Number(s)||0)}
function range(sp,st){if(!sp.f)return [0,0];const [a,b,c,d]=sp.f,lv=(Number(st.level)||1)/5,S=stat(sp,st);return [Math.max(1,Math.round(lv+S*a+b)),Math.max(1,Math.round(lv+S*c+d))]}
function roll(sp,st,rnd){const [lo,hi]=range(sp,st),r=typeof rnd==="number"?rnd:Math.random();return Math.round(lo+(hi-lo)*Math.min(1,Math.max(0,r)))}
function resist(name,el){const official=root.LawlMonsters?.get(name),t=official?official.res:RESIST[name];if(!t||!el||el==="heal")return 1;return t[el]==null?1:t[el]}
// Damage after the monster's resistances when a hit is split by element ({fire:85,phys:20}: each part meets its own multiplier).
function resistMix(name,dmg,mix){const d=Number(dmg)||0;if(d<=0)return 0;const m=mix&&Object.keys(mix).length?mix:{phys:100};
 const tot=Object.values(m).reduce((n,v)=>n+(Number(v)||0),0)||100;let sum=0;for(const [k,v] of Object.entries(m))sum+=d*(Number(v)||0)/tot*resist(name,k);
 return sum<=0?0:Math.max(1,Math.round(sum))}
// Area offsets relative to the caster, facing dir (north/south/east/west). Forward f, side s.
function rot(f,s,dir){return dir==="east"?[f,s]:dir==="west"?[-f,s]:dir==="north"?[s,-f]:[s,f]}
function cells(sh,dir,extra){if(!sh)return [];const out=[];
 if(sh.t==="circle"){const R=Math.ceil(Math.sqrt(sh.T));for(let y=-R;y<=R;y++)for(let x=-R;x<=R;x++)if(x*x+y*y<=sh.T)out.push([x,y])}
 else if(sh.t==="ring"){for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){const c=Math.max(Math.abs(x),Math.abs(y));if(c>=2&&x*x+y*y<=10)out.push([x,y])}}
 else if(sh.t==="front"){for(const s of [-1,0,1])out.push(rot(1,s,dir))}
 else if(sh.t==="beam"){const n=sh.len+(extra||0);for(let f=1;f<=n;f++)out.push(rot(f,0,dir))}
 else if(sh.t==="wave"){sh.w.forEach((w,i)=>{const h=(w-1)/2;for(let s=-h;s<=h;s++)out.push(rot(i+1,s,dir))})}
 return out}
function cooldownsFor(sp){const r=[{key:"s:"+sp.w,sec:sp.cd},{key:"g:"+sp.g,sec:GROUP_CD[sp.g]||1}];if(sp.g2)r.push({key:"g2:"+sp.g2,sec:sp.g2==="bursts"?sp.cd:GROUP2_CD[sp.g2]||2});return r}
// Summon Creature: Tibia-like mana cost scales with the creature; level limits how strong it may be.
function summonCost(t){return Math.round(150+(Number(t.hp)||0)*2)}
function canSummon(t,level){return !!t&&!t.boss&&t.name!=="Demônio"&&(Number(t.hp)||0)<=level*3}
function partyCost(sp,members){return sp.mp+Math.max(0,members)*Math.round(sp.mp/2)}
function shieldCap(level,ml){return Math.round(300+7.6*level+7*ml)}
function dir8(dx,dy){if(!dx&&!dy)return "aqui";const a=Math.atan2(dy,dx)*180/Math.PI,i=Math.round(((a+360)%360)/45)%8;return ["a leste","a sudeste","ao sul","a sudoeste","a oeste","a noroeste","ao norte","a nordeste"][i]}
function exiva(dx,dy,dz){const d=Math.max(Math.abs(dx),Math.abs(dy));if(dz>0&&d<5)return "está "+(dz>0?"em outro andar":"");
 if(d<5)return "está ao seu lado";const where=dir8(dx,dy);if(d<=100)return (dz?"está em outro andar, ":"está ")+where;if(d<=250)return "está longe "+where;return "está muito longe "+where}
/* ---------- Runtime helpers (pure): buffs, shields, stances and passives used by the game loop ---------- */
const AMMO={simple:{n:"Flechas simples",ic:"🏹",qty:30,bonus:2},arrow:{n:"Flechas conjuradas",ic:"🏹",qty:10,bonus:4},
 burst:{n:"Flechas explosivas",ic:"💥",qty:8,bonus:4,burst:1},spear:{n:"Lança encantada",ic:"🔱",qty:15,bonus:10}};
const PARTY_BUFF={train:{n:"Treino em grupo",ic:"💪"},protect:{n:"Proteção em grupo",ic:"🛡️"},enchant:{n:"Encanto em grupo",ic:"🔮"},healparty:{n:"Cura em grupo",ic:"💞",per:20,every:2}};
const BUFF_NAME={bloodrage:"Blood Rage",protector:"Protector",avatar:"Avatar",train:"Treino em grupo",protect:"Proteção em grupo",enchant:"Encanto em grupo",healparty:"Cura em grupo"};
const on=(fx,k,now)=>!!fx&&!!fx.buffs&&(fx.buffs[k]||0)>now;
// Combined multipliers of every active buff. fx = {buffs:{name:untilSec}, hdealt:{until,mul}, field:{x,y,z,until}, stance}
function mods(fx,now,pos){const m={dealt:1,taken:1,def:0,add:{sword:0,distance:0,magic:0},mul:{sword:1,distance:1,magic:1}};if(!fx)return m;
 if(on(fx,"bloodrage",now)){m.mul.sword*=1.25;m.taken*=1.15}
 if(on(fx,"protector",now)){m.taken*=.85;m.dealt*=.85}
 if(on(fx,"avatar",now)){m.dealt*=1.35;m.taken*=.85}
 if(on(fx,"train",now)){m.add.sword+=3;m.add.distance+=3}
 if(on(fx,"protect",now))m.def+=3;
 if(on(fx,"enchant",now))m.add.magic+=1;
 if(fx.hdealt&&fx.hdealt.until>now)m.dealt*=fx.hdealt.mul;
 const f=fx.field;if(f&&f.until>now&&pos&&pos.z===f.z&&Math.abs(pos.x-f.x)<=1&&Math.abs(pos.y-f.y)<=1)m.dealt*=1.25;
 if(fx.stance==="sharpshooter")m.mul.distance*=1.32;
 return m}
function skill(base,k,m){const b=Math.max(0,Number(base)||0);if(!m)return b;return Math.round((b+(m.add[k]||0))*(m.mul[k]||1))}
// Stance bonus for one spell cast; r = random 0..1 for critical rolls. lord = Lord of Destruction passive (doubles sorcerer stances).
function stanceBonus(sp,stance,lord,r){let mul=1,crit=0,critMul=1.5;const k=lord?2:1,el=sp&&sp.el;
 if(stance==="flames"&&el==="fire")mul*=1+.04*k;
 if(stance==="thunder"&&el==="energy")crit=.04*k;
 if(stance==="decay"&&el==="death"){crit=.05*k;critMul+=.3*k}
 if(stance==="synthesis"&&(el==="ice"||el==="earth"))mul*=1.1;
 if(stance==="defiance"&&(el==="holy"||el==="heal"))mul*=1.06;
 if(stance==="conservation"&&el==="heal")mul*=1.1;
 const isCrit=crit>0&&(typeof r==="number"?r:Math.random())<crit;return {mul:isCrit?mul*critMul:mul,crit:isCrit}}
// Magic Shield: damage is paid with mana until the shield capacity or the mana runs out.
function absorb(dmg,mp,cap){const d=Math.max(0,Math.round(Number(dmg)||0)),used=Math.max(0,Math.min(d,Math.floor(Number(mp)||0),Math.floor(Number(cap)||0)));return {hp:d-used,mp:used,cap:Math.max(0,(Number(cap)||0)-used)}}
// Combat Mastery (knight, level 300): 1% less damage per 10% of life lost (2% with a shield); +10% damage on targets below half life.
function combatTaken(dmg,hpPct,shield){const lost=Math.max(0,Math.min(10,Math.floor((1-Math.max(0,Math.min(1,hpPct)))*10)));return dmg*(1-lost*(shield?.02:.01))}
function combatDealt(dmg,targetPct){return targetPct<.5?dmg*1.1:dmg}
// Blessing of the Grove (druid, level 300).
function groveHeal(amount,pct,r){let a=amount*(pct<.3?1.2:pct<.6?1.1:1);if((typeof r==="number"?r:Math.random())<.1)a*=1.5;return Math.round(a)}
const GIFT_MS=3600000;
function giftReady(lastAt,nowMs){return !(Number(lastAt)>0)||nowMs-Number(lastAt)>=GIFT_MS}
// Condition damage per tick; cursed ("grow") spells get stronger each tick.
function condTick(base,tick,grow){return Math.max(1,Math.round(base*(grow?1+tick*.15:1)))}
// Monster-inflicted conditions on players: 25% per hit, 5 ticks every 2s of 25% of the monster's damage.
function monsterCond(name,mobDmg,r){const c=MONSTER_COND[name];if(!c||(typeof r==="number"?r:Math.random())>=.25)return null;return {cond:c,dmg:Math.max(1,Math.round((Number(mobDmg)||1)*.25)),ticks:5,every:2}}
function familiar(voc,level){const L=Math.max(1,Number(level)||1),V={knight:{n:"Familiar Knight",range:1,el:"phys"},paladin:{n:"Familiar Paladin",range:5,el:"holy"},sorcerer:{n:"Familiar Sorcerer",range:4,el:"energy"},druid:{n:"Familiar Druid",range:4,el:"ice",heal:1}}[voc];
 if(!V)return null;return {...V,kind:"hero:"+voc,hp:200+L*6,dmg:Math.round(10+L*.8)}}
function cooldownSec(sp,level,voc){let cd=Number(sp.cd)||0;if(sp.burst&&level>=300&&voc==="druid")cd=Math.max(1,cd-4);return cd}
function shapeLabel(sp){const s=sp.sh;if(!s)return sp.r?(sp.r<=1?"alvo ao lado":`alvo até ${sp.r} quadrados`):"";
 if(s.t==="front")return "3 quadrados à frente";if(s.t==="beam")return `feixe de ${s.len} quadrados`;if(s.t==="wave")return `onda de ${s.w.length} quadrados`;if(s.t==="ring")return "anel ao redor";
 if(s.t==="circle"){const R=Math.floor(Math.sqrt(s.T));return (sp.k==="tarea"||sp.k==="grenade"?"área no alvo":"ao redor")+(s.T<=2?" (3×3)":` (raio ${R})`)}return ""}
root.LawlSpells={VOC,GROUP_CD,GROUP2_CD,EL,RESIST,resistMix,COND,MONSTER_COND,SPELLS,BY_WORDS,norm,parse,forVoc,range,roll,resist,cells,cooldownsFor,summonCost,canSummon,partyCost,shieldCap,dir8,exiva,
 AMMO,PARTY_BUFF,BUFF_NAME,mods,skill,stanceBonus,absorb,combatTaken,combatDealt,groveHeal,GIFT_MS,giftReady,condTick,monsterCond,familiar,cooldownSec,shapeLabel};
})(typeof window!=="undefined"?window:globalThis);

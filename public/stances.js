/* Browser-safe combat stances (Tibia-style): full attack, balanced and full defense. */
(function(root){
"use strict";
// dealt = multiplier on the player's basic attacks; taken = multiplier on damage the player receives.
const MODES={
 attack:{id:"attack",ic:"⚔️",name:"Full Attack",dealt:1.3,taken:1.2},
 balanced:{id:"balanced",ic:"⚖️",name:"Médio",dealt:1,taken:1},
 defense:{id:"defense",ic:"🛡️",name:"Full Defense",dealt:.7,taken:.75}
};
const ORDER=["attack","balanced","defense"];
function normalize(s){return Object.prototype.hasOwnProperty.call(MODES,s)?s:"balanced"}
function mode(s){return MODES[normalize(s)]}
function dealt(dmg,s){return Math.max(1,Math.round((Number(dmg)||0)*mode(s).dealt))}
function taken(dmg,s){return Math.max(1,Math.round((Number(dmg)||0)*mode(s).taken))}
root.LawlStances={MODES,ORDER,normalize,mode,dealt,taken};
})(typeof window!=="undefined"?window:globalThis);

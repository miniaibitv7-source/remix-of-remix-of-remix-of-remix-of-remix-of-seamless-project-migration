(function(root){
"use strict";
/* Optional 6th value: door offset along its wall (defaults to the middle); used to keep facing doors apart. */
function doorAt(x,y,w,h,side,off){const o=Number.isInteger(off)?off:null;
 return [side==="w"?x:side==="e"?x+w-1:x+(o??(w>>1)),side==="n"?y:side==="s"?y+h-1:y+(o??(h>>1))]}
/* Optional 7th/8th values: city name and house number inside that city (new cities come after Lawl's 22 houses). */
function catalog(rows){return rows.map(([x,y,w,h,side,off,city,num],i)=>{
 const [dx,dy]=doorAt(x,y,w,h,side,off);
 const ax=dx+(side==="w"?-1:side==="e"?1:0),ay=dy+(side==="n"?-1:side==="s"?1:0);
 const sqm=(w-2)*(h-2);
 return {id:"lawl-"+(i+1),name:"Casa "+(num||i+1)+" · "+(city||"Lawl"),x,y,w,h,side,dx,dy,ax,ay,sqm,weekly:sqm,monthly:sqm*4};
})}
function inside(h,x,y){return x>h.x&&x<h.x+h.w-1&&y>h.y&&y<h.y+h.h-1}
/* Rent/key prompts open only while standing on the door tile itself, not next to it. */
function onDoor(h,x,y){return x===h.dx&&y===h.dy}
function valid(lease,now){return !!lease?.mine&&Date.parse(lease.expires)>now}
function price(h,days){if(days!==7&&days!==30)throw new Error("Período inválido");return h.sqm*(days===7?1:4)}
root.LawlHousing={catalog,doorAt,inside,onDoor,valid,price};
})(typeof window!=="undefined"?window:globalThis);
(function(root){
 "use strict";
 function landmarks(status,player,bosses,zones){
  if(!root.LawlGameMaster.eligible(status,player))return [];
  return [{id:"temple",name:"Templo · renascimento",x:30,y:30,z:0,kind:"temple"},...bosses.map((b,i)=>({id:"boss-"+i,name:b.name+" · portal",x:zones[i].cx+2,y:zones[i].cy,z:1,kind:"boss"}))];
 }
 function select(status,player,armed,x,y,z){
  if(!root.LawlGameMaster.eligible(status,player)||!armed)return null;
  const destination={x,y,z};root.LawlGameMaster.validate("teleport",destination);return destination;
 }
 root.LawlGmNavigation={landmarks,select};
})(globalThis);
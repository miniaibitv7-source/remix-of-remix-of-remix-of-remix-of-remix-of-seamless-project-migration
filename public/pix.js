(function(root){
"use strict";
// Chave PIX (celular) que recebe os pagamentos de gemas.
const KEY="+5527999753036",NAME="REINOS DE LAWL",CITY="BRASIL";
function field(id,v){v=String(v);return id+String(v.length).padStart(2,"0")+v}
function clean(s,n){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9 .\-]/g,"").replace(/\s+/g," ").trim().slice(0,n)}
function crc16(s){let c=0xFFFF;for(let i=0;i<s.length;i++){c^=s.charCodeAt(i)<<8;for(let j=0;j<8;j++)c=c&0x8000?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF}return c.toString(16).toUpperCase().padStart(4,"0")}
function newTxid(now){const r=Math.random().toString(36).slice(2,8);return ("LAWL"+(now??Date.now()).toString(36)+r).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,25)}
// QR estático para chave pessoal: o txid fica sempre "***" (o banco do recebedor recusa
// identificadores que ele mesmo não registrou). O código do pedido vai na descrição.
function payload(o){const amount=Number(o&&o.amount);if(!(amount>0))throw new Error("Valor inválido");
 const tx="***",desc=clean(o.desc,40);
 const acct=field("00","br.gov.bcb.pix")+field("01",KEY)+(desc?field("02",desc):"");
 const s=field("00","01")+field("26",acct)+field("52","0000")+field("53","986")+field("54",amount.toFixed(2))+field("58","BR")+field("59",NAME)+field("60",CITY)+field("62",field("05",tx))+"6304";
 return s+crc16(s)}
function qrSvg(text,px){const q=root.qrcode(0,"M");q.addData(text);q.make();const n=q.getModuleCount(),m=4,t=n+m*2;let r="";
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.isDark(y,x))r+=`M${x+m} ${y+m}h1v1h-1z`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${px||220}" height="${px||220}" shape-rendering="crispEdges" role="img" aria-label="QR Code PIX" style="background:#fff;border-radius:6px"><path d="${r}" fill="#000"/></svg>`}
root.LawlPix={KEY,payload,crc16,newTxid,qrSvg};
})(typeof window!=="undefined"?window:globalThis);

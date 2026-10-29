// Validate the browser canvas PNG before storing customer-approved artwork.
import { inflateSync } from 'node:zlib';

export function crc32(bytes) {
 let crc=0xffffffff;
 for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
export function validateCanvasPng(bytes, inflate=(data,limit)=>inflateSync(data,{maxOutputLength:limit})) {
 const invalid=()=>{throw Error('Invalid artwork. Please upload a readable image and approve it again.');};
 const uint=(offset)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(offset);
 if(bytes.length<57||bytes.length>2097152||[137,80,78,71,13,10,26,10].some((n,i)=>bytes[i]!==n))invalid();
 let offset=8,seenHeader=false,seenData=false,endedData=false,ended=false,channels=0;
 const parts=[];
 while(offset<bytes.length){
  if(bytes.length-offset<12)invalid();
  const length=uint(offset),end=offset+12+length;
  if(end>bytes.length)invalid();
  const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
  if(!/^[A-Za-z]{4}$/.test(type)||type[2]!==type[2].toUpperCase())invalid();
  if(crc32(bytes.subarray(offset+4,end-4))!==uint(end-4))invalid();
  if(!seenHeader&&type!=='IHDR')invalid();
  if(type==='IHDR'){
   if(seenHeader||length!==13||uint(offset+8)!==1200||uint(offset+12)!==1200)invalid();
   // Canvas export is non-interlaced, 8-bit RGB or RGBA.
   if(bytes[offset+16]!==8||![2,6].includes(bytes[offset+17])||bytes[offset+18]!==0||bytes[offset+19]!==0||bytes[offset+20]!==0)invalid();
   channels=bytes[offset+17]===6?4:3;seenHeader=true;
  }else if(type==='IDAT'){
   if(endedData)invalid();seenData=true;parts.push(bytes.subarray(offset+8,end-4));
  }else if(type==='IEND'){
   if(length!==0||!seenData||end!==bytes.length)invalid();ended=true;
  }else{
   if(seenData)endedData=true;
   if(type==='PLTE'){if(seenData||length===0||length>768||length%3!==0)invalid();}
   else if(type[0]===type[0].toUpperCase()||['acTL','fcTL','fdAT'].includes(type))invalid();
  }
  offset=end;
 }
 if(!ended||!seenData)invalid();
 const compressed=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));
 let position=0;for(const part of parts){compressed.set(part,position);position+=part.length;}
 const stride=1200*channels+1,expected=stride*1200;
 let pixels;try{pixels=inflate(compressed,expected);}catch{invalid();}
 if(!pixels||pixels.length!==expected)invalid();
 for(let row=0;row<1200;row++)if(pixels[row*stride]>4)invalid();
 return bytes;
}

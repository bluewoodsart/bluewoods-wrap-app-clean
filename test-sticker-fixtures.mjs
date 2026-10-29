export const join=(...parts)=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let pos=0;for(const p of parts){out.set(p,pos);pos+=p.length;}return out;};
export const word=n=>{const out=new Uint8Array(4);new DataView(out.buffer).setUint32(0,n);return out;};
export function pngFixture(crc,compressed,{width=1200,height=1200,color=6,filter=0}={}){
 const chunk=(name,data)=>{const body=join(Uint8Array.from([...name].map(c=>c.charCodeAt(0))),data);return join(word(data.length),body,word(crc(body)));};
 const header=join(word(width),word(height),Uint8Array.of(8,color,0,0,0));
 return {bytes:join(Uint8Array.of(137,80,78,71,13,10,26,10),chunk('IHDR',header),chunk('IDAT',compressed),chunk('IEND',new Uint8Array())),chunk};
}

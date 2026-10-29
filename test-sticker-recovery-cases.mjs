export async function checkRecovery({getOrCreateStickerOrder,ensureStickerArtwork,bindStickerSession},assert){
 const result=[];
 const candidate={id:'order',token_hash:'token',artwork_sha256:'1,2,3',artwork_path:'order/approved.png',delivery:'mail',amount_total:1111,stripe_mode:'test'};
 function database(seed=null){let row=seed;let failInsert=false,failUpdate=false,race=null;return {get row(){return row;},set row(value){row=value;},set race(value){race=value;},set failInsert(value){failInsert=value;},set failUpdate(value){failUpdate=value;},from(){let update=null,onlyNull=false;return {select(){return this;},eq(){return this;},is(){onlyNull=true;return this;},async maybeSingle(){return {data:row,error:null};},async insert(value){if(failInsert)return {error:{code:'08006'}};if(race){row=race;return {error:{code:'23505'}};}if(row)return {error:{code:'23505'}};row={...value,stripe_session_id:null};return {error:null};},update(value){update=value;return this;},then(resolve){if(failUpdate)return resolve({error:Error('save failed')});if(row&&(!onlyNull||row.stripe_session_id===null))row={...row,...update};resolve({error:null});}};}};}
 const db=database();await getOrCreateStickerOrder(db,candidate);assert(db.row.id==='order','create');
 await getOrCreateStickerOrder(db,candidate);assert(db.row.id==='order','retry');
 const race=database();race.race={...candidate,stripe_session_id:null};await getOrCreateStickerOrder(race,candidate);result.push('duplicate insert recovers same immutable order');
 const rejects=async(fn)=>{let rejected=false;try{await fn();}catch{rejected=true;}assert(rejected,'must reject');};
 await rejects(()=>getOrCreateStickerOrder(db,{...candidate,token_hash:'other'}));
 await rejects(()=>getOrCreateStickerOrder(db,{...candidate,artwork_sha256:'other'}));
 await rejects(()=>getOrCreateStickerOrder(db,{...candidate,delivery:'pickup'}));
 result.push('token, artwork and delivery mismatch rejected');
 const broken=database();broken.failInsert=true;await rejects(()=>getOrCreateStickerOrder(broken,candidate));result.push('non-conflict insert failure propagates');
 let stored=null,uploads=0,failUpload=true,concurrent=false;
 const bytes=Uint8Array.of(1,2,3),hash=b=>Array.from(b).join(',');
 const storage={async download(){return {data:stored?{arrayBuffer:async()=>stored.slice().buffer}:null,error:stored?null:Error('missing')};},async upload(path,value,options){uploads++;assert(options.upsert===false,'no overwrite');if(concurrent){stored=bytes;return {error:Error('exists')};}if(failUpload)return {error:Error('upload failed')};stored=value;return {error:null};}};
 await rejects(()=>ensureStickerArtwork(storage,candidate.artwork_path,bytes,candidate.artwork_sha256,hash));
 failUpload=false;await ensureStickerArtwork(storage,candidate.artwork_path,bytes,candidate.artwork_sha256,hash);
 const count=uploads;await ensureStickerArtwork(storage,candidate.artwork_path,bytes,candidate.artwork_sha256,hash);assert(uploads===count,'existing object reused');
 result.push('failed upload retries exact bytes; successful upload reused');
 stored=null;concurrent=true;await ensureStickerArtwork(storage,candidate.artwork_path,bytes,candidate.artwork_sha256,hash);result.push('concurrent object upload reconciled by stored hash');
 stored=Uint8Array.of(9);await rejects(()=>ensureStickerArtwork(storage,candidate.artwork_path,bytes,candidate.artwork_sha256,hash));result.push('mismatched stored artwork never overwritten');
 db.failUpdate=true;await rejects(()=>bindStickerSession(db,'order','cs_same'));assert(db.row.stripe_session_id===null,'failed save retained draft');
 db.failUpdate=false;await bindStickerSession(db,'order','cs_same');await bindStickerSession(db,'order','cs_same');
 await rejects(()=>bindStickerSession(db,'order','cs_other'));assert(db.row.stripe_session_id==='cs_same','session immutable');
 result.push('failed session save retry and same-session replay; different session rejected');
 return result;
}

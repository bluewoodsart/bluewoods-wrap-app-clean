// Retry only the same immutable order and artwork. Never delete a draft on upload failure.
export async function getOrCreateStickerOrder(db, candidate) {
 const find=async()=>{const {data,error}=await db.from('bwb_sticker_orders').select('*').eq('id',candidate.id).maybeSingle();if(error)throw error;return data;};
 let order=await find();
 if(!order){
  const {error}=await db.from('bwb_sticker_orders').insert(candidate);
  if(error&&error.code!=='23505')throw error;
  order=await find();
  if(!order)throw Error('Order could not be saved.');
 }
 if(order.token_hash!==candidate.token_hash)throw Error('Order reference does not match.');
 if(order.artwork_sha256!==candidate.artwork_sha256||order.delivery!==candidate.delivery||order.amount_total!==candidate.amount_total||order.stripe_mode!==candidate.stripe_mode)throw Error('Approved artwork or order details changed. Start a new order.');
 return order;
}
export async function ensureStickerArtwork(storage, path, image, expectedHash, hash) {
 const read=async()=>{const result=await storage.download(path);return {...result,bytes:result.data?new Uint8Array(await result.data.arrayBuffer()):null};};
 let stored=await read();
 if(stored.bytes){if(hash(stored.bytes)!==expectedHash)throw Error('Stored artwork does not match approval.');return;}
 // Never overwrite an object. Upload failure may mean another request already completed it.
 const uploaded=await storage.upload(path,image,{contentType:'image/png',upsert:false});
 stored=await read();
 if(stored.error||!stored.bytes||hash(stored.bytes)!==expectedHash)throw uploaded.error||stored.error||Error('Artwork is not ready.');
}
export async function bindStickerSession(db, orderId, sessionId) {
 const {error}=await db.from('bwb_sticker_orders').update({stripe_session_id:sessionId}).eq('id',orderId).is('stripe_session_id',null);
 if(error)throw error;
 const {data,error:readError}=await db.from('bwb_sticker_orders').select('stripe_session_id').eq('id',orderId).maybeSingle();
 if(readError)throw readError;
 if(data?.stripe_session_id!==sessionId)throw Error('Checkout session could not be confirmed.');
}

import { createClient } from '@supabase/supabase-js';

interface Request { method?: string; headers: Record<string,string|string[]|undefined>; body: unknown; }
interface Response { setHeader(name:string,value:string):void; status(code:number): {json(body:Record<string,unknown>):void}; }

export default async function handler(req:Request,res:Response) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') {res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const base=process.env.VITE_SUPABASE_URL;
  const anon=process.env.VITE_SUPABASE_ANON_KEY;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base || !anon || !secret) return res.status(503).json({error:'Image cleanup is not configured. Nothing was deleted.'});
  const header=req.headers.authorization;
  const token=typeof header==='string' && header.startsWith('Bearer ')?header.slice(7):'';
  if(!token) return res.status(401).json({error:'Please sign in again.'});
  const user=createClient(base,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const service=createClient(base,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const {data:identity,error:authError}=await user.auth.getUser(token);
    if(authError || !identity.user) return res.status(401).json({error:'Please sign in again.'});
    const {data:admin,error:roleError}=await service.from('admin_users').select('id').eq('auth_user_id',identity.user.id).eq('is_active',true).in('role',['owner_admin','staff']).limit(1);
    if(roleError || !admin?.length) return res.status(403).json({error:'Active staff access is required.'});
    let body: {quoteId?:string;noteId?:string;urls?:unknown;action?:string};
    try {body=typeof req.body==='string'?JSON.parse(req.body):req.body as typeof body;} catch {return res.status(400).json({error:'Invalid request.'});}
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if(!body || !uuid.test(body.quoteId || '') || !['delete','retry'].includes(body.action || '')) return res.status(400).json({error:'Choose an order and action.'});
    if(body.action==='delete') {
      if(!uuid.test(body.noteId || '') || !Array.isArray(body.urls) || !body.urls.length || body.urls.length>50 || body.urls.some(u=>typeof u!=='string' || u.length>4000)) return res.status(400).json({error:'Select 1 to 50 images.'});
      const {error}=await user.rpc('prepare_office_image_delete_admin',{p_quote_id:body.quoteId,p_note_id:body.noteId,p_urls:[...new Set(body.urls)]});
      if(error) return res.status(409).json({error:'Could not update the image message. Refresh and try again.'});
    }
    const {data:jobs,error:jobsError}=await service.from('office_image_cleanup').select('id,image_url').eq('quote_request_id',body.quoteId).in('status',['pending','failed']).limit(50);
    if(jobsError) throw jobsError;
    let deleted=0,retained=0,failed=0;
    for(const job of jobs || []) {
      let status:'deleted'|'retained'|'failed'='failed';
      try {
        const url=new URL(job.image_url);
        const match=url.pathname.match(new RegExp('^/storage/v1/object/public/(customer-uploads|customer-proofs)/(.+)
        if(url.origin!==new URL(base).origin || !match || url.search || url.hash) {status='retained';}
        else {
          const bucket=match[1],path=decodeURIComponent(match[2]);
          if(path.split('/').some(p=>!p || p==='.' || p==='..')) {status='retained';}
          else {
            const {data:inUse,error}=await service.rpc('office_image_has_references',{p_url:job.image_url,p_path:path});
            if(error || typeof inUse!=='boolean') throw error || new Error('Reference check failed.');
            if(inUse) status='retained';
            else {
              const {error:removeError}=await service.storage.from(bucket).remove([path]);
              if(removeError) throw removeError;
              status='deleted';
            }
          }
        }
      } catch {status='failed';}
      const {error:saveError}=await service.from('office_image_cleanup').update({status}).eq('id',job.id);
      if(saveError || status==='failed') failed++;
      else if(status==='deleted') deleted++;
      else retained++;
    }
    return res.status(200).json({message:'Image message updated. '+deleted+' file(s) deleted from storage; '+retained+' retained because they are referenced elsewhere or externally hosted; '+failed+' pending cleanup. '+(failed?'Use Retry file cleanup.':'')});
  } catch {
    return res.status(503).json({error:'Cleanup could not finish. Refresh the order, then use Retry file cleanup. No successful storage deletion is assumed.'});
  }
}
));
        if(url.origin!==new URL(base).origin || !match || url.search || url.hash) {status='retained';}
        else {
          const bucket=match[1],path=decodeURIComponent(match[2]);
          if(path.split('/').some(p=>!p || p==='.' || p==='..')) {status='retained';}
          else {
            const {data:inUse,error}=await service.rpc('office_image_has_references',{p_url:job.image_url,p_path:path});
            if(error || typeof inUse!=='boolean') throw error || new Error('Reference check failed.');
            if(inUse) status='retained';
            else {
              const {error:removeError}=await service.storage.from(bucket).remove([path]);
              if(removeError) throw removeError;
              status='deleted';
            }
          }
        }
      } catch {status='failed';}
      const {error:saveError}=await service.from('office_image_cleanup').update({status}).eq('id',job.id);
      if(saveError || status==='failed') failed++;
      else if(status==='deleted') deleted++;
      else retained++;
    }
    return res.status(200).json({message:'Image message updated. '+deleted+' file(s) deleted from storage; '+retained+' retained because they are referenced elsewhere or externally hosted; '+failed+' pending cleanup. '+(failed?'Use Retry file cleanup.':'')});
  } catch {
    return res.status(503).json({error:'Cleanup could not finish. Refresh the order, then use Retry file cleanup. No successful storage deletion is assumed.'});
  }
}

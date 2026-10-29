import { useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface Props { quoteId: string; customerEmail: string; disabled?: boolean; }
export default function SendCustomerProofButton({quoteId,customerEmail,disabled}: Props) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [failed,setFailed]=useState(false);
  const lock=useRef(false);
  const requestId=useRef<string | null>(null);
  const send=async()=>{
    if(lock.current || disabled) return;
    lock.current=true;setBusy(true);setMessage('');setFailed(false);
    try {
      const {data}=await supabase.auth.getSession();
      if(!data.session) throw new Error('Please sign in again.');
      requestId.current ||= crypto.randomUUID();
      const response=await fetch('/api/send-customer-proofs',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},
        body:JSON.stringify({quoteId,expectedEmail:customerEmail.trim(),requestId:requestId.current})
      });
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || 'The proof email could not be sent.');
      setMessage('Proof email sent to '+result.email+'.'+(result.historyWarning?' Order history could not be updated.':''));
      requestId.current=null;
    } catch(error) {
      setFailed(true);
      setMessage(error instanceof Error?error.message:'Could not confirm sending. Retry uses the same send request to avoid a duplicate.');
    } finally {lock.current=false;setBusy(false);}
  };
  return <div className="min-w-0 space-y-1">
    <Button type="button" disabled={disabled || busy || !customerEmail.trim()} onClick={()=>void send()} className="min-h-12 touch-manipulation">
      <Mail className="mr-2 h-4 w-4" />{busy?'Sending proofs…':'Send Proofs to Customer'}
    </Button>
    <p className="break-all text-xs text-slate-600">{customerEmail.trim()?'Email: '+customerEmail:'Add a customer email before sending.'}</p>
    <p className="text-xs text-slate-500">Sends the current saved proof set. Save changes first.</p>
    {message && <p role={failed?'alert':'status'} className={'text-sm '+(failed?'text-red-700':'text-emerald-700')}>{message}</p>}
  </div>;
}

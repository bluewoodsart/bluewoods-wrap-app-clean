import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { clearClientAuthStorage, setRepPortalSessionActive } from '@/lib/repTracking';

const Logout = () => {
  useEffect(() => {
    const finishLogout = async () => {
      setRepPortalSessionActive(false);
      clearClientAuthStorage();

      await supabase.auth.signOut({ scope: 'local' }).catch(() => null);

      setRepPortalSessionActive(false);
      clearClientAuthStorage();
      window.location.replace('/login?switchAccount=1&signedOut=1');
    };

    void finishLogout();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Signing out...
      </div>
    </div>
  );
};

export default Logout;

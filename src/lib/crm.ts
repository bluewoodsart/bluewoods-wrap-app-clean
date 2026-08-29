import { supabase } from '@/lib/supabase';

export type QuoteData = Record<string, unknown>;

export interface CrmClient {
  client_key: string;
  quote_request_id: string;
  customer_name: string;
  company_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_contact: string | null;
  latest_quote_id: string | null;
  latest_status: string;
  latest_product_type: string;
  assigned_rep_name: string | null;
  rep_slug: string | null;
  latest_activity_at: string;
  first_seen_at: string;
  quote_count: number;
  active_quote_count: number;
  archived_quote_count: number;
  quote_data: QuoteData;
}

export const getCrmClientLabel = (client: Pick<CrmClient, 'company_name' | 'customer_name'>) =>
  client.company_name.trim() || client.customer_name.trim() || 'Unnamed customer';

export const loadCrmClients = async () => {
  const { data, error } = await supabase.rpc('get_crm_clients');
  if (error) throw error;
  return (data ?? []) as CrmClient[];
};

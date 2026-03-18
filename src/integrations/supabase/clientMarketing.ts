import { createClient } from '@supabase/supabase-js';

const MARKETING_URL = import.meta.env.VITE_MARKETING_SUPABASE_URL;
const MARKETING_KEY = import.meta.env.VITE_MARKETING_SUPABASE_KEY;

export const supabaseMarketing = createClient(MARKETING_URL, MARKETING_KEY);

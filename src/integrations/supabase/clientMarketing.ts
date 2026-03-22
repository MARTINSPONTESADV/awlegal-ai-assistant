import { createClient } from '@supabase/supabase-js';

const MARKETING_URL = import.meta.env.VITE_MARKETING_SUPABASE_URL || 'https://bxmlxogitvdumkjewfug.supabase.co';
const MARKETING_KEY = import.meta.env.VITE_MARKETING_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWx4b2dpdHZkdW1ramV3ZnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzUxMjgsImV4cCI6MjA3ODcxMTEyOH0.cnBRUbBEu-1pDxiicnaW8ufkIljSa0FJ-gYhWOBfjNM';

export const supabaseMarketing = createClient(MARKETING_URL, MARKETING_KEY);

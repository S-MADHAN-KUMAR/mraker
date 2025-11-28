import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://coxyufhfpfisxbbpyidg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveHl1ZmhmcGZpc3hiYnB5aWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzQzMjIsImV4cCI6MjA3OTgxMDMyMn0.UhxC7HPrnoO8JeT_aCZjQ1eDvcSl7fMlEmFpC8FJQ9A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


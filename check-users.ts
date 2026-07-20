import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8').split('\n').reduce((acc: Record<string,string>, line) => {
  const [k, ...rest] = line.split('=');
  if (k) acc[k.trim()] = rest.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.auth.admin.listUsers();
if (error) { console.log('Error:', error.message); }
else {
  for (const u of data.users) {
    console.log('User:', u.email, 'ID:', u.id);
    // Set dashboard tier
    const { error: pe } = await supabase.from('profiles').upsert({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || '',
      subscription_tier: 'dashboard'
    });
    if (pe) console.log('  Profile error:', pe.message);
    else console.log('  Tier set to: dashboard ✅');
  }
}

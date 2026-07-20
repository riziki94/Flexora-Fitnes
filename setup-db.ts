import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8').split('\n').reduce((acc: Record<string,string>, line) => {
  const [k, ...rest] = line.split('=');
  if (k) acc[k.trim()] = rest.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Create profiles table
const { error: e1 } = await supabase.rpc('create_profiles_if_needed').maybeSingle();
if (e1) {
  console.log('Trying raw SQL...');
  const { error } = await supabase.from('profiles').select('*').limit(1);
  if (error && error.message.includes('does not exist')) {
    console.log('Table missing, creating via REST...');
    // Try to create table via management API
    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/create_tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({})
    });
    console.log('Create tables response:', resp.status);
  }
}

// Now update the user's profile tier
const { data: users } = await supabase.auth.admin.listUsers();
if (users?.users.length) {
  for (const u of users.users) {
    console.log('Setting tier for:', u.email);
    const { error: pe } = await supabase.from('profiles').upsert({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || '',
      subscription_tier: 'dashboard'
    });
    if (pe) console.log('  Profile error:', pe.message);
    else console.log('  Tier: dashboard ✅');
  }
}

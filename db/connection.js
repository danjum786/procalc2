const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Uses the SERVICE ROLE key (not the anon/public key) because this runs
// only on the backend and needs full read/write access, bypassing Row
// Level Security. Never expose this key to the frontend/browser.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;

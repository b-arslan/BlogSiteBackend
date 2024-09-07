// supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase URL ve Key bilgilerini burada ayarla
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
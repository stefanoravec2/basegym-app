import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://njkxzbwzmhovuzuoyndj.supabase.co'
const supabaseKey = 'sb_publishable_TVGHLMYHvVW12Njk2Oj9fQ_SOJxSK-b'
export const supabase = createClient(supabaseUrl, supabaseKey)

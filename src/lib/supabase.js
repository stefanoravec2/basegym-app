import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://njkxzbwzmhovuzuoyndj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qa3h6Ynd6bWhvdnV6dW95bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTgxOTgsImV4cCI6MjA5MTUzNDE5OH0.FmZldAabAE5Ac9YebKfiwwtzlC6ScRL77wJhTgZ6hjk'

export const supabase = createClient(supabaseUrl, supabaseKey)

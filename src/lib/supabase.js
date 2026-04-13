import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://skozstqrenmjuveszjik.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrb3pzdHFyZW5tanV2ZXN6amlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzE2NTYsImV4cCI6MjA5MTYwNzY1Nn0.1tyDJ3U2F4RAGyrhnz7UKZLQMT6_tlpQOGuNLIGTAfA'

export const supabase = createClient(supabaseUrl, supabaseKey)

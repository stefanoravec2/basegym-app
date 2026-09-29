import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://njkxzbwzmhovuzuoyndj.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qa3h6Ynd6bWhvdnV6dW95bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwMjg3OTIsImV4cCI6MjAzNzYwNDc5Mn0.pzfvOJEGP4a0F0vj7bwnR5JJNWzYLfQNqBT1xOEAVH0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

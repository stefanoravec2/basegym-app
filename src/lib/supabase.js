import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://njkxzbwzmhovuzuoyndj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qa3h6Ynd6bWhvdnV6dW95bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MzI2MzMsImV4cCI6MjA1ODQwODYzM30.eFKMI6tgJBMOTVDpvOEuWKSFMNwCAUfTsb0457JFbao'

export const supabase = createClient(supabaseUrl, supabaseKey)

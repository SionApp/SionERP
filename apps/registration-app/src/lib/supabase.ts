import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bhtrlwkmcchobwpjkait.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodHJsd2ttY2Nob2J3cGprYWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNjU5OTcsImV4cCI6MjA1OTc0MTk5N30.IrE38FykEQ0OWJsfQyoUE9C7lbVyrmZlSYneoIXSYnA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
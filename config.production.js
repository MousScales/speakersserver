// Production Configuration for Vercel Deployment
// These values are safe to expose (Supabase anon key is protected by RLS)
// For sensitive values, they're accessed via serverless functions

// Replace these placeholder values in Vercel deployment:
// This file should be replaced with actual values during build or use environment injection

const SUPABASE_URL = 'https://rtxpelmkxxownbafiwmz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0eHBlbG1reHhvd25iYWZpd216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTc5OTIsImV4cCI6MjA4MTQzMzk5Mn0.QKnVeBOaPYbkcSpm5zU2CtGa0uJ06z55Oas8Q-ShxZY';
const LIVEKIT_URL = 'wss://speakersserver-0je4i45z.livekit.cloud';
const TOKEN_SERVER_URL = window.location.origin + '/api/token';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Production configuration loaded');


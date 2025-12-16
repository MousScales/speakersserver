// Production Configuration for Vercel Deployment
// This file uses the deployed serverless function

// Supabase Configuration
const SUPABASE_URL = 'https://rtxpelmkxxownbafiwmz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0eHBlbG1reHhvd25iYWZpd216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTc5OTIsImV4cCI6MjA4MTQzMzk5Mn0.QKnVeBOaPYbkcSpm5zU2CtGa0uJ06z55Oas8Q-ShxZY';

// LiveKit Configuration
const LIVEKIT_URL = 'wss://speakersserver-0je4i45z.livekit.cloud';

// Use Vercel serverless function (will be /api/token on your deployed domain)
const TOKEN_SERVER_URL = window.location.origin + '/api/token';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// Supabase Configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// LiveKit Configuration
const LIVEKIT_URL = 'YOUR_LIVEKIT_URL';
const TOKEN_SERVER_URL = 'http://localhost:3000/token';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


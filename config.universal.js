// Universal Configuration
// Works for both local development and production

(function() {
    // Production values (safe to expose - Supabase anon key is protected by RLS)
    const PRODUCTION_CONFIG = {
        SUPABASE_URL: 'https://rtxpelmkxxownbafiwmz.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0eHBlbG1reHhvd25iYWZpd216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTc5OTIsImV4cCI6MjA4MTQzMzk5Mn0.QKnVeBOaPYbkcSpm5zU2CtGa0uJ06z55Oas8Q-ShxZY',
        LIVEKIT_URL: 'wss://speakersserver-0je4i45z.livekit.cloud',
        TOKEN_SERVER_URL: '/api/token'
    };

    // Check if running locally or on Vercel
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '';
    
    // For local development, try to use config.js if it exists
    // For production, use the embedded config
    if (isLocal && typeof window.LOCAL_CONFIG !== 'undefined') {
        // Local config.js was loaded first
        console.log('✅ Using local development configuration');
    } else {
        // Use production config
        window.SUPABASE_URL = PRODUCTION_CONFIG.SUPABASE_URL;
        window.SUPABASE_ANON_KEY = PRODUCTION_CONFIG.SUPABASE_ANON_KEY;
        window.LIVEKIT_URL = PRODUCTION_CONFIG.LIVEKIT_URL;
        
        // Set token server URL
        if (isLocal) {
            window.TOKEN_SERVER_URL = 'http://localhost:3001';
        } else {
            window.TOKEN_SERVER_URL = window.location.origin + PRODUCTION_CONFIG.TOKEN_SERVER_URL;
        }
        
        // Initialize Supabase client
        window.supabase = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY
        );
        
        console.log('✅ Production configuration loaded');
    }
})();


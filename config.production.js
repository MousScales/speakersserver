// Production Configuration for Vercel Deployment
// This file fetches credentials from environment endpoint

// Fetch configuration from environment
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        return config;
    } catch (error) {
        console.error('Failed to load config:', error);
        throw new Error('Configuration not available');
    }
}

// Initialize app with configuration
let supabase;
let LIVEKIT_URL;
let TOKEN_SERVER_URL;

(async function initConfig() {
    try {
        const config = await loadConfig();
        
        // Initialize Supabase client
        supabase = window.supabase.createClient(
            config.SUPABASE_URL,
            config.SUPABASE_ANON_KEY
        );
        
        LIVEKIT_URL = config.LIVEKIT_URL;
        TOKEN_SERVER_URL = window.location.origin + '/api/token';
        
        console.log('✅ Configuration loaded successfully');
        
        // Trigger app initialization event
        window.dispatchEvent(new Event('config-loaded'));
        
    } catch (error) {
        console.error('❌ Failed to initialize configuration:', error);
        alert('Failed to load application configuration. Please check your environment variables.');
    }
})();


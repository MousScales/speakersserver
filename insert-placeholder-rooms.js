// Script to insert placeholder rooms into Supabase
// Run with: node insert-placeholder-rooms.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rtxpelmkxxownbafiwmz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0eHBlbG1reHhvd25iYWZpd216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTc5OTIsImV4cCI6MjA4MTQzMzk5Mn0.QKnVeBOaPYbkcSpm5zU2CtGa0uJ06z55Oas8Q-ShxZY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function insertPlaceholderRooms() {
    console.log('🚀 Inserting placeholder rooms...\n');

    const rooms = [
        {
            title: 'Welcome to the Future of Discussion',
            description: 'Join us for an engaging conversation about the latest trends in technology and innovation. Share your thoughts, ask questions, and connect with like-minded individuals.',
            category: 'technology',
            active_participants: 5
        },
        {
            title: 'Exploring Creative Expression',
            description: 'A space for artists, creators, and enthusiasts to discuss their latest projects, share inspiration, and collaborate on new ideas. All creative minds welcome!',
            category: 'entertainment',
            active_participants: 3
        }
    ];

    try {
        const { data, error } = await supabase
            .from('rooms')
            .insert(rooms)
            .select();

        if (error) {
            console.error('❌ Error inserting rooms:', error);
            return;
        }

        console.log('✅ Successfully inserted 2 placeholder rooms:\n');
        data.forEach((room, index) => {
            console.log(`${index + 1}. ${room.title}`);
            console.log(`   Category: ${room.category}`);
            console.log(`   Participants: ${room.active_participants}`);
            console.log(`   ID: ${room.id}\n`);
        });

        console.log('🎨 You can now view these rooms at: http://localhost:8000');
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

insertPlaceholderRooms();


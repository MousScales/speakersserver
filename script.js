// Get modal and main elements
const modal = document.getElementById('createDiscussionModal');
const startBtn = document.getElementById('startDiscussionBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const discussionForm = document.getElementById('discussionForm');
const roomsGrid = document.getElementById('roomsGrid');
const tabs = document.querySelectorAll('.tab');
const loginBtn = document.getElementById('loginBtn');


// Tab filtering functionality
let currentCategory = 'all';
let allRooms = []; // Store all rooms from database

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Get selected category
        currentCategory = tab.getAttribute('data-category');
        
        // Filter and display rooms
        displayRooms(currentCategory);
    });
});

async function displayRooms(category = 'all') {
    // Clear grid
    roomsGrid.innerHTML = '';
    
    let filteredRooms = [...allRooms]; // Start with all rooms
    
    // Apply category-specific filtering and sorting
    switch(category) {
        case 'all':
            // Show all rooms, sorted by newest first
            filteredRooms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
            
        case 'debate':
            // Show only debate category rooms
            filteredRooms = allRooms.filter(room => room.category === 'debate');
            filteredRooms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
            
        case 'popular':
            // Show rooms sorted by most participants (descending)
            filteredRooms.sort((a, b) => {
                // First sort by participant count
                if (b.active_participants !== a.active_participants) {
                    return b.active_participants - a.active_participants;
                }
                // If same participant count, sort by newest
                return new Date(b.created_at) - new Date(a.created_at);
            });
            break;
            
        case 'new':
            // Show newest rooms, but filter out old ones (older than 24 hours)
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            filteredRooms = allRooms.filter(room => {
                const roomDate = new Date(room.created_at);
                return roomDate >= oneDayAgo; // Only show rooms created in last 24 hours
            });
            
            // Sort by newest first
            filteredRooms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
            
        case 'hot-takes':
            // Show only hot-takes category rooms
            filteredRooms = allRooms.filter(room => room.category === 'hot-takes');
            filteredRooms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
            
        case 'chilling':
            // Show only chilling category rooms
            filteredRooms = allRooms.filter(room => room.category === 'chilling');
            filteredRooms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
            
        default:
            // Default: show all, sorted by newest
            filteredRooms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    // Display rooms
    if (filteredRooms.length === 0) {
        let message = 'No rooms found.';
        if (category === 'new') {
            message = 'No new rooms in the last 24 hours. Be the first to create one!';
        } else if (category === 'debate') {
            message = 'No debate rooms yet. Be the first to create one!';
        } else if (category === 'hot-takes') {
            message = 'No hot take rooms yet. Be the first to create one!';
        } else if (category === 'chilling') {
            message = 'No chilling rooms yet. Be the first to create one!';
        } else {
            message = 'No rooms in this category yet. Be the first to create one!';
        }
        roomsGrid.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 3rem; width: 100%; grid-column: 1 / -1;">${message}</p>`;
        return;
    }
    
    // Create cards with async participant loading
    for (const room of filteredRooms) {
        await createRoomCard(room);
    }
}

// Open modal
startBtn.addEventListener('click', async () => {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showNotification('Please log in to create a room', 'error');
        window.location.href = 'auth.html';
        return;
    }
    
    modal.style.display = 'block';
});

// Close modal
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Handle form submission
discussionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const title = document.getElementById('discussionTitle').value;
    const description = document.getElementById('discussionDescription').value;
    const category = document.getElementById('category').value || 'general'; // Default to 'general' if empty
    
    try {
        // Insert into Supabase
        const { data, error } = await supabase
            .from('rooms')
            .insert([
                {
                    title: title,
                    description: description,
                    category: category || 'general', // Default to 'general' if empty
                    active_participants: 1
                }
            ])
            .select();
        
        if (error) throw error;
        
        // Close modal and reset form
        modal.style.display = 'none';
        discussionForm.reset();
        
        // Automatically join the room as host
        if (data && data[0]) {
            window.location.href = `room.html?id=${data[0].id}&host=true`;
        }
        
    } catch (error) {
        console.error('Error creating room:', error);
        showNotification('Failed to create room. Please try again.', 'error');
    }
});

// Helper function to capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Function to create a room card element
async function createRoomCard(room) {
    const roomCard = document.createElement('div');
    roomCard.className = 'room-card';
    roomCard.setAttribute('data-category', room.category);
    roomCard.setAttribute('data-id', room.id);
    
    // Fetch participants with their profile pictures
    let participants = [];
    try {
        // Get participants and join with user_profiles to get profile pictures
        const { data: participantsData, error: participantsError } = await supabase
            .from('room_participants')
            .select('user_id, username')
            .eq('room_id', room.id)
            .limit(5); // Only fetch first 5 for display
        
        if (!participantsError && participantsData) {
            // Get user IDs that are not anonymous
            const userIds = participantsData
                .filter(p => !p.user_id.startsWith('anonymous_'))
                .map(p => p.user_id);
            
            // Fetch profile pictures for logged-in users
            let profilePictures = {};
            if (userIds.length > 0) {
                const { data: profilesData } = await supabase
                    .from('user_profiles')
                    .select('id, profile_picture_url, display_name')
                    .in('id', userIds);
                
                if (profilesData) {
                    profilesData.forEach(profile => {
                        profilePictures[profile.id] = profile.profile_picture_url;
                    });
                }
            }
            
            // Build participants array with profile pictures
            participants = participantsData.map(p => ({
                user_id: p.user_id,
                username: p.username,
                profile_picture_url: profilePictures[p.user_id] || null
            }));
        }
    } catch (error) {
        console.error('Error fetching participants:', error);
    }
    
    // Create participant profile pictures HTML (max 5)
    let pfpsHTML = '';
    if (participants.length > 0) {
        pfpsHTML = '<div class="room-participants-pfps">';
        const displayCount = Math.min(participants.length, 5);
        
        for (let i = 0; i < displayCount; i++) {
            const participant = participants[i];
            const initial = participant.username.charAt(0).toUpperCase();
            const offset = i * -8; // Overlap profile pictures
            
            const safeUsername = escapeHtml(participant.username);
            if (participant.profile_picture_url) {
                // Show profile picture with fallback to initial
                const safeUrl = escapeHtml(participant.profile_picture_url);
                pfpsHTML += `
                    <div class="participant-pfp" style="z-index: ${10 - i}; transform: translateX(${offset}px);" title="${safeUsername}">
                        <img src="${safeUrl}" alt="${safeUsername}" onerror="this.onerror=null; this.style.display='none'; this.parentElement.textContent='${initial}';">
                        <span style="display: none;">${initial}</span>
                    </div>
                `;
            } else {
                // Show initial
                pfpsHTML += `
                    <div class="participant-pfp" style="z-index: ${10 - i}; transform: translateX(${offset}px);" title="${safeUsername}">
                        ${initial}
                    </div>
                `;
            }
        }
        
        // Show "+X" if there are more than 5 participants
        if (room.active_participants > 5) {
            const remaining = room.active_participants - 5;
            pfpsHTML += `<div class="participant-pfp more" style="z-index: 1; transform: translateX(${displayCount * -8}px);">+${remaining}</div>`;
        }
        
        pfpsHTML += '</div>';
    }
    
    // Handle category display - show badge only if category exists
    const categoryBadge = room.category 
        ? `<span class="category-badge category-${room.category}">${capitalizeFirst(room.category)}</span>`
        : '';
    
    roomCard.innerHTML = `
        <div class="room-card-inner">
            <div class="room-card-header">
                ${categoryBadge}
            </div>
            <div class="room-card-content">
                <h3 class="room-card-title">${escapeHtml(room.title)}</h3>
                <p class="room-card-description">${escapeHtml(room.description)}</p>
            </div>
            <div class="room-card-footer">
                ${pfpsHTML || '<span class="no-participants">No participants yet</span>'}
            </div>
        </div>
    `;
    
    // Add click event to the room card
    roomCard.addEventListener('click', () => {
        // Navigate to room page
        window.location.href = `room.html?id=${room.id}`;
    });
    
    roomsGrid.appendChild(roomCard);
}

// Load rooms from Supabase
async function loadRooms() {
    try {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allRooms = data;
        displayRooms(currentCategory);
        
    } catch (error) {
        console.error('Error loading rooms:', error);
        showNotification('Failed to load rooms.', 'error');
    }
}

// Subscribe to real-time changes
function subscribeToRooms() {
    supabase
        .channel('rooms_channel')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'rooms'
        }, (payload) => {
            console.log('✅ New room added:', payload.new);
            allRooms.unshift(payload.new);
            displayRooms(currentCategory);
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'rooms'
        }, (payload) => {
            console.log('✅ Room updated:', payload.new);
            const index = allRooms.findIndex(room => room.id === payload.new.id);
            if (index !== -1) {
                allRooms[index] = payload.new;
                displayRooms(currentCategory);
            } else {
                // Room might be new, add it
                allRooms.unshift(payload.new);
                displayRooms(currentCategory);
            }
        })
        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'rooms'
        }, (payload) => {
            console.log('✅ Room deleted:', payload.old);
            allRooms = allRooms.filter(room => room.id !== payload.old.id);
            displayRooms(currentCategory);
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Subscribed to real-time room updates');
            }
            if (status === 'CHANNEL_ERROR') {
                console.error('❌ Room subscription error:', err);
            }
        });
}

// Update login button based on auth status
async function updateLoginButton() {
    if (!loginBtn) return;
    if (typeof supabase === 'undefined' || supabase === null) return; // Supabase not initialized on this page
    
    const { data: { session } } = await supabase.auth.getSession();
    const settingsBtn = document.getElementById('settingsBtn');
    
    if (session) {
        loginBtn.textContent = 'Logout';
        loginBtn.href = '#';
        loginBtn.onclick = async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.reload();
        };
        // Show settings button when logged in
        if (settingsBtn) {
            settingsBtn.style.display = 'inline-block';
        }
    } else {
        loginBtn.textContent = 'Login';
        loginBtn.href = 'auth.html';
        loginBtn.onclick = null;
        // Hide settings button when not logged in
        if (settingsBtn) {
            settingsBtn.style.display = 'none';
        }
    }
}

// Initialize the app
async function init() {
    await updateLoginButton();
    await loadRooms();
    subscribeToRooms();
    
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        updateLoginButton();
    });
}

// Theme toggle functionality
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = themeToggleBtn?.querySelector('.theme-icon');

// Load saved theme or default to light
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
if (themeIcon) {
    themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// Toggle theme
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        if (themeIcon) {
            themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }
    });
}

// Run initialization when page loads
init();


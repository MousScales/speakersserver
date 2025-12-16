// Get modal and main elements
const modal = document.getElementById('createDiscussionModal');
const startBtn = document.getElementById('startDiscussionBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const discussionForm = document.getElementById('discussionForm');
const roomsGrid = document.getElementById('roomsGrid');
const tabs = document.querySelectorAll('.tab');

// Info modal elements
const infoBtn = document.getElementById('infoBtn');
const infoModal = document.getElementById('infoModal');
const closeInfoModal = document.getElementById('closeInfoModal');

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
    
    // Filter rooms
    const filteredRooms = category === 'all' 
        ? allRooms 
        : allRooms.filter(room => room.category === category);
    
    // Sort by created date (newest first)
    filteredRooms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Display rooms
    if (filteredRooms.length === 0) {
        roomsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 3rem;">No rooms in this category yet. Be the first to create one!</p>';
        return;
    }
    
    // Create cards with async participant loading
    for (const room of filteredRooms) {
        await createRoomCard(room);
    }
}

// Open modal
startBtn.addEventListener('click', () => {
    modal.style.display = 'block';
});

// Close modal
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Info modal handlers
infoBtn.addEventListener('click', () => {
    infoModal.style.display = 'block';
});

closeInfoModal.addEventListener('click', () => {
    infoModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
    if (event.target === infoModal) {
        infoModal.style.display = 'none';
    }
});

// Handle form submission
discussionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const title = document.getElementById('discussionTitle').value;
    const description = document.getElementById('discussionDescription').value;
    const category = document.getElementById('category').value;
    
    try {
        // Insert into Supabase
        const { data, error } = await supabase
            .from('rooms')
            .insert([
                {
                    title: title,
                    description: description,
                    category: category,
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
    
    // Fetch participants for this room
    let participants = [];
    try {
        const { data, error } = await supabase
            .from('room_participants')
            .select('username')
            .eq('room_id', room.id)
            .limit(8); // Show max 8 profile pictures
        
        if (!error && data) {
            participants = data;
        }
    } catch (error) {
        console.error('Error fetching participants:', error);
    }
    
    // Create participant avatars HTML
    let avatarsHTML = '';
    if (participants.length > 0) {
        avatarsHTML = '<div class="room-participants-avatars">';
        participants.forEach((participant, index) => {
            const initial = participant.username.charAt(0).toUpperCase();
            const offset = index * -8; // Overlap avatars
            avatarsHTML += `
                <div class="participant-avatar" style="z-index: ${10 - index}; transform: translateX(${offset}px);" title="${escapeHtml(participant.username)}">
                    ${initial}
                </div>
            `;
        });
        if (room.active_participants > participants.length) {
            const remaining = room.active_participants - participants.length;
            avatarsHTML += `<div class="participant-avatar more" style="z-index: 1; transform: translateX(${participants.length * -8}px);">+${remaining}</div>`;
        }
        avatarsHTML += '</div>';
    }
    
    roomCard.innerHTML = `
        <div class="room-card-inner">
            <div class="room-header">
                <div class="room-title-section">
                    <h3>${escapeHtml(room.title)}</h3>
                    <span class="category ${room.category}">${capitalizeFirst(room.category)}</span>
                </div>
            </div>
            <p class="room-description">${escapeHtml(room.description)}</p>
            <div class="room-footer">
                ${avatarsHTML}
                <div class="room-stats">
                    <span class="participants-count">👥 ${room.active_participants} ${room.active_participants === 1 ? 'person' : 'people'}</span>
                </div>
            </div>
        </div>
        <div class="room-card-glow"></div>
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

// Initialize the app
async function init() {
    await loadRooms();
    subscribeToRooms();
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


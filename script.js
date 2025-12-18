// Get modal and main elements
const modal = document.getElementById('createDiscussionModal');
const startBtn = document.getElementById('startDiscussionBtn');
const cancelBtn = document.getElementById('cancelBtn');
const discussionForm = document.getElementById('discussionForm');
const loginBtn = document.getElementById('loginBtn');


// Room organization by category
let allRooms = []; // Store all rooms from database

// Group rooms by category and display in sections
async function displayRoomsByCategory() {
    const categorySections = document.getElementById('categorySections');
    if (!categorySections) return;
    
    categorySections.innerHTML = '';
    
    // Define category order and display names
    const categoryOrder = [
        { key: 'currently-live', name: 'Currently Live', filter: (room) => (room.active_participants || 0) > 0, sort: (a, b) => (b.active_participants || 0) - (a.active_participants || 0) },
        { key: 'popular', name: 'Popular', sort: (a, b) => (b.active_participants || 0) - (a.active_participants || 0) },
        { key: 'new', name: 'New', filter: (room) => {
            const oneDayAgo = new Date();
            oneDayAgo.setHours(oneDayAgo.getHours() - 24);
            return new Date(room.created_at) >= oneDayAgo;
        }, sort: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
        { key: 'debate', name: 'Debate' },
        { key: 'hot-takes', name: 'Hot Takes' },
        { key: 'chilling', name: 'Chilling' },
        { key: 'general', name: 'General' }
    ];
    
    // Process each category
    for (const cat of categoryOrder) {
        let categoryRooms = [];
        
        if (cat.key === 'currently-live') {
            categoryRooms = allRooms.filter(cat.filter).sort(cat.sort).slice(0, 10); // Top 10 currently live
        } else if (cat.key === 'popular') {
            categoryRooms = [...allRooms].sort(cat.sort).slice(0, 10); // Top 10 popular
        } else if (cat.key === 'new') {
            categoryRooms = allRooms.filter(cat.filter).sort(cat.sort).slice(0, 10); // Top 10 new
        } else {
            categoryRooms = allRooms.filter(room => room.category === cat.key).slice(0, 10); // First 10 in category
        }
        
        // Always show the "Currently Live" section, even if empty
        if (cat.key === 'currently-live' || categoryRooms.length > 0) {
            const section = document.createElement('div');
            section.className = 'category-section';
            section.setAttribute('data-category', cat.key);
            
            const header = document.createElement('div');
            header.className = 'category-section-header';
            
            // Only show "View all" if there are rooms
            const viewAllBtn = categoryRooms.length > 0 
                ? `<button class="view-all-btn" data-category="${cat.key}">View all</button>`
                : '';
            
            header.innerHTML = `
                <h3 class="category-section-title">${cat.name}</h3>
                ${viewAllBtn}
            `;
            
            const grid = document.createElement('div');
            grid.className = 'rooms-grid';
            
            if (categoryRooms.length > 0) {
                // Create room cards for this category
                for (const room of categoryRooms) {
                    const card = await createRoomCard(room);
                    grid.appendChild(card);
                }
            } else {
                // Show "No current rooms available" message
                grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem; white-space: nowrap;">No current rooms available</p>';
            }
            
            section.appendChild(header);
            section.appendChild(grid);
            categorySections.appendChild(section);
            
            // Add click handler for "View all" button if it exists
            if (categoryRooms.length > 0) {
                const viewAllButton = header.querySelector('.view-all-btn');
                if (viewAllButton) {
                    viewAllButton.addEventListener('click', () => {
                        showCategoryView(cat.key, cat.name);
                    });
                }
            }
        }
    }
}

// Show all rooms in a category
function showCategoryView(categoryKey, categoryName) {
    const categorySections = document.getElementById('categorySections');
    if (!categorySections) return;
    
    categorySections.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <button class="btn-secondary" id="backBtn" style="margin-bottom: 1rem;">← Back</button>
            <h2 style="font-size: 2rem; font-weight: 700; color: var(--text-color); font-family: 'Poppins', sans-serif; margin-bottom: 2rem;">${categoryName}</h2>
        </div>
        <div class="rooms-grid" id="categoryRoomsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; overflow-x: visible;"></div>
    `;
    
    let filteredRooms = [];
    
    if (categoryKey === 'currently-live') {
        filteredRooms = allRooms.filter(room => (room.active_participants || 0) > 0)
            .sort((a, b) => (b.active_participants || 0) - (a.active_participants || 0));
    } else if (categoryKey === 'popular') {
        filteredRooms = [...allRooms].sort((a, b) => (b.active_participants || 0) - (a.active_participants || 0));
    } else if (categoryKey === 'new') {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        filteredRooms = allRooms.filter(room => {
            return new Date(room.created_at) >= oneDayAgo;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
        filteredRooms = allRooms.filter(room => room.category === categoryKey);
    }
    
    const grid = document.getElementById('categoryRoomsGrid');
    filteredRooms.forEach(async (room) => {
        const card = await createRoomCard(room);
        grid.appendChild(card);
    });
    
    // Back button handler
    document.getElementById('backBtn').addEventListener('click', () => {
        displayRoomsByCategory();
    });
}

// Open modal
// Multi-step modal state
let currentStep = 1;
const totalSteps = 3;

// Step navigation elements
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// Initialize modal
function initModal() {
    currentStep = 1;
    updateStepDisplay();
    discussionForm.reset();
}

function updateStepDisplay() {
    // Update step indicators
    document.querySelectorAll('.step-item').forEach((item, index) => {
        const stepNum = index + 1;
        item.classList.remove('active', 'completed');
        if (stepNum < currentStep) {
            item.classList.add('completed');
        } else if (stepNum === currentStep) {
            item.classList.add('active');
        }
    });
    
    // Update step content visibility
    document.querySelectorAll('.step-content').forEach((content, index) => {
        const stepNum = index + 1;
        content.classList.toggle('active', stepNum === currentStep);
    });
    
    // Update navigation buttons
    prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
    nextBtn.style.display = currentStep < totalSteps ? 'inline-block' : 'none';
    submitBtn.style.display = currentStep === totalSteps ? 'inline-block' : 'none';
    
    // Update review section if on step 3
    if (currentStep === 3) {
        updateReviewSection();
    }
}

function updateReviewSection() {
    const title = document.getElementById('discussionTitle').value;
    const description = document.getElementById('discussionDescription').value;
    const category = document.getElementById('category').value;
    
    document.getElementById('reviewTitle').textContent = title || 'Not set';
    document.getElementById('reviewDescription').textContent = description || 'Not set';
    
    const categorySelect = document.getElementById('category');
    const selectedOption = categorySelect.options[categorySelect.selectedIndex];
    document.getElementById('reviewCategory').textContent = category ? selectedOption.text : 'No category';
}

function validateStep(step) {
    if (step === 1) {
        const title = document.getElementById('discussionTitle').value.trim();
        const description = document.getElementById('discussionDescription').value.trim();
        return title.length > 0 && description.length > 0;
    }
    return true; // Step 2 and 3 don't require validation
}

startBtn.addEventListener('click', async () => {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showNotification('Please log in to create a room', 'error');
        window.location.href = 'auth.html';
        return;
    }
    
    initModal();
    modal.style.display = 'block';
});

// Close modal
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        initModal();
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        initModal();
    });
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
        initModal();
    }
});

// Next button
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            currentStep++;
            updateStepDisplay();
        } else {
            showNotification('Please fill in all required fields', 'error');
        }
    });
}

// Previous button
if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        currentStep--;
        updateStepDisplay();
    });
}

// Handle form submission
discussionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateStep(1)) {
        showNotification('Please fill in all required fields', 'error');
        currentStep = 1;
        updateStepDisplay();
        return;
    }
    
    // Get form values
    const title = document.getElementById('discussionTitle').value;
    const description = document.getElementById('discussionDescription').value;
    const category = document.getElementById('category').value || 'general'; // Default to 'general' if empty
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    
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
        initModal();
        
        // Automatically join the room as host
        if (data && data[0]) {
            window.location.href = `room.html?id=${data[0].id}&host=true`;
        }
        
    } catch (error) {
        console.error('Error creating room:', error);
        showNotification('Failed to create room. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Room';
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
    
    // Create participant profile pictures HTML (max 5) - separate divs
    let pfpsHTML = '';
    if (participants.length > 0) {
        pfpsHTML = '<div class="room-participants-pfps">';
        const displayCount = Math.min(participants.length, 5);
        
        for (let i = 0; i < displayCount; i++) {
            const participant = participants[i];
            const initial = participant.username.charAt(0).toUpperCase();
            
            const safeUsername = escapeHtml(participant.username);
            if (participant.profile_picture_url) {
                // Show profile picture with fallback to initial
                const safeUrl = escapeHtml(participant.profile_picture_url);
                pfpsHTML += `
                    <div class="participant-pfp" title="${safeUsername}">
                        <img src="${safeUrl}" alt="${safeUsername}" onerror="this.onerror=null; this.style.display='none'; this.parentElement.textContent='${initial}';">
                        <span style="display: none;">${initial}</span>
                    </div>
                `;
            } else {
                // Show initial
                pfpsHTML += `
                    <div class="participant-pfp" title="${safeUsername}">
                        ${initial}
                    </div>
                `;
            }
        }
        
        // Show "+X" if there are more than 5 participants
        if (room.active_participants > 5) {
            const remaining = room.active_participants - 5;
            pfpsHTML += `<div class="participant-pfp more">+${remaining}</div>`;
        }
        
        pfpsHTML += '</div>';
    }
    
    // Handle category display - badge at bottom right
    const categoryBadge = room.category 
        ? `<div class="room-card-category"><span class="category-badge category-${room.category}">${capitalizeFirst(room.category)}</span></div>`
        : '';
    
    roomCard.innerHTML = `
        <div class="room-card-inner">
            ${categoryBadge}
            <div class="room-card-content">
                <h3 class="room-card-title">${escapeHtml(room.title)}</h3>
                <div class="room-card-participants">
                    ${pfpsHTML || '<span class="no-participants">No participants yet</span>'}
                </div>
            </div>
        </div>
    `;
    
    // Add click event to the room card
    roomCard.addEventListener('click', () => {
        // Navigate to room page
        window.location.href = `room.html?id=${room.id}`;
    });
    
    return roomCard;
}

// News slideshow data
const newsItems = [
    {
        title: "Breaking: Global Climate Summit Reaches Historic Agreement",
        description: "World leaders unite on ambitious carbon reduction targets, marking a turning point in international climate policy.",
        link: "#"
    },
    {
        title: "Tech Innovation: AI Breakthrough in Medical Diagnosis",
        description: "New AI system achieves 98% accuracy in early disease detection, revolutionizing healthcare diagnostics.",
        link: "#"
    },
    {
        title: "Sports: Championship Finals Set for This Weekend",
        description: "Top teams prepare for the ultimate showdown after an intense season of competition.",
        link: "#"
    },
    {
        title: "Entertainment: Award-Winning Film Premieres Worldwide",
        description: "Critically acclaimed movie opens in theaters, receiving standing ovations from audiences.",
        link: "#"
    }
];

let currentNewsSlide = 0;

// Initialize news slideshow
function initNewsSlideshow() {
    const slideshow = document.getElementById('newsSlideshow');
    if (!slideshow) return;
    
    // Create slides
    const slidesContainer = document.createElement('div');
    slidesContainer.style.position = 'relative';
    slidesContainer.style.width = '100%';
    slidesContainer.style.height = '100%';
    
    newsItems.forEach((news, index) => {
        const slide = document.createElement('div');
        slide.className = `news-slide ${index === 0 ? 'active' : ''}`;
        slide.innerHTML = `
            <div class="news-slide-content">
                <h3 class="news-slide-title">${escapeHtml(news.title)}</h3>
                <p class="news-slide-description">${escapeHtml(news.description)}</p>
                <a href="${news.link}" class="news-slide-link">Read more →</a>
            </div>
        `;
        slidesContainer.appendChild(slide);
    });
    
    // Create indicators
    const indicators = document.createElement('div');
    indicators.className = 'news-slideshow-indicators';
    newsItems.forEach((_, index) => {
        const indicator = document.createElement('div');
        indicator.className = `news-indicator ${index === 0 ? 'active' : ''}`;
        indicator.addEventListener('click', () => {
            goToNewsSlide(index);
        });
        indicators.appendChild(indicator);
    });
    
    slideshow.appendChild(slidesContainer);
    slideshow.appendChild(indicators);
    
    // Auto-advance slides
    setInterval(() => {
        currentNewsSlide = (currentNewsSlide + 1) % newsItems.length;
        goToNewsSlide(currentNewsSlide);
    }, 5000); // Change slide every 5 seconds
}

function goToNewsSlide(index) {
    const slides = document.querySelectorAll('.news-slide');
    const indicators = document.querySelectorAll('.news-indicator');
    
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
    
    indicators.forEach((indicator, i) => {
        indicator.classList.toggle('active', i === index);
    });
    
    currentNewsSlide = index;
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
        displayRoomsByCategory();
        
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
            displayRoomsByCategory();
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
                displayRoomsByCategory();
            } else {
                // Room might be new, add it
                allRooms.unshift(payload.new);
                displayRoomsByCategory();
            }
        })
        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'rooms'
        }, (payload) => {
            console.log('✅ Room deleted:', payload.old);
            allRooms = allRooms.filter(room => room.id !== payload.old.id);
            displayRoomsByCategory();
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

// Update login button and profile picture based on auth status
async function updateLoginButton() {
    if (!loginBtn) return;
    if (typeof supabase === 'undefined' || supabase === null) return; // Supabase not initialized on this page
    
    const { data: { session } } = await supabase.auth.getSession();
    const profilePictureBtn = document.getElementById('profilePictureBtn');
    const headerProfilePicture = document.getElementById('headerProfilePicture');
    const headerProfileInitial = document.getElementById('headerProfileInitial');
    
    if (session) {
        // Hide login button
        loginBtn.style.display = 'none';
        
        // Show profile picture
        if (profilePictureBtn) {
            profilePictureBtn.style.display = 'flex';
        }
        
        // Load user profile to get profile picture
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('profile_picture_url, display_name')
            .eq('id', session.user.id)
            .single();
        
        if (profile) {
            if (profile.profile_picture_url && headerProfilePicture) {
                headerProfilePicture.src = profile.profile_picture_url;
                headerProfilePicture.style.display = 'block';
                if (headerProfileInitial) {
                    headerProfileInitial.style.display = 'none';
                }
            } else if (headerProfileInitial) {
                // Show initial if no profile picture
                const initial = (profile.display_name || 'U').charAt(0).toUpperCase();
                headerProfileInitial.textContent = initial;
                headerProfileInitial.style.display = 'flex';
                if (headerProfilePicture) {
                    headerProfilePicture.style.display = 'none';
                }
            }
        }
    } else {
        // Show login button
        loginBtn.style.display = 'inline-block';
        loginBtn.textContent = 'Login';
        loginBtn.href = 'auth.html';
        loginBtn.onclick = null;
        
        // Hide profile picture
        if (profilePictureBtn) {
            profilePictureBtn.style.display = 'none';
        }
    }
}

// Initialize the app
async function init() {
    await updateLoginButton();
    initNewsSlideshow();
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
    themeIcon.innerHTML = savedTheme === 'dark' 
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
}

// Toggle theme
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        if (themeIcon) {
            themeIcon.innerHTML = newTheme === 'dark' 
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
                : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        }
    });
}

// Run initialization when page loads
init();


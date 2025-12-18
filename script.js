// Get form elements
const createForm = document.getElementById('createConversationForm');
let startBtn = null; // Will be set dynamically when button is created
const discussionForm = document.getElementById('discussionForm');
const loginBtn = document.getElementById('loginBtn');

// Conversation form state
let currentStep = 1;
const totalSteps = 3;

// Function to setup start button event listener
function setupStartButton() {
    startBtn = document.getElementById('startDiscussionBtn');
    if (startBtn && !startBtn.hasAttribute('data-listener-attached')) {
        startBtn.setAttribute('data-listener-attached', 'true');
        startBtn.addEventListener('click', async () => {
            // Check if user is authenticated
            if (typeof supabase !== 'undefined' && supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    showNotification('Please log in to create a room', 'error');
                    window.location.href = 'auth.html';
                    return;
                }
            }
            
            if (createForm) {
                currentStep = 1;
                updateStepDisplay();
                createForm.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        });
    }
}

// Update step display
function updateStepDisplay() {
    const steps = document.querySelectorAll('.conversation-step');
    const dots = document.querySelectorAll('.pagination-dot');
    const submitBtn = document.getElementById('submitBtn');
    
    steps.forEach((step, index) => {
        if (index + 1 === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    dots.forEach((dot, index) => {
        if (index + 1 === currentStep) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Show submit button only on last step
    if (submitBtn) {
        submitBtn.style.display = currentStep === totalSteps ? 'block' : 'none';
    }
}

// Close form
function closeConversationForm() {
    if (createForm) {
        createForm.style.display = 'none';
        document.body.style.overflow = '';
        discussionForm.reset();
        currentStep = 1;
        updateStepDisplay();
    }
}


// Room organization by category
let allRooms = []; // Store all rooms from database

// Group rooms by category and display in sections
async function displayRoomsByCategory() {
    const categorySections = document.getElementById('categorySections');
    if (!categorySections) return;
    
    categorySections.innerHTML = '';
    
    // Define category order and display names
    const categoryOrder = [
        { key: 'currently-live', name: 'Currently Live', filter: () => true, sort: (a, b) => (b.active_participants || 0) - (a.active_participants || 0) },
        { key: 'popular', name: 'Popular', sort: (a, b) => (b.active_participants || 0) - (a.active_participants || 0) },
        { key: 'new', name: 'New', filter: (room) => {
            const oneDayAgo = new Date();
            oneDayAgo.setHours(oneDayAgo.getHours() - 24);
            return new Date(room.created_at) >= oneDayAgo;
        }, sort: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
        { key: 'debate', name: 'Debate' },
        { key: 'hot-takes', name: 'Hot Takes' },
        { key: 'chilling', name: 'Chilling' }
    ];
    
    // Process each category
    for (const cat of categoryOrder) {
        let categoryRooms = [];
        
        if (cat.key === 'currently-live') {
            categoryRooms = allRooms.sort(cat.sort).slice(0, 10); // Top 10 all rooms
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
            
            // Add color class for specific categories
            const categoryClass = cat.key === 'hot-takes' ? 'category-hot-takes-text' 
                : cat.key === 'debate' ? 'category-debate-text'
                : cat.key === 'chilling' ? 'category-chilling-text'
                : '';
            
            // Initially create header without "View all" button
            header.innerHTML = `
                <h3 class="category-section-title ${categoryClass}">${cat.name}</h3>
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
            
            // Check if grid scrolls (more rooms than fit in one row) and show "View all" button
            if (categoryRooms.length > 0) {
                // Wait for layout to be calculated
                requestAnimationFrame(() => {
                    // Check if the grid has horizontal scrolling (more rooms than visible)
                    if (grid.scrollWidth > grid.clientWidth) {
                        const viewAllButton = document.createElement('button');
                        viewAllButton.className = 'view-all-btn';
                        viewAllButton.setAttribute('data-category', cat.key);
                        viewAllButton.textContent = 'View all';
                        viewAllButton.addEventListener('click', () => {
                            showCategoryView(cat.key, cat.name);
                        });
                        header.appendChild(viewAllButton);
                    }
                });
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
        filteredRooms = allRooms.sort((a, b) => (b.active_participants || 0) - (a.active_participants || 0));
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

// Handle pagination dots and auto-advance
document.addEventListener('DOMContentLoaded', () => {
    const dots = document.querySelectorAll('.pagination-dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                currentStep = index + 1;
                updateStepDisplay();
            }
        });
    });
    
    // Auto-advance on input (when user types and presses Enter or clicks outside)
    const titleInput = document.getElementById('discussionTitle');
    const descriptionInput = document.getElementById('discussionDescription');
    
    if (titleInput) {
        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && currentStep === 1 && titleInput.value.trim()) {
                e.preventDefault();
                if (validateStep(1)) {
                    currentStep = 2;
                    updateStepDisplay();
                    descriptionInput?.focus();
                }
            }
        });
        
        titleInput.addEventListener('blur', () => {
            if (titleInput.value.trim() && validateStep(1)) {
                setTimeout(() => {
                    if (currentStep === 1) {
                        currentStep = 2;
                        updateStepDisplay();
                    }
                }, 500);
            }
        });
    }
    
    if (descriptionInput) {
        descriptionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey && currentStep === 2 && descriptionInput.value.trim()) {
                e.preventDefault();
                if (validateStep(2)) {
                    currentStep = 3;
                    updateStepDisplay();
                }
            }
        });
        
        descriptionInput.addEventListener('blur', () => {
            if (descriptionInput.value.trim() && validateStep(2)) {
                setTimeout(() => {
                    if (currentStep === 2) {
                        currentStep = 3;
                        updateStepDisplay();
                    }
                }, 500);
            }
        });
    }
    
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            // Auto-advance after selecting category
            if (currentStep === 3) {
                // Already on last step, just ensure submit button is visible
                updateStepDisplay();
            }
        });
    }
});

// Close form when clicking outside
if (createForm) {
    createForm.addEventListener('click', (e) => {
        if (e.target === createForm) {
            closeConversationForm();
        }
    });
}

// Navigation arrow buttons
document.addEventListener('DOMContentLoaded', () => {
    // Step 1: Next button
    const nextStepBtn1 = document.getElementById('nextStepBtn1');
    if (nextStepBtn1) {
        nextStepBtn1.addEventListener('click', () => {
            if (validateStep(1)) {
                currentStep = 2;
                updateStepDisplay();
            } else {
                showNotification('Please fill in all required fields', 'error');
            }
        });
    }

    // Step 2: Previous and Next buttons
    const prevStepBtn2 = document.getElementById('prevStepBtn2');
    const nextStepBtn2 = document.getElementById('nextStepBtn2');
    
    if (prevStepBtn2) {
        prevStepBtn2.addEventListener('click', () => {
            currentStep = 1;
            updateStepDisplay();
        });
    }
    
    if (nextStepBtn2) {
        nextStepBtn2.addEventListener('click', () => {
            if (validateStep(2)) {
                currentStep = 3;
                updateStepDisplay();
            } else {
                showNotification('Please fill in all required fields', 'error');
            }
        });
    }

    // Step 3: Previous button
    const prevStepBtn3 = document.getElementById('prevStepBtn3');
    if (prevStepBtn3) {
        prevStepBtn3.addEventListener('click', () => {
            currentStep = 2;
            updateStepDisplay();
        });
    }
});


// Handle form submission
if (discussionForm) {
    discussionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (typeof supabase === 'undefined' || !supabase) {
        showNotification('Please log in to create a room', 'error');
        window.location.href = 'auth.html';
        return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showNotification('Please log in to create a room', 'error');
        window.location.href = 'auth.html';
        return;
    }
    
    // Validate all steps
    if (!validateStep(1) || !validateStep(2)) {
        showNotification('Please fill in all required fields', 'error');
        // Go to first invalid step
        if (!validateStep(1)) {
            currentStep = 1;
        } else if (!validateStep(2)) {
            currentStep = 2;
        }
        updateStepDisplay();
        return;
    }
    
    // Get form values
    const title = document.getElementById('discussionTitle').value;
    const description = document.getElementById('discussionDescription').value;
    const category = document.getElementById('category').value || null; // No default category
    
    // Disable submit button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Starting conversation...';
    }
    
    try {
        // Insert into Supabase
        const { data, error } = await supabase
            .from('rooms')
            .insert([
                {
                    title: title,
                    description: description,
                    category: category || null, // No default category
                    active_participants: 1
                }
            ])
            .select();
        
        if (error) throw error;
        
        // Close form
        closeConversationForm();
        
        // Automatically join the room as host
        if (data && data[0]) {
            window.location.href = `room.html?id=${data[0].id}&host=true`;
        }
        
    } catch (error) {
        console.error('Error creating room:', error);
        showNotification('Failed to create room. Please try again.', 'error');
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Start your conversation';
        }
    }
    });
}

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
            .limit(12); // Fetch up to 12 for display (will stack in rows)
        
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
    
    // Get total participant count
    const participantCount = room.active_participants || participants.length || 0;
    
    // Create participant profile pictures HTML - stack in rows above category
    let pfpsHTML = '';
    if (participants.length > 0) {
        pfpsHTML = '<div class="room-participants-pfps">';
        
        // Calculate how many to show (stack in rows, leave space for category at bottom)
        // Show as many as fit in rows above the category badge
        const maxToShow = Math.min(participants.length, 12); // Show up to 12 PFPs
        
        for (let i = 0; i < maxToShow; i++) {
            const participant = participants[i];
            const initial = participant.username.charAt(0).toUpperCase();
            
            const safeUsername = escapeHtml(participant.username);
            if (participant.profile_picture_url) {
                const safeUrl = escapeHtml(participant.profile_picture_url);
                pfpsHTML += `
                    <div class="participant-pfp" title="${safeUsername}">
                        <img src="${safeUrl}" alt="${safeUsername}" onerror="this.onerror=null; this.style.display='none'; this.parentElement.textContent='${initial}';">
                        <span style="display: none;">${initial}</span>
                    </div>
                `;
            } else {
                pfpsHTML += `
                    <div class="participant-pfp" title="${safeUsername}">
                        ${initial}
                    </div>
                `;
            }
        }
        
        // Show "+X" if there are more participants
        if (participantCount > maxToShow) {
            pfpsHTML += `<div class="participant-pfp more" title="+${participantCount - maxToShow} more">+${participantCount - maxToShow}</div>`;
        }
        
        pfpsHTML += '</div>';
    }
    
    // Build the card HTML with new layout
    const categoryBadge = room.category 
        ? `<div class="room-card-category"><span class="category-badge category-${room.category}">${capitalizeFirst(room.category)}</span></div>`
        : '';
    
    // Format participant count text
    const participantText = participantCount === 0 
        ? 'No participants' 
        : participantCount === 1 
            ? '1 participant' 
            : `${participantCount} participants`;
    
    roomCard.innerHTML = `
        <div class="room-card-inner">
            <!-- Participant count top left -->
            <div class="room-card-participant-count">${participantText}</div>
            
            <!-- PFPs stacked in rows above category -->
            <div class="room-card-pfps-container">
                ${pfpsHTML || '<span class="no-participants">No participants yet</span>'}
            </div>
            
            <!-- Category badge bottom right -->
            ${categoryBadge}
        </div>
        <!-- Room title below the square -->
        <h3 class="room-card-title-below">${escapeHtml(room.title)}</h3>
    `;
    
    // Add click event to the room card
    roomCard.addEventListener('click', () => {
        // Navigate to room page
        window.location.href = `room.html?id=${room.id}`;
    });
    
    return roomCard;
}

// News slideshow data
let newsItems = [];
let currentNewsSlide = 0;

// Fetch controversial questions from Supabase
async function fetchQuestions() {
    try {
        // Check if supabase is available
        if (typeof supabase === 'undefined' || !supabase) {
            console.warn('Supabase client not available, using placeholder questions');
            newsItems = getDefaultQuestions();
            return;
        }

        // Retry logic for connection issues
        let data, error;
        let retries = 3;
        let lastError;
        
        for (let i = 0; i < retries; i++) {
            try {
                const result = await supabase
                    .from('controversial_questions')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                data = result.data;
                error = result.error;
                
                if (!error) break; // Success, exit retry loop
                
                lastError = error;
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            } catch (err) {
                lastError = err;
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }
        
        if (error || lastError) {
            console.error('Supabase error fetching questions after retries:', error || lastError);
            // If table doesn't exist, try to generate questions
            if (error && (error.code === 'PGRST116' || error.message.includes('does not exist'))) {
                console.log('Questions table not found, generating questions...');
                try {
                    const response = await fetch('/api/generate-questions', {
                        method: 'POST'
                    });
                    if (response.ok) {
                        const result = await response.json();
                        if (result.questions && result.questions.length > 0) {
                            newsItems = result.questions.map(item => ({
                                title: item.question,
                                description: item.question,
                                category: item.category || null,
                                sourceUrl: null,
                                imageUrl: null
                            }));
                            console.log('Questions generated and loaded:', newsItems.length);
                            return;
                        }
                    }
                } catch (genError) {
                    console.error('Error generating questions:', genError);
                }
            }
            throw error || lastError;
        }
        
        console.log('Questions data fetched:', data);
        
        if (data && data.length > 0) {
            newsItems = data.map(item => ({
                title: item.question,
                description: item.question,
                category: item.category || 'general',
                sourceUrl: null,
                imageUrl: null
            }));
            console.log('Questions loaded:', newsItems.length);
        } else {
            // No questions in database - trigger generation
            console.log('No questions found, generating...');
            try {
                const response = await fetch('/api/generate-questions', {
                    method: 'POST'
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.questions && result.questions.length > 0) {
                        newsItems = result.questions.map(item => ({
                            title: item.question,
                            description: item.question,
                            category: item.category || 'general',
                            sourceUrl: null,
                            imageUrl: null
                        }));
                        console.log('Questions generated and loaded:', newsItems.length);
                    } else {
                        newsItems = getDefaultQuestions();
                    }
                } else {
                    newsItems = getDefaultQuestions();
                }
            } catch (genError) {
                console.error('Error generating questions:', genError);
                newsItems = getDefaultQuestions();
            }
        }
    } catch (error) {
        console.error('Error fetching questions:', error);
        // Fallback to default questions
        newsItems = getDefaultQuestions();
    }
}

function getDefaultQuestions() {
    return [
        {
            title: "Should religious beliefs influence public policy decisions?",
            description: "Should religious beliefs influence public policy decisions?",
            category: "religion",
            sourceUrl: null,
            imageUrl: null
        },
        {
            title: "How do the core beliefs of Islam and Christianity differ, and which offers a better path to salvation?",
            description: "How do the core beliefs of Islam and Christianity differ, and which offers a better path to salvation?",
            category: "religion",
            sourceUrl: null,
            imageUrl: null
        },
        {
            title: "Is universal healthcare a fundamental right or a government overreach?",
            description: "Is universal healthcare a fundamental right or a government overreach?",
            category: "politics",
            sourceUrl: null,
            imageUrl: null
        },
        {
            title: "Do different interpretations of religious texts (like the Bible vs Quran) lead to fundamentally different moral frameworks?",
            description: "Do different interpretations of religious texts (like the Bible vs Quran) lead to fundamentally different moral frameworks?",
            category: "religion",
            sourceUrl: null,
            imageUrl: null
        },
        {
            title: "Should social media platforms have the right to censor political content?",
            description: "Should social media platforms have the right to censor political content?",
            category: "politics",
            sourceUrl: null,
            imageUrl: null
        }
    ];
}

// Initialize questions slideshow
async function initQuestionsSlideshow() {
    const slideshow = document.getElementById('newsSlideshow');
    if (!slideshow) {
        console.warn('Questions slideshow element not found');
        return;
    }
    
    // Show loading state
    slideshow.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Loading today\'s questions...</p>';
    
    // Fetch questions from database
    await fetchQuestions();
    
    if (newsItems.length === 0) {
        slideshow.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No questions available</p>';
        return;
    }
    
    // Clear loading state
    slideshow.innerHTML = '';
    
    // Create slides
    const slidesContainer = document.createElement('div');
    slidesContainer.style.position = 'relative';
    slidesContainer.style.width = '100%';
    slidesContainer.style.height = '100%';
    
    newsItems.forEach((news, index) => {
        const slide = document.createElement('div');
        slide.className = `news-slide ${index === 0 ? 'active' : ''}`;
        
        // Add background image if available
        if (news.imageUrl) {
            slide.style.backgroundImage = `url(${escapeHtml(news.imageUrl)})`;
            slide.style.backgroundSize = 'cover';
            slide.style.backgroundPosition = 'center';
        }
        
        slide.innerHTML = `
            <div class="news-slide-overlay"></div>
            <div class="news-slide-content">
                <h3 class="news-slide-title">${escapeHtml(news.title)}</h3>
                <p class="news-slide-description" style="font-style: italic; opacity: 0.9;">Join the conversation and share your perspective</p>
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
        if (newsItems.length > 0) {
            currentNewsSlide = (currentNewsSlide + 1) % newsItems.length;
            goToNewsSlide(currentNewsSlide);
        }
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

// Load sponsored rooms
async function loadSponsoredRooms() {
    const sponsoredGrid = document.getElementById('sponsoredRoomsGrid');
    const sponsoredSection = document.querySelector('.sponsored-section');
    if (!sponsoredGrid || !sponsoredSection) return;
    
    try {
        if (!supabase) {
            sponsoredGrid.innerHTML = '';
            sponsoredSection.style.display = 'none';
            return;
        }
        
        // Get current time
        const now = new Date();
        
        // Query for active sponsorships (sponsor_until > now)
        const { data: sponsoredData, error } = await supabase
            .from('rooms')
            .select('*')
            .not('sponsor_until', 'is', null)
            .gt('sponsor_until', now.toISOString())
            .order('sponsor_until', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('Error loading sponsored rooms:', error);
            sponsoredGrid.innerHTML = '';
            sponsoredSection.style.display = 'none';
            return;
        }
        
        if (!sponsoredData || sponsoredData.length === 0) {
            sponsoredGrid.innerHTML = '';
            sponsoredSection.style.display = 'none';
            return;
        }
        
        // Show section and clear grid
        sponsoredSection.style.display = 'block';
        sponsoredGrid.innerHTML = '';
        
        // Create room cards for sponsored rooms
        for (const room of sponsoredData) {
            const card = await createRoomCard(room);
            sponsoredGrid.appendChild(card);
        }
        
    } catch (error) {
        console.error('Error loading sponsored rooms:', error);
        if (sponsoredGrid) {
            sponsoredGrid.innerHTML = '';
        }
        if (sponsoredSection) {
            sponsoredSection.style.display = 'none';
        }
    }
}

// Load rooms from Supabase
async function loadRooms() {
    try {
        // Check if supabase is available
        if (!supabase) {
            console.warn('Supabase not initialized, using empty rooms array');
            allRooms = [];
            displayRoomsByCategory();
            return;
        }
        
        // Retry logic for connection issues
        let data, error;
        let retries = 3;
        let lastError;
        
        for (let i = 0; i < retries; i++) {
            try {
                const result = await supabase
                    .from('rooms')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                data = result.data;
                error = result.error;
                
                if (!error) break; // Success, exit retry loop
                
                lastError = error;
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            } catch (err) {
                lastError = err;
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }
        
        if (error || lastError) {
            throw error || lastError;
        }
        
        allRooms = data || [];
        displayRoomsByCategory();
        
    } catch (error) {
        console.error('Error loading rooms:', error);
        // Use empty array on error so app doesn't break
        allRooms = [];
        displayRoomsByCategory();
        
        // Only show notification if it's not a connection error (to avoid spam)
        const errorMsg = error?.message || String(error);
        if (!errorMsg.includes('CONNECTION') && !errorMsg.includes('ERR_CONNECTION')) {
            showNotification('Failed to load rooms. Please refresh the page.', 'error');
        }
    }
}

// Subscribe to real-time changes
function subscribeToRooms() {
    if (!supabase) {
        console.warn('Supabase not initialized, skipping real-time subscription');
        return;
    }
    
    try {
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
            // Refresh sponsored rooms when any room is updated
            loadSponsoredRooms();
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
    } catch (error) {
        console.error('Error setting up real-time subscription:', error);
    }
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

// Donate panel functionality
const donateBtn = document.getElementById('donateBtn');
const donatePanelOverlay = document.getElementById('donatePanelOverlay');
const donatePanelClose = document.getElementById('donatePanelClose');
const donateSubmitBtn = document.getElementById('donateSubmitBtn');
const donateAmountInput = document.getElementById('donateAmount');
const donateAmountDisplay = document.getElementById('donateAmountDisplay');
const donateQuickBtns = document.querySelectorAll('.donate-quick-btn');

// Stripe Elements
let stripe = null;
let cardElement = null;
let elements = null;

// Initialize amount display
if (donateAmountDisplay) {
    donateAmountDisplay.textContent = '$0';
}
if (donateAmountInput) {
    donateAmountInput.value = '$';
    donateAmountInput.placeholder = '$0';
    // Ensure input only accepts numbers
    donateAmountInput.setAttribute('type', 'text');
}

// Initialize Stripe
async function initializeStripe() {
    // Get publishable key - in production, get this from your backend
    const stripePublishableKey = 'pk_live_51SE0RVRzY93579Xl7RUF0sSnvlFTaisVn7yay1dcgpy6QVMrjkOnR35qONxlxv1XHLeosVpNmaJvvJIkgJTp6JEb00ePj10p6u';
    
    if (typeof Stripe !== 'undefined' && stripePublishableKey) {
        stripe = Stripe(stripePublishableKey);
        elements = stripe.elements({
            // Disable automatic payment methods filling for localhost/HTTP
            // This will work fine in production with HTTPS
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#3b82f6',
                    colorBackground: getComputedStyle(document.documentElement).getPropertyValue('--bg-color') || '#ffffff',
                    colorText: getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#1f2937',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '6px',
                },
            },
        });
        
        const cardElementContainer = document.getElementById('card-element');
        if (cardElementContainer) {
            // Clear any existing element first
            cardElementContainer.innerHTML = '';
            
            cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#1f2937',
                        '::placeholder': {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#6b7280',
                        },
                    },
                    invalid: {
                        color: '#ef4444',
                    },
                },
            });
            
            try {
                cardElement.mount('#card-element');
                
                // Handle real-time validation errors
                cardElement.on('change', ({error}) => {
                    const displayError = document.getElementById('card-errors');
                    if (error) {
                        displayError.textContent = error.message;
                    } else {
                        displayError.textContent = '';
                    }
                });
            } catch (error) {
                console.error('Error mounting Stripe card element:', error);
                const displayError = document.getElementById('card-errors');
                if (displayError) {
                    displayError.textContent = 'Payment form initialization failed. Please refresh the page.';
                }
            }
        }
    }
}

// Open panel
if (donateBtn && donatePanelOverlay) {
    donateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        donatePanelOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Initialize Stripe if not already done
        if (!stripe && typeof Stripe !== 'undefined') {
            await initializeStripe();
        }
        
        // Load donation data when panel opens
        await loadDonationData();
    });
}

// Close panel
if (donatePanelClose) {
    donatePanelClose.addEventListener('click', () => {
        closeDonatePanel();
    });
}

if (donatePanelOverlay) {
    donatePanelOverlay.addEventListener('click', (e) => {
        if (e.target === donatePanelOverlay) {
            closeDonatePanel();
        }
    });
}

function closeDonatePanel() {
    if (donatePanelOverlay) {
        donatePanelOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Update amount display as user types
if (donateAmountInput && donateAmountDisplay) {
    // Focus input when clicking on wrapper
    const wrapper = donateAmountInput.closest('.donate-amount-input-wrapper');
    if (wrapper) {
        wrapper.addEventListener('click', () => {
            donateAmountInput.focus();
        });
    }
    
    // Update display when input changes
    donateAmountInput.addEventListener('input', (e) => {
        // Remove all non-numeric characters (including $, commas, etc.)
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (donateAmountInput.value !== value) {
            donateAmountInput.value = value;
        }
        
        if (value) {
            const amount = parseInt(value) || 0;
            // Show dollar sign in the input field itself
            donateAmountInput.value = `$${amount.toLocaleString()}`;
            donateAmountDisplay.textContent = `$${amount.toLocaleString()}`;
        } else {
            donateAmountInput.value = '$';
            donateAmountDisplay.textContent = '$0';
        }
        
        // Remove active state from quick buttons if user is typing custom amount
        const currentValue = parseInt(value) || 0;
        const quickAmounts = Array.from(donateQuickBtns).map(btn => parseInt(btn.getAttribute('data-amount')));
        if (!quickAmounts.includes(currentValue)) {
            donateQuickBtns.forEach(btn => btn.classList.remove('active'));
        }
    });
    
    // Handle keypress - allow numbers and navigation keys
    donateAmountInput.addEventListener('keypress', (e) => {
        // Only allow numbers (0-9) and navigation keys
        if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') {
            e.preventDefault();
        }
    });
    
    // Handle keydown to manage cursor position when dollar sign is present
    donateAmountInput.addEventListener('keydown', (e) => {
        // If user tries to delete the dollar sign, prevent it and move cursor
        if ((e.key === 'Backspace' || e.key === 'Delete') && donateAmountInput.selectionStart <= 1) {
            if (donateAmountInput.value === '$' || donateAmountInput.value.length <= 1) {
                e.preventDefault();
                donateAmountInput.value = '$';
                donateAmountInput.setSelectionRange(1, 1);
            }
        }
    });
    
    // Also handle paste events to remove dollar signs and format
    donateAmountInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numbersOnly = pastedText.replace(/[^0-9]/g, '');
        if (numbersOnly) {
            const amount = parseInt(numbersOnly) || 0;
            donateAmountInput.value = `$${amount.toLocaleString()}`;
        } else {
            donateAmountInput.value = '$';
        }
        donateAmountInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    
}

// Quick amount buttons
donateQuickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const amount = btn.getAttribute('data-amount');
        if (donateAmountInput) {
            // Format with dollar sign
            donateAmountInput.value = `$${parseInt(amount).toLocaleString()}`;
            // Trigger input event to update display
            donateAmountInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (donateAmountDisplay) {
            donateAmountDisplay.textContent = `$${parseInt(amount).toLocaleString()}`;
        }
        
        // Update active state
        donateQuickBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Focus input after selecting quick amount so user can edit
        if (donateAmountInput) {
            setTimeout(() => {
                donateAmountInput.focus();
                // Select all text except the $ sign so user can immediately type to replace or edit
                donateAmountInput.setSelectionRange(1, donateAmountInput.value.length);
            }, 10);
        }
    });
});

if (donateSubmitBtn && donateAmountInput) {
    donateSubmitBtn.addEventListener('click', async () => {
        const amount = parseFloat(donateAmountInput.value);
        
        if (!amount || amount < 1) {
            showNotification('Please enter a valid amount (minimum $1)', 'error');
            return;
        }
        
        if (!cardElement) {
            showNotification('Payment form not ready. Please wait...', 'error');
            return;
        }
        
        // Disable button
        donateSubmitBtn.disabled = true;
        donateSubmitBtn.textContent = 'Processing...';
        
        try {
            // Get user info for donation
            let donorName = 'Anonymous';
            let userId = null;
            if (typeof supabase !== 'undefined' && supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    userId = session.user.id;
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('display_name')
                        .eq('id', session.user.id)
                        .single();
                    
                    if (profile && profile.display_name) {
                        donorName = profile.display_name;
                    }
                }
            }
            
            // Create payment intent on backend
            const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount: amount * 100, // Convert to cents
                    donorName: donorName,
                    userId: userId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create payment');
            }
            
            const { clientSecret } = await response.json();
            
            if (!clientSecret) {
                throw new Error('No client secret returned');
            }
            
            // Confirm payment with Stripe
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                }
            });
            
            if (stripeError) {
                throw new Error(stripeError.message);
            }
            
            if (paymentIntent.status === 'succeeded') {
                showNotification('Thank you for your donation!', 'success');
                
                // Refresh leaderboard and recent donations immediately
                await loadDonationData();
                
                // Small delay before closing to show updated data
                setTimeout(() => {
                    closeDonatePanel();
                    // Reset form
                    donateAmountInput.value = '$';
                    if (donateAmountDisplay) {
                        donateAmountDisplay.textContent = '$0';
                    }
                    if (cardElement) {
                        cardElement.clear();
                    }
                }, 1500);
            }
            
        } catch (error) {
            console.error('Donation error:', error);
            showNotification(error.message || 'Failed to process donation. Please try again.', 'error');
        } finally {
            if (donateSubmitBtn) {
                donateSubmitBtn.disabled = false;
                donateSubmitBtn.textContent = 'Donate';
            }
        }
    });
}

// Load donation data (leaderboard and recent donations)
async function loadDonationData() {
    try {
        // Try API endpoint first (for production)
        let leaderboard = [];
        let recent = [];
        
        try {
            const response = await fetch('/api/get-donations');
            
            // Check if API endpoint exists (404 means it's not available locally)
            if (response.status === 404) {
                // API not available locally - fetch directly from Supabase
                throw new Error('API not available, using direct Supabase query');
            }
            
            if (!response.ok) {
                throw new Error(`Failed to fetch donations: ${response.status}`);
            }
            
            const data = await response.json();
            leaderboard = data.leaderboard || [];
            recent = data.recent || [];
        } catch (apiError) {
            // Fallback: Query Supabase directly (for localhost)
            console.log('API not available, querying Supabase directly...');
            
            if (!supabase) {
                throw new Error('Supabase client not initialized');
            }
            
            // Get all succeeded donations (exclude Anonymous for leaderboard)
            const { data: allDonations, error: topError } = await supabase
                .from('donations')
                .select('donor_name, amount')
                .eq('status', 'succeeded')
                .neq('donor_name', 'Anonymous');
            
            if (topError) {
                // If table doesn't exist, return empty arrays
                if (topError.code === 'PGRST116' || topError.message.includes('relation') || topError.message.includes('does not exist')) {
                    leaderboard = [];
                    recent = [];
                } else {
                    throw topError;
                }
            } else {
                // Group by donor_name and sum amounts for leaderboard
                const leaderboardMap = new Map();
                (allDonations || []).forEach(donation => {
                    if (donation.donor_name && donation.donor_name !== 'Anonymous') {
                        const current = leaderboardMap.get(donation.donor_name) || 0;
                        leaderboardMap.set(donation.donor_name, current + donation.amount);
                    }
                });
                
                leaderboard = Array.from(leaderboardMap.entries())
                    .map(([name, total]) => ({ name, total }))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 3);
                
                // Get recent donations (only succeeded, exclude Anonymous)
                const { data: recentDonations, error: recentError } = await supabase
                    .from('donations')
                    .select('donor_name, amount, created_at')
                    .eq('status', 'succeeded')
                    .neq('donor_name', 'Anonymous')
                    .order('created_at', { ascending: false })
                    .limit(5);
                
                if (!recentError && recentDonations) {
                    recent = recentDonations.map(donation => ({
                        name: donation.donor_name,
                        amount: donation.amount,
                        time: formatRelativeTime(new Date(donation.created_at))
                    }));
                }
            }
        }
        
        // Update leaderboard
        const leaderboardContainer = document.getElementById('donateLeaderboard');
        if (leaderboardContainer) {
            if (leaderboard && leaderboard.length > 0) {
                leaderboardContainer.innerHTML = '';
                leaderboard.forEach((donor, index) => {
                    const item = document.createElement('div');
                    const rank = index + 1;
                    let rankClass = '';
                    if (rank === 1) rankClass = 'leaderboard-rank-gold';
                    else if (rank === 2) rankClass = 'leaderboard-rank-silver';
                    else if (rank === 3) rankClass = 'leaderboard-rank-bronze';
                    
                    item.className = 'donate-leaderboard-item';
                    item.innerHTML = `
                        <span class="leaderboard-rank ${rankClass}">${rank}</span>
                        <span class="leaderboard-name">${escapeHtml(donor.name)}</span>
                        <span class="leaderboard-amount">$${(donor.total / 100).toLocaleString()}</span>
                    `;
                    leaderboardContainer.appendChild(item);
                });
            } else {
                leaderboardContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No donations yet</p>';
            }
        }
        
        // Update recent donations
        const recentContainer = document.getElementById('donateRecentList');
        if (recentContainer) {
            if (recent && recent.length > 0) {
                recentContainer.innerHTML = '';
                recent.forEach(donation => {
                    const item = document.createElement('div');
                    item.className = 'donate-recent-item';
                    item.innerHTML = `
                        <span class="recent-name">${escapeHtml(donation.name)}</span>
                        <span class="recent-amount">$${(donation.amount / 100).toLocaleString()}</span>
                        <span class="recent-time">${escapeHtml(donation.time)}</span>
                    `;
                    recentContainer.appendChild(item);
                });
            } else {
                recentContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No recent donations</p>';
            }
        }
    } catch (error) {
        console.error('Error loading donation data:', error);
        // Show empty state instead of error (API might not be available locally)
        const leaderboardContainer = document.getElementById('donateLeaderboard');
        const recentContainer = document.getElementById('donateRecentList');
        if (leaderboardContainer) {
            leaderboardContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No donations yet</p>';
        }
        if (recentContainer) {
            recentContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No recent donations</p>';
        }
    }
}

// Helper function to format relative time
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

// Initialize the app
async function init() {
    setupStartButton(); // Setup the start conversation button
    await updateLoginButton();
    initQuestionsSlideshow();
    await loadSponsoredRooms();
    await loadRooms();
    subscribeToRooms();
    
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        updateLoginButton();
    });
    
    // Refresh sponsored rooms every minute
    setInterval(() => {
        loadSponsoredRooms();
    }, 60000);
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



// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('id');
const isHost = urlParams.get('host') === 'true';

// Get DOM elements
const usernameModal = document.getElementById('usernameModal');
const usernameForm = document.getElementById('usernameForm');
const usernameInput = document.getElementById('username');
const roomTitle = document.getElementById('roomTitle');
const roomCategory = document.getElementById('roomCategory');
const roomRole = document.getElementById('roomRole');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const leaveBtn = document.getElementById('leaveBtn');
const raiseHandBtn = document.getElementById('raiseHandBtn');
const micBtn = document.getElementById('micBtn');
const videoBtn = document.getElementById('videoBtn');
const screenShareBtn = document.getElementById('screenShareBtn');
const participantsBtn = document.getElementById('participantsBtn');
const participantCount = document.getElementById('participantCount');
const participantsPanel = document.getElementById('participantsPanel');
const closePanelBtn = document.getElementById('closePanelBtn');
const panelContent = document.getElementById('panelContent');
const videoPlaceholder = document.getElementById('videoPlaceholder');
const placeholderText = document.getElementById('placeholderText');
const speakersContainer = document.getElementById('speakersContainer');

// State
let currentUsername = '';
let currentUserId = '';
let currentRole = 'participant'; // participant, speaker, moderator, host
let handRaised = false;
let participants = [];
let currentTab = 'all';

// LiveKit State
let livekitRoom = null;
let isMicOn = false;
let isVideoOn = false;
let isScreenSharing = false;
let localAudioTrack = null;
let localVideoTrack = null;
let screenShareTrack = null;

// Client-side muted participants (Set of user IDs)
let mutedParticipants = new Set();

// Check if room ID exists
if (!roomId) {
    alert('No room ID provided!');
    window.location.href = 'index.html';
}

// Check for existing session (page refresh)
(async function checkSession() {
    const sessionKey = `room_session_${roomId}`;
    const existingSession = localStorage.getItem(sessionKey);

    if (existingSession) {
        try {
            const session = JSON.parse(existingSession);
            
            // Restore session data
            currentUsername = session.username;
            currentUserId = session.userId;
            currentRole = session.role || 'participant';
            
            console.log('✅ Restored session:', { username: currentUsername, userId: currentUserId, role: currentRole });
            
            // Hide modal and rejoin automatically
            usernameModal.style.display = 'none';
            
            // Hide placeholder immediately (host or any role)
            if (videoPlaceholder) videoPlaceholder.style.display = 'none';
            if (speakersContainer) speakersContainer.style.display = 'grid';
            
            // Verify participant still exists in database
            const { data: existingParticipant } = await supabase
                .from('room_participants')
                .select('*')
                .eq('room_id', roomId)
                .eq('user_id', currentUserId)
                .single();
            
            if (existingParticipant) {
                // Update role from database (might have changed)
                currentRole = existingParticipant.role;
                
                // Load room and continue
                await loadRoom();
                await updateUIForRole();
                subscribeToChat();
                subscribeToParticipants();
                
                showNotification('Welcome back!', 'success');
            } else {
                // Participant no longer in room, rejoin
                await loadRoom();
                await joinRoom();
                await updateUIForRole();
                subscribeToChat();
                subscribeToParticipants();
            }
            
        } catch (error) {
            console.error('Error restoring session:', error);
            // Clear invalid session
            localStorage.removeItem(sessionKey);
            // Show username modal
            usernameModal.style.display = 'flex';
        }
    } else {
        // No existing session, show username modal
        usernameModal.style.display = 'flex';
    }
})();

// Handle username submission
usernameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    currentUsername = usernameInput.value.trim();
    
    if (!currentUsername) return;
    
    // Generate unique user ID
    currentUserId = generateUserId();
    
    // Set role
    currentRole = isHost ? 'host' : 'participant';
    
    // Save session to localStorage
    saveSession();
    
    // Close modal
    usernameModal.style.display = 'none';
    
    // Hide placeholder immediately for all users
    if (videoPlaceholder) videoPlaceholder.style.display = 'none';
    if (speakersContainer) speakersContainer.style.display = 'grid';
    
    // Load room data
    await loadRoom();
    
    // Join room
    await joinRoom();
    
    // Update UI based on role
    updateUIForRole();
    
    // Subscribe to updates
    subscribeToChat();
    subscribeToParticipants();
});

// Generate unique user ID
function generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Save session to localStorage
function saveSession() {
    const sessionKey = `room_session_${roomId}`;
    const sessionData = {
        username: currentUsername,
        userId: currentUserId,
        role: currentRole,
        timestamp: Date.now()
    };
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    console.log('💾 Session saved');
}

// Clear session from localStorage
function clearSession() {
    const sessionKey = `room_session_${roomId}`;
    localStorage.removeItem(sessionKey);
    console.log('🗑️ Session cleared');
}

// Load room information
async function loadRoom() {
    try {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();
        
        if (error) throw error;
        
        if (!data) {
            alert('Room not found!');
            window.location.href = 'index.html';
            return;
        }
        
        // Update UI
        roomTitle.textContent = data.title;
        roomCategory.textContent = capitalizeFirst(data.category);
        roomCategory.className = `room-category category ${data.category}`;
        
    } catch (error) {
        console.error('Error loading room:', error);
        alert('Failed to load room!');
        window.location.href = 'index.html';
    }
}

// Join room (add to participants)
async function joinRoom() {
    try {
        const { error } = await supabase
            .from('room_participants')
            .insert([{
                room_id: roomId,
                user_id: currentUserId,
                username: currentUsername,
                role: currentRole,
                hand_raised: false,
                is_speaking: currentRole === 'host',
                joined_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        await loadParticipants();
        
    } catch (error) {
        console.error('Error joining room:', error);
    }
}

// Update UI based on role
async function updateUIForRole() {
    roomRole.textContent = capitalizeFirst(currentRole);
    
    if (currentRole === 'participant') {
        roomRole.style.background = '#f1f5f9';
        roomRole.style.color = '#64748b';
        raiseHandBtn.style.display = 'flex';
        micBtn.style.display = 'none';
        videoBtn.style.display = 'none';
        if (screenShareBtn) screenShareBtn.style.display = 'none';
        
        // Show video area immediately (no placeholder)
        videoPlaceholder.style.display = 'none';
        speakersContainer.style.display = 'grid';
        
        // Connect to LiveKit as viewer (watch only, no publish)
        await connectToLiveKit(false);
        
    } else if (currentRole === 'speaker' || currentRole === 'moderator' || currentRole === 'host') {
        if (currentRole === 'speaker') {
            roomRole.style.background = '#d1fae5';
            roomRole.style.color = '#065f46';
        } else if (currentRole === 'moderator') {
            roomRole.style.background = '#ede9fe';
            roomRole.style.color = '#5b21b6';
        } else {
            roomRole.style.background = '#dbeafe';
            roomRole.style.color = '#1e40af';
        }
        
        micBtn.style.display = 'flex';
        videoBtn.style.display = 'flex';
        if (screenShareBtn) screenShareBtn.style.display = 'flex';
        
        // Everyone can see participants panel
        participantsBtn.style.display = 'flex';
        
        // Show video area immediately (no placeholder)
        videoPlaceholder.style.display = 'none';
        speakersContainer.style.display = 'grid';
        
        // Connect to LiveKit with publish permission
        await connectToLiveKit(true);
    }
    
    updateSpeakersList();
}

// Load participants
async function loadParticipants() {
    try {
        const { data, error } = await supabase
            .from('room_participants')
            .select('*')
            .eq('room_id', roomId)
            .order('joined_at', { ascending: true });
        
        if (error) throw error;
        
        participants = data || [];
        
        if (participantCount) {
            participantCount.textContent = participants.length;
        }
        
        updateParticipantsPanel();
        updateSpeakersList();
        
    } catch (error) {
        console.error('Error loading participants:', error);
    }
}

// Update participants panel
function updateParticipantsPanel() {
    if (!panelContent) return;
    
    const allCount = document.getElementById('allCount');
    const speakersCount = document.getElementById('speakersCount');
    const raisedCount = document.getElementById('raisedCount');
    
    const speakers = participants.filter(p => p.is_speaking);
    const raised = participants.filter(p => p.hand_raised);
    
    if (allCount) allCount.textContent = participants.length;
    if (speakersCount) speakersCount.textContent = speakers.length;
    if (raisedCount) raisedCount.textContent = raised.length;
    
    panelContent.innerHTML = '';
    
    let filteredParticipants = participants;
    if (currentTab === 'speakers') {
        filteredParticipants = speakers;
    } else if (currentTab === 'raised') {
        filteredParticipants = raised;
    }
    
    filteredParticipants.forEach(participant => {
        const item = document.createElement('div');
        item.className = 'participant-item';
        
        const initial = participant.username.charAt(0).toUpperCase();
        const isMe = participant.user_id === currentUserId;
        const canModerate = (currentRole === 'host' || currentRole === 'moderator') && !isMe;
        const isTargetHost = participant.role === 'host';
        
        let roleBadge = '';
        if (participant.role === 'host') roleBadge = '<span class="role-badge host">Host</span>';
        else if (participant.role === 'moderator') roleBadge = '<span class="role-badge moderator">Mod</span>';
        else if (participant.is_speaking) roleBadge = '<span class="role-badge speaker">Speaking</span>';
        
        let handIcon = '';
        if (participant.hand_raised) {
            // Calculate hand raise duration
            let timerText = '';
            if (participant.hand_raised_at) {
                const raisedAt = new Date(participant.hand_raised_at);
                const now = new Date();
                const diffMs = now - raisedAt;
                const diffMins = Math.floor(diffMs / 60000);
                const diffSecs = Math.floor((diffMs % 60000) / 1000);
                timerText = ` <span class="hand-raise-timer">(${diffMins}:${diffSecs.toString().padStart(2, '0')})</span>`;
            }
            handIcon = `<span class="hand-raised">✋${timerText}</span>`;
        }
        
        let actions = '';
        
        // Host/Moderator actions (make mod, kick) - NO invite button
        if (canModerate && !isTargetHost) {
            if (currentRole === 'host' && participant.role === 'speaker') {
                actions += `<button class="action-btn" onclick="makeModeratorFunc('${participant.user_id}')">👑 Mod</button>`;
            }
            actions += `<button class="action-btn remove" onclick="kickParticipant('${participant.user_id}')">✕ Kick</button>`;
        }
        
        // EVERYONE can mute anyone (client-side only, user-specific)
        if (participant.user_id !== currentUserId) {
            const isMuted = mutedParticipants.has(participant.user_id);
            actions += `<button class="action-btn mute" onclick="toggleMuteParticipant('${participant.user_id}')">${isMuted ? '🔊 Unmute' : '🔇 Mute'}</button>`;
        }
        
        // Moderators can't kick/mute host
        if (canModerate && isTargetHost && currentRole === 'moderator') {
            actions = '';
        }
        
        // Make item clickable if hand is raised and user is host/moderator
        let clickable = false;
        if (participant.hand_raised && !participant.is_speaking && canModerate && !isTargetHost) {
            clickable = true;
            item.style.cursor = 'pointer';
            item.style.backgroundColor = '#fef3c7';
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.participant-actions')) return;
                inviteToSpeak(participant.user_id);
            });
        }
        
        item.setAttribute('data-user-id', participant.user_id);
        item.innerHTML = `
            <div class="participant-avatar">${initial}</div>
            <div class="participant-info">
                <div class="participant-name">
                    ${escapeHtml(participant.username)}${isMe ? ' (You)' : ''}
                    ${roleBadge}
                    ${handIcon}
                    ${clickable ? '<span style="color: #92400e; font-size: 0.75rem; margin-left: 8px;">(Click to invite)</span>' : ''}
                </div>
            </div>
            <div class="participant-actions">
                ${actions}
            </div>
        `;
        
        panelContent.appendChild(item);
    });
}

// Update speakers list in main view
function updateSpeakersList() {
    if (!speakersContainer) return;
    
    const speakers = participants.filter(p => p.is_speaking);
    
    speakersContainer.innerHTML = '';
    
    speakers.forEach(speaker => {
        const tile = document.createElement('div');
        tile.className = 'speaker-tile';
        
        const initial = speaker.username.charAt(0).toUpperCase();
        
        tile.innerHTML = `
            <div class="speaker-avatar">${initial}</div>
            <div class="speaker-name">
                ${escapeHtml(speaker.username)}
                ${speaker.role === 'host' ? '<span class="speaker-status">(Host)</span>' : ''}
                ${speaker.role === 'moderator' ? '<span class="speaker-status">(Mod)</span>' : ''}
            </div>
        `;
        
        speakersContainer.appendChild(tile);
    });
}

// Raise/lower hand
async function toggleHandRaise() {
    handRaised = !handRaised;
    
    try {
        const updateData = { 
            hand_raised: handRaised 
        };
        
        // Set timestamp when raising hand
        if (handRaised) {
            updateData.hand_raised_at = new Date().toISOString();
        } else {
            updateData.hand_raised_at = null;
        }
        
        const { error } = await supabase
            .from('room_participants')
            .update(updateData)
            .eq('room_id', roomId)
            .eq('user_id', currentUserId);
        
        if (error) throw error;
        
        if (handRaised) {
            raiseHandBtn.classList.add('raised');
            raiseHandBtn.innerHTML = '<span>✋</span> Hand Raised';
            showNotification('Hand raised! Waiting for host...', 'success');
        } else {
            raiseHandBtn.classList.remove('raised');
            raiseHandBtn.innerHTML = '<span>✋</span> Raise Hand';
            showNotification('Hand lowered', 'success');
        }
        
        // Refresh participants to update timer
        loadParticipants();
        
    } catch (error) {
        console.error('Error toggling hand:', error);
    }
}

// Invite to speak (host only, only if hand is raised)
window.inviteToSpeak = async function(userId) {
    try {
        // Check if participant has raised their hand
        const { data: participant } = await supabase
            .from('room_participants')
            .select('hand_raised')
            .eq('room_id', roomId)
            .eq('user_id', userId)
            .single();
        
        if (!participant || !participant.hand_raised) {
            showNotification('Participant must raise their hand first', 'error');
            return;
        }
        
        const { error } = await supabase
            .from('room_participants')
            .update({ 
                is_speaking: true, 
                hand_raised: false,
                hand_raised_at: null,
                role: 'speaker'
            })
            .eq('room_id', roomId)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        showNotification('Invited to speak', 'success');
        
    } catch (error) {
        console.error('Error inviting to speak:', error);
    }
};

// Client-side mute/unmute (EVERYONE can do this, user-specific only)
window.toggleMuteParticipant = function(userId) {
    // Find the participant's identity from LiveKit
    let participantIdentity = userId;
    let participantName = '';
    
    // Try to find the participant in LiveKit room
    if (livekitRoom) {
        const participant = Array.from(livekitRoom.remoteParticipants.values())
            .find(p => p.identity === userId || p.name === userId);
        if (participant) {
            participantIdentity = participant.identity;
            participantName = participant.name || participant.identity;
        }
    }
    
    // Also try to find in participants array
    const participantData = participants.find(p => p.user_id === userId);
    if (participantData) {
        participantName = participantData.username;
    }
    
    if (mutedParticipants.has(participantIdentity)) {
        // Unmute
        mutedParticipants.delete(participantIdentity);
        
        // Find and unmute ALL audio elements for this participant
        const audioElements = document.querySelectorAll(`audio[data-participant-id="${participantIdentity}"]`);
        audioElements.forEach(audioElement => {
            audioElement.muted = false;
            audioElement.volume = 1.0;
        });
        
        // Update mute indicator on video tile
        const tile = document.querySelector(`[data-participant-id="${participantIdentity}"]`);
        if (tile) {
            const muteIndicator = tile.querySelector('.mute-indicator');
            if (muteIndicator) {
                muteIndicator.style.display = 'none';
            }
        }
        
        console.log('🔊 Unmuted participant:', participantIdentity, '(for you only)');
        showNotification(`${participantName || 'Participant'} unmuted (for you)`, 'success');
    } else {
        // Mute
        mutedParticipants.add(participantIdentity);
        
        // Find and mute ALL audio elements for this participant
        const audioElements = document.querySelectorAll(`audio[data-participant-id="${participantIdentity}"]`);
        audioElements.forEach(audioElement => {
            audioElement.muted = true;
            audioElement.volume = 0;
        });
        
        // Update mute indicator on video tile
        const tile = document.querySelector(`[data-participant-id="${participantIdentity}"]`);
        if (tile) {
            const muteIndicator = tile.querySelector('.mute-indicator');
            if (muteIndicator) {
                muteIndicator.style.display = 'block';
            }
        }
        
        console.log('🔇 Muted participant:', participantIdentity, '(for you only)');
        showNotification(`${participantName || 'Participant'} muted (for you)`, 'success');
    }
    
    // Refresh panel to update button text
    loadParticipants();
};

// Make moderator (host only)
window.makeModeratorFunc = async function(userId) {
    try {
        const { error } = await supabase
            .from('room_participants')
            .update({ role: 'moderator' })
            .eq('room_id', roomId)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        showNotification('Made moderator', 'success');
        
    } catch (error) {
        console.error('Error making moderator:', error);
    }
};

// Kick participant
window.kickParticipant = async function(userId) {
    if (!confirm('Are you sure you want to kick this participant?')) return;
    
    try {
        const { error } = await supabase
            .from('room_participants')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        showNotification('Participant removed', 'success');
        
    } catch (error) {
        console.error('Error kicking participant:', error);
    }
};

// Send message
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    try {
        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                room_id: roomId,
                user_id: currentUserId,
                username: currentUsername,
                message: message,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        chatInput.value = '';
        
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
    }
}

// Load chat messages
async function loadMessages() {
    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
            .limit(100);
        
        if (error) throw error;
        
        chatMessages.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(msg => {
                displayMessage(msg);
            });
        }
        
        scrollToBottom();
        
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Display a message
function displayMessage(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    if (msg.user_id === currentUserId) {
        messageDiv.classList.add('own');
    }
    
    const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
        <div class="chat-message-header">
            <span class="chat-message-author">${escapeHtml(msg.username)}</span>
            <span class="chat-message-time">${time}</span>
        </div>
        <div class="chat-message-content">${escapeHtml(msg.message)}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
}

// Scroll chat to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Subscribe to chat messages
function subscribeToChat() {
    loadMessages();
    
    const chatChannel = supabase.channel('chat_channel_' + roomId, {
        config: {
            broadcast: { self: true },
            presence: { key: currentUserId }
        }
    });
    
    chatChannel
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${roomId}`
        }, (payload) => {
            console.log('✅ Real-time chat message received:', payload.new);
            displayMessage(payload.new);
            scrollToBottom();
        })
        .subscribe((status, err) => {
            console.log('Chat subscription status:', status);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Successfully subscribed to real-time chat');
            }
            if (status === 'CHANNEL_ERROR') {
                console.error('❌ Chat subscription error:', err);
                console.error('Real-time may not be enabled. Run SUPABASE_REALTIME_FIX.sql');
            }
            if (status === 'TIMED_OUT') {
                console.error('❌ Chat subscription timed out');
            }
        });
}

// Subscribe to participant changes
function subscribeToParticipants() {
    supabase
        .channel('participants_channel_' + roomId)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'room_participants',
            filter: `room_id=eq.${roomId}`
        }, async (payload) => {
            // Check if current user was kicked
            if (payload.eventType === 'DELETE' && payload.old.user_id === currentUserId) {
                clearSession();
                alert('You have been removed from the room');
                window.location.href = 'index.html';
                return;
            }
            
            // Check for hand raises (notify host/moderators)
            if (payload.eventType === 'UPDATE' && 
                payload.new.hand_raised && 
                !payload.old.hand_raised &&
                payload.new.user_id !== currentUserId &&
                (currentRole === 'host' || currentRole === 'moderator')) {
                
                // Someone raised their hand
                showHandRaiseNotification(payload.new.username);
            }
            
            // Check if current user's role changed
            if (payload.eventType === 'UPDATE' && payload.new.user_id === currentUserId) {
                if (payload.new.role !== currentRole) {
                    currentRole = payload.new.role;
                    saveSession(); // Update saved role
                    updateUIForRole();
                }
                if (payload.new.is_speaking && currentRole === 'speaker') {
                    updateUIForRole();
                }
            }
            
            // If someone left, check if room should be deleted
            if (payload.eventType === 'DELETE') {
                await checkRoomStatus();
            }
            
            loadParticipants();
        })
        .subscribe();
    
    // Update hand raise timers every second
    setInterval(() => {
        updateHandRaiseTimers();
    }, 1000);
}

// Update hand raise timers in real-time
function updateHandRaiseTimers() {
    const timerElements = document.querySelectorAll('.hand-raise-timer');
    timerElements.forEach(timerEl => {
        const participantItem = timerEl.closest('.participant-item');
        if (!participantItem) return;
        
        // Find participant data
        const itemUserId = participantItem.getAttribute('data-user-id');
        const participant = participants.find(p => p.user_id === itemUserId);
        
        if (participant && participant.hand_raised && participant.hand_raised_at) {
            const raisedAt = new Date(participant.hand_raised_at);
            const now = new Date();
            const diffMs = now - raisedAt;
            const diffMins = Math.floor(diffMs / 60000);
            const diffSecs = Math.floor((diffMs % 60000) / 1000);
            timerEl.textContent = `(${diffMins}:${diffSecs.toString().padStart(2, '0')})`;
        }
    });
}

// Check room status (for cleanup)
async function checkRoomStatus() {
    try {
        const { data: remainingParticipants, error } = await supabase
            .from('room_participants')
            .select('id')
            .eq('room_id', roomId);
        
        if (error) throw error;
        
        // If room is empty and we're somehow still here, redirect home
        if (!remainingParticipants || remainingParticipants.length === 0) {
            console.log('Room is empty, cleaning up...');
            
            // Delete the room
            await supabase
                .from('chat_messages')
                .delete()
                .eq('room_id', roomId);
            
            await supabase
                .from('rooms')
                .delete()
                .eq('id', roomId);
            
            console.log('✅ Room deleted (cleanup)');
        }
        
    } catch (error) {
        console.error('Error checking room status:', error);
    }
}

// Leave room
async function leaveRoom() {
    try {
        // Clear session
        clearSession();
        
        // Disconnect from LiveKit first
        if (livekitRoom) {
            await disconnectFromLiveKit();
        }
        
        // Remove participant from database
        await supabase
            .from('room_participants')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', currentUserId);
        
        // Check if room should be deleted
        await checkAndDeleteRoom();
        
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Error leaving room:', error);
        clearSession();
        window.location.href = 'index.html';
    }
}

// Check if room should be deleted (empty or host left)
async function checkAndDeleteRoom() {
    try {
        // If the leaving user is the host, delete the room immediately
        if (currentRole === 'host') {
            console.log('Host leaving, deleting room...');
            
            // Delete all participants first
            await supabase
                .from('room_participants')
                .delete()
                .eq('room_id', roomId);
            
            // Delete all chat messages
            await supabase
                .from('chat_messages')
                .delete()
                .eq('room_id', roomId);
            
            // Delete the room
            await supabase
                .from('rooms')
                .delete()
                .eq('id', roomId);
            
            console.log('✅ Room deleted (host left)');
            return;
        }
        
        // Check remaining participants
        const { data: remainingParticipants, error } = await supabase
            .from('room_participants')
            .select('id')
            .eq('room_id', roomId);
        
        if (error) throw error;
        
        // If room is empty, delete it
        if (!remainingParticipants || remainingParticipants.length === 0) {
            console.log('Room is empty, deleting...');
            
            // Delete all chat messages
            await supabase
                .from('chat_messages')
                .delete()
                .eq('room_id', roomId);
            
            // Delete the room
            await supabase
                .from('rooms')
                .delete()
                .eq('id', roomId);
            
            console.log('✅ Room deleted (empty)');
        }
        
    } catch (error) {
        console.error('Error checking/deleting room:', error);
    }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

leaveBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave this room?')) {
        leaveRoom();
    }
});

raiseHandBtn.addEventListener('click', toggleHandRaise);

participantsBtn.addEventListener('click', () => {
    participantsPanel.style.display = 'flex';
});

closePanelBtn.addEventListener('click', () => {
    participantsPanel.style.display = 'none';
});

// Mic button
micBtn.addEventListener('click', async () => {
    await toggleMic();
});

// Video button
videoBtn.addEventListener('click', async () => {
    await toggleVideo();
});

// Screen share button (if exists)
if (screenShareBtn) {
    screenShareBtn.addEventListener('click', async () => {
        await toggleScreenShare();
    });
}

// Panel tabs
document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.getAttribute('data-tab');
        updateParticipantsPanel();
    });
});

// Handle page refresh vs actual close
let isRefreshing = false;

// Detect if it's a refresh (keeps session) vs close (clears session)
window.addEventListener('beforeunload', (e) => {
    // Check if user is navigating away or refreshing
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0 && navigationEntries[0].type === 'reload') {
        isRefreshing = true;
        console.log('🔄 Page refresh detected - keeping session');
        return; // Keep session on refresh
    }
    
    // Disconnect LiveKit but keep session for quick rejoin
    if (livekitRoom) {
        livekitRoom.disconnect();
    }
    
    // Don't clear session immediately - user might refresh
    // Session will expire naturally or be cleared on explicit leave
});

// ========== LiveKit Functions ==========

// Connect to LiveKit
async function connectToLiveKit(canPublish = true) {
    if (livekitRoom) {
        console.log('Already connected to LiveKit');
        return;
    }
    
    try {
        // Get token from server
        const tokenResponse = await fetch(
            `${TOKEN_SERVER_URL}?roomName=${roomId}&participantName=${encodeURIComponent(currentUsername)}&identity=${currentUserId}`
        );
        
        if (!tokenResponse.ok) {
            throw new Error('Failed to get LiveKit token');
        }
        
        const tokenData = await tokenResponse.json();
        const token = String(tokenData.token);
        
        console.log('✅ Got LiveKit token:', token.substring(0, 20) + '...');
        console.log('Can publish:', canPublish);
        
        if (!token || token === 'undefined' || token === '[object Object]') {
            throw new Error('Invalid token received from server');
        }
        
        // Create room instance
        livekitRoom = new LivekitClient.Room({
            adaptiveStream: true,
            dynacast: true,
            // Automatically subscribe to all tracks
            autoSubscribe: true,
        });
        
        // Set up event listeners BEFORE connecting
        setupLiveKitListeners();
        
        // Connect to room with proper string token
        await livekitRoom.connect(LIVEKIT_URL, token);
        
        console.log('✅ Connected to LiveKit room as', canPublish ? 'SPEAKER' : 'VIEWER');
        
        // Safety check - make sure room didn't disconnect
        if (!livekitRoom || !livekitRoom.localParticipant) {
            console.error('❌ Room disconnected unexpectedly after connection');
            return;
        }
        
        console.log('Local participant:', livekitRoom.localParticipant.identity);
        console.log('Remote participants:', Array.from(livekitRoom.remoteParticipants.keys()));
        
        // Log all remote participants and their tracks
        livekitRoom.remoteParticipants.forEach((participant, identity) => {
            console.log(`Remote participant ${identity}:`, {
                name: participant.name,
                trackCount: participant.trackPublications.size,
                tracks: Array.from(participant.trackPublications.values()).map(pub => ({
                    kind: pub.kind,
                    subscribed: pub.isSubscribed,
                    enabled: pub.track !== undefined
                }))
            });
        });
        
        // Auto-enable mic for host only
        if (currentRole === 'host' && canPublish) {
            setTimeout(() => toggleMic(), 1000); // Small delay to ensure connection is stable
        }
        
        showNotification(canPublish ? 'Connected to voice chat' : 'Watching room', 'success');
        
    } catch (error) {
        console.error('Error connecting to LiveKit:', error);
        showNotification('Failed to connect to audio/video', 'error');
    }
}

// Disconnect from LiveKit
async function disconnectFromLiveKit() {
    if (!livekitRoom) {
        console.log('Already disconnected from LiveKit');
        return;
    }
    
    try {
        const room = livekitRoom;
        livekitRoom = null; // Prevent re-entry
        
        await room.disconnect();
        
        isMicOn = false;
        isVideoOn = false;
        localAudioTrack = null;
        localVideoTrack = null;
        
        console.log('✅ Disconnected from LiveKit');
        
    } catch (error) {
        console.error('Error disconnecting from LiveKit:', error);
    }
}

// Setup LiveKit event listeners
function setupLiveKitListeners() {
    // Participant connected
    livekitRoom.on(LivekitClient.RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity);
        setupParticipantListeners(participant);
    });
    
    // Participant disconnected
    livekitRoom.on(LivekitClient.RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant disconnected:', participant.identity);
        removeVideoTile(participant.identity);
    });
    
    // Track subscribed
    livekitRoom.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, 'from', participant.identity, 'source:', publication.source);
        
        if (track.kind === LivekitClient.Track.Kind.Video) {
            if (publication.source === LivekitClient.Track.Source.ScreenShare) {
                // Screen share track
                attachScreenShareTrack(track, participant);
            } else {
                // Regular camera track
                attachVideoTrack(track, participant);
            }
        } else if (track.kind === LivekitClient.Track.Kind.Audio) {
            if (publication.source === LivekitClient.Track.Source.ScreenShareAudio) {
                // Screen share audio (e.g., from tab audio)
                attachAudioTrack(track, participant);
            } else {
                // Regular microphone audio
                attachAudioTrack(track, participant);
            }
        }
    });
    
    // Track unsubscribed
    livekitRoom.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('Track unsubscribed:', track.kind, 'from', participant.identity, 'source:', publication.source);
        
        if (track.kind === LivekitClient.Track.Kind.Video) {
            if (publication.source === LivekitClient.Track.Source.ScreenShare) {
                // Remove screen share tile
                const screenShareId = `${participant.identity}_screen`;
                const tile = document.querySelector(`[data-participant-id="${screenShareId}"]`);
                if (tile) {
                    tile.remove();
                    updateGridLayout();
                }
            } else {
                // Remove video but keep the tile - show placeholder again
                const tile = document.querySelector(`[data-participant-id="${participant.identity}"]`);
                if (tile) {
                    tile.classList.remove('has-video');
                    
                    // Detach track from video element
                    const videoElement = tile.querySelector('video');
                    if (videoElement) {
                        track.detach(videoElement);
                        videoElement.style.display = 'none';
                    }
                    
                    // Show placeholder again (with initial)
                    const placeholder = tile.querySelector('.video-placeholder');
                    if (placeholder) {
                        placeholder.style.display = 'flex';
                    }
                    
                    console.log('📹 Video removed, showing placeholder for', participant.identity);
                }
            }
        } else if (track.kind === LivekitClient.Track.Kind.Audio) {
            detachAudioTrack(participant.identity);
        }
    });
    
    // Local track published
    livekitRoom.on(LivekitClient.RoomEvent.LocalTrackPublished, (publication) => {
        console.log('Local track published:', publication.kind);
    });
    
    // Remote track published (when someone turns on camera/mic after joining)
    livekitRoom.on(LivekitClient.RoomEvent.TrackPublished, (publication, participant) => {
        console.log('Remote track published:', publication.kind, 'from', participant.identity, 'source:', publication.source);
        
        // Automatically subscribe to the newly published track
        if (publication.track) {
            // Track is already available, attach it immediately
            if (publication.kind === LivekitClient.Track.Kind.Video) {
                if (publication.source === LivekitClient.Track.Source.ScreenShare) {
                    attachScreenShareTrack(publication.track, participant);
                } else {
                    attachVideoTrack(publication.track, participant);
                }
            } else if (publication.kind === LivekitClient.Track.Kind.Audio) {
                attachAudioTrack(publication.track, participant);
            }
        } else {
            // Track not yet available, wait for subscription
            console.log('Waiting for track to become available...');
        }
    });
    
    // Track unpublished (when someone turns off camera/mic)
    livekitRoom.on(LivekitClient.RoomEvent.TrackUnpublished, (publication, participant) => {
        console.log('Remote track unpublished:', publication.kind, 'from', participant.identity, 'source:', publication.source);
        
        if (publication.kind === LivekitClient.Track.Kind.Video) {
            if (publication.source === LivekitClient.Track.Source.ScreenShare) {
                // Remove screen share tile
                const screenShareId = `${participant.identity}_screen`;
                removeVideoTile(screenShareId);
            } else {
                // Remove regular video tile (show placeholder)
                removeVideoTile(participant.identity);
            }
        } else if (publication.kind === LivekitClient.Track.Kind.Audio) {
            detachAudioTrack(participant.identity);
        }
    });
    
    // Disconnected
    livekitRoom.on(LivekitClient.RoomEvent.Disconnected, (reason) => {
        console.log('Disconnected from room, reason:', reason);
        // Don't immediately null out the room - let the cleanup happen properly
        if (reason !== 'CLIENT_INITIATED') {
            console.warn('Unexpected disconnection:', reason);
            showNotification('Connection lost, please refresh', 'error');
        }
    });
    
    // Connection quality changed
    livekitRoom.on(LivekitClient.RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        updateConnectionQuality(participant.identity, quality);
    });
    
    // Setup listeners for existing participants AND process their tracks
    livekitRoom.remoteParticipants.forEach(participant => {
        console.log('Setting up existing participant:', participant.identity);
        setupParticipantListeners(participant);
        
        // Process already-published tracks from existing participants
        participant.trackPublications.forEach((publication) => {
            if (publication.isSubscribed && publication.track) {
                console.log('Processing existing track:', publication.kind, 'from', participant.identity, 'source:', publication.source);
                
                if (publication.kind === LivekitClient.Track.Kind.Video) {
                    if (publication.source === LivekitClient.Track.Source.ScreenShare) {
                        attachScreenShareTrack(publication.track, participant);
                    } else {
                        attachVideoTrack(publication.track, participant);
                    }
                } else if (publication.kind === LivekitClient.Track.Kind.Audio) {
                    attachAudioTrack(publication.track, participant);
                }
            }
        });
    });
    
    // Setup local participant listeners
    setupParticipantListeners(livekitRoom.localParticipant);
}

// Setup listeners for a specific participant
function setupParticipantListeners(participant) {
    // Listen for when this participant publishes new tracks
    participant.on(LivekitClient.ParticipantEvent.TrackPublished, (publication) => {
        console.log('Participant published track:', publication.kind, 'from', participant.identity, 'source:', publication.source);
        
        // Wait for track to be available, then attach it
        if (publication.track) {
            if (publication.kind === LivekitClient.Track.Kind.Video) {
                if (publication.source === LivekitClient.Track.Source.ScreenShare) {
                    attachScreenShareTrack(publication.track, participant);
                } else {
                    attachVideoTrack(publication.track, participant);
                }
            } else if (publication.kind === LivekitClient.Track.Kind.Audio) {
                attachAudioTrack(publication.track, participant);
            }
        } else {
            // Track not yet available, subscribe to it
            console.log('Subscribing to track:', publication.kind);
            livekitRoom.subscribe(publication);
        }
    });
    
    // Listen for when this participant unpublishes tracks
    participant.on(LivekitClient.ParticipantEvent.TrackUnpublished, (publication) => {
        console.log('Participant unpublished track:', publication.kind, 'from', participant.identity, 'source:', publication.source);
        
        if (publication.kind === LivekitClient.Track.Kind.Video) {
            if (publication.source === LivekitClient.Track.Source.ScreenShare) {
                const screenShareId = `${participant.identity}_screen`;
                removeVideoTile(screenShareId);
            } else {
                removeVideoTile(participant.identity);
            }
        } else if (publication.kind === LivekitClient.Track.Kind.Audio) {
            detachAudioTrack(participant.identity);
        }
    });
    
    // Speaking status changed
    participant.on(LivekitClient.ParticipantEvent.IsSpeakingChanged, (speaking) => {
        updateSpeakingStatus(participant.identity, speaking);
    });
    
    // Connection quality changed
    participant.on(LivekitClient.ParticipantEvent.ConnectionQualityChanged, (quality) => {
        updateConnectionQuality(participant.identity, quality);
    });
}

// Update speaking status visual indicator
function updateSpeakingStatus(identity, isSpeaking) {
    const tile = document.querySelector(`[data-participant-id="${identity}"]`);
    if (tile) {
        if (isSpeaking) {
            tile.classList.add('speaking');
            // Add speaking indicator to name
            const nameLabel = tile.querySelector('.speaker-name');
            if (nameLabel && !nameLabel.querySelector('.speaking-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'speaking-indicator';
                nameLabel.insertBefore(indicator, nameLabel.firstChild);
            }
        } else {
            tile.classList.remove('speaking');
            // Remove speaking indicator
            const indicator = tile.querySelector('.speaking-indicator');
            if (indicator) indicator.remove();
        }
    }
}

// Update connection quality indicator
function updateConnectionQuality(identity, quality) {
    const tile = document.querySelector(`[data-participant-id="${identity}"]`);
    if (!tile) return;
    
    // Remove existing connection indicator
    let connectionIndicator = tile.querySelector('.connection-indicator');
    if (!connectionIndicator) {
        connectionIndicator = document.createElement('div');
        connectionIndicator.className = 'connection-indicator';
        tile.appendChild(connectionIndicator);
    }
    
    // Map quality to CSS class
    let qualityClass = 'poor';
    switch (quality) {
        case LivekitClient.ConnectionQuality.Excellent:
            qualityClass = 'excellent';
            break;
        case LivekitClient.ConnectionQuality.Good:
            qualityClass = 'good';
            break;
        case LivekitClient.ConnectionQuality.Poor:
            qualityClass = 'poor';
            break;
        default:
            qualityClass = 'bad';
    }
    
    connectionIndicator.className = `connection-indicator ${qualityClass}`;
    
    // Create 4 bars
    connectionIndicator.innerHTML = `
        <div class="connection-bar" style="height: 6px;"></div>
        <div class="connection-bar" style="height: 9px;"></div>
        <div class="connection-bar" style="height: 12px;"></div>
        <div class="connection-bar" style="height: 15px;"></div>
    `;
}

// Toggle microphone
async function toggleMic() {
    if (!livekitRoom) {
        showNotification('Not connected to audio/video', 'error');
        return;
    }
    
    // Check if user has permission to publish
    if (currentRole === 'participant') {
        showNotification('Raise your hand to speak', 'error');
        return;
    }
    
    try {
        if (!isMicOn) {
            // Enable microphone
            localAudioTrack = await LivekitClient.createLocalAudioTrack();
            await livekitRoom.localParticipant.publishTrack(localAudioTrack);
            isMicOn = true;
            micBtn.classList.add('active');
            micBtn.querySelector('span').textContent = '🎤';
            console.log('✅ Microphone enabled');
        } else {
            // Disable microphone
            if (localAudioTrack) {
                await livekitRoom.localParticipant.unpublishTrack(localAudioTrack);
                localAudioTrack.stop();
                localAudioTrack = null;
            }
            isMicOn = false;
            micBtn.classList.remove('active');
            micBtn.querySelector('span').textContent = '🔇';
            console.log('✅ Microphone disabled');
        }
    } catch (error) {
        console.error('Error toggling microphone:', error);
        showNotification('Failed to toggle microphone', 'error');
    }
}

// Toggle screen share
async function toggleScreenShare() {
    if (!livekitRoom) {
        showNotification('Not connected to audio/video', 'error');
        return;
    }
    
    // Check if user has permission to publish
    if (currentRole === 'participant') {
        showNotification('Raise your hand to speak', 'error');
        return;
    }
    
    if (!screenShareBtn) {
        console.error('Screen share button not found');
        return;
    }
    
    try {
        if (!isScreenSharing) {
            // Start screen sharing
            await livekitRoom.localParticipant.setScreenShareEnabled(true);
            isScreenSharing = true;
            screenShareBtn.classList.add('active');
            screenShareBtn.querySelector('span').textContent = '🛑';
            console.log('✅ Screen sharing started');
            showNotification('Screen sharing started', 'success');
        } else {
            // Stop screen sharing
            await livekitRoom.localParticipant.setScreenShareEnabled(false);
            isScreenSharing = false;
            screenShareBtn.classList.remove('active');
            screenShareBtn.querySelector('span').textContent = '🖥️';
            console.log('✅ Screen sharing stopped');
            showNotification('Screen sharing stopped', 'success');
        }
    } catch (error) {
        console.error('Error toggling screen share:', error);
        if (error.name === 'NotAllowedError') {
            showNotification('Screen sharing permission denied', 'error');
        } else if (error.name === 'AbortError') {
            showNotification('Screen sharing cancelled', 'error');
        } else {
            showNotification('Failed to toggle screen share', 'error');
        }
        isScreenSharing = false;
        if (screenShareBtn) {
            screenShareBtn.classList.remove('active');
            screenShareBtn.querySelector('span').textContent = '🖥️';
        }
    }
}

// Toggle video
async function toggleVideo() {
    if (!livekitRoom) {
        showNotification('Not connected to audio/video', 'error');
        return;
    }
    
    // Check if user has permission to publish
    if (currentRole === 'participant') {
        showNotification('Raise your hand to speak', 'error');
        return;
    }
    
    try {
        if (!isVideoOn) {
            // Enable video
            localVideoTrack = await LivekitClient.createLocalVideoTrack();
            await livekitRoom.localParticipant.publishTrack(localVideoTrack);
            isVideoOn = true;
            videoBtn.classList.add('active');
            console.log('✅ Video enabled');
            
            // Attach local video
            attachVideoTrack(localVideoTrack, livekitRoom.localParticipant);
            
        } else {
            // Disable video
            if (localVideoTrack) {
                await livekitRoom.localParticipant.unpublishTrack(localVideoTrack);
                localVideoTrack.stop();
                localVideoTrack = null;
            }
            isVideoOn = false;
            videoBtn.classList.remove('active');
            console.log('✅ Video disabled');
            
            // Remove local video tile
            removeVideoTile(livekitRoom.localParticipant.identity);
        }
    } catch (error) {
        console.error('Error toggling video:', error);
        showNotification('Failed to toggle video', 'error');
    }
}

// Attach screen share track to DOM
function attachScreenShareTrack(track, participant) {
    const identity = participant.identity;
    const participantName = participant.name || participant.identity;
    const screenShareId = `${identity}_screen`;
    
    // Check if screen share tile already exists
    let tile = document.querySelector(`[data-participant-id="${screenShareId}"]`);
    
    if (!tile) {
        // Create new tile for screen share
        tile = createParticipantTile(screenShareId, `${participantName} (Screen)`);
        tile.classList.add('screen-share-tile');
        speakersContainer.appendChild(tile);
        
        console.log('🖥️ Created screen share tile for', participantName);
    }
    
    // Mark tile as having video
    tile.classList.add('has-video');
    
    // Attach track to video element
    const videoElement = tile.querySelector('video');
    if (videoElement) {
        track.attach(videoElement);
        videoElement.style.objectFit = 'contain'; // Screen shares look better with contain
        console.log('✅ Screen share attached for', participantName);
    }
    
    // Update grid layout
    updateGridLayout();
}

// Attach video track to DOM
function attachVideoTrack(track, participant) {
    if (!track) {
        console.warn('No track provided to attachVideoTrack');
        return;
    }
    
    const identity = participant.identity;
    const participantName = participant.name || participant.identity;
    
    // Check if tile already exists
    let tile = document.querySelector(`[data-participant-id="${identity}"]`);
    
    if (!tile) {
        // Create new tile with placeholder
        tile = createParticipantTile(identity, participantName);
        speakersContainer.appendChild(tile);
        
        // Setup listeners for this participant
        setupParticipantListeners(participant);
        
        console.log('📹 Created video tile for', participantName);
    }
    
    // Hide placeholder when video is active
    const placeholder = tile.querySelector('.video-placeholder');
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // Attach track to video element (reuse existing or create new)
    let videoElement = tile.querySelector('video');
    if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        videoElement.style.display = 'block';
        tile.insertBefore(videoElement, tile.firstChild);
    }
    
    // Attach track
    track.attach(videoElement);
    videoElement.style.display = 'block';
    tile.classList.add('has-video');
    
    console.log('✅ Video attached for', participantName);
    
    // Update grid layout
    updateGridLayout();
}

// Create participant tile with placeholder
function createParticipantTile(identity, participantName) {
    const tile = document.createElement('div');
    tile.className = 'speaker-tile';
    tile.setAttribute('data-participant-id', identity);
    tile.setAttribute('data-participant-name', participantName);
    
    // Make tile clickable to mute/unmute
    tile.style.cursor = 'pointer';
    tile.addEventListener('click', () => {
        // Find the user_id from participants array
        const participant = participants.find(p => {
            // Try to match by identity or name
            return p.user_id === identity || p.username === participantName;
        });
        
        if (participant && participant.user_id !== currentUserId) {
            toggleMuteParticipant(participant.user_id);
        }
    });
    
    // Video element (hidden by default, shown when video track is attached)
    const videoElement = document.createElement('video');
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.style.display = 'none'; // Hidden until video is attached
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'cover';
    
    // Placeholder (shown when no video)
    const placeholder = document.createElement('div');
    placeholder.className = 'video-placeholder';
    placeholder.style.display = 'flex'; // Show by default
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    // Get first letter of username (handle cases where name might be user ID)
    const firstLetter = participantName.split('_')[0].charAt(0).toUpperCase() || '?';
    avatar.textContent = firstLetter;
    
    const statusText = document.createElement('div');
    statusText.className = 'status-text';
    statusText.textContent = 'Camera off';
    
    placeholder.appendChild(avatar);
    placeholder.appendChild(statusText);
    
    // Name label (always visible)
    const nameLabel = document.createElement('div');
    nameLabel.className = 'speaker-name';
    nameLabel.textContent = participantName;
    
    // Mute indicator (shows if muted by current user)
    const muteIndicator = document.createElement('div');
    muteIndicator.className = 'mute-indicator';
    muteIndicator.innerHTML = '🔇';
    muteIndicator.style.display = 'none';
    muteIndicator.style.position = 'absolute';
    muteIndicator.style.top = '8px';
    muteIndicator.style.right = '8px';
    muteIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
    muteIndicator.style.padding = '4px 8px';
    muteIndicator.style.borderRadius = '4px';
    muteIndicator.style.fontSize = '14px';
    muteIndicator.style.zIndex = '10';
    
    // Connection indicator
    const connectionIndicator = document.createElement('div');
    connectionIndicator.className = 'connection-indicator good';
    connectionIndicator.innerHTML = `
        <div class="connection-bar" style="height: 6px;"></div>
        <div class="connection-bar" style="height: 9px;"></div>
        <div class="connection-bar" style="height: 12px;"></div>
        <div class="connection-bar" style="height: 15px;"></div>
    `;
    
    tile.appendChild(videoElement);
    tile.appendChild(placeholder);
    tile.appendChild(nameLabel);
    tile.appendChild(muteIndicator);
    tile.appendChild(connectionIndicator);
    
    return tile;
}

// Update grid layout based on participant count
function updateGridLayout() {
    const tiles = speakersContainer.querySelectorAll('.speaker-tile');
    const count = tiles.length;
    speakersContainer.setAttribute('data-count', count);
    console.log(`📊 Grid updated for ${count} participant(s)`);
}

// Attach audio track to DOM
function attachAudioTrack(track, participant) {
    const identity = participant.identity;
    const participantName = participant.name || participant.identity;
    
    // Check if audio element already exists
    let audioElement = document.querySelector(`audio[data-participant-id="${identity}"]`);
    
    if (!audioElement) {
        // Create new audio element
        audioElement = document.createElement('audio');
        audioElement.autoplay = true;
        audioElement.playsInline = true;
        audioElement.setAttribute('data-participant-id', identity);
        
        // Check if this participant is muted by the current user
        const isMuted = mutedParticipants.has(identity);
        audioElement.muted = isMuted;
        audioElement.volume = isMuted ? 0 : 1.0;
        
        // Add to DOM (hidden)
        document.body.appendChild(audioElement);
        
        console.log('🔊 Created audio element for', participantName, isMuted ? '(muted)' : '');
    }
    
    // Attach track to audio element
    track.attach(audioElement);
    
    // Force play (in case of autoplay policy)
    audioElement.play().then(() => {
        console.log('✅ Audio playing for', participantName);
    }).catch(error => {
        console.warn('⚠️ Audio autoplay blocked for', participantName, '- user interaction may be required');
        // Show notification to user
        showNotification('Click anywhere to enable audio', 'error');
        
        // Enable audio on next user interaction
        const enableAudio = () => {
            audioElement.play().then(() => {
                console.log('✅ Audio enabled after user interaction');
                document.removeEventListener('click', enableAudio);
                document.removeEventListener('keydown', enableAudio);
            });
        };
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
    });
}

// Detach audio track
function detachAudioTrack(identity) {
    const audioElement = document.querySelector(`audio[data-participant-id="${identity}"]`);
    if (audioElement) {
        audioElement.remove();
        console.log('🔇 Audio removed for', identity);
    }
}

// Remove video tile
function removeVideoTile(identity) {
    const tile = document.querySelector(`[data-participant-id="${identity}"]`);
    if (tile) {
        tile.remove();
        updateGridLayout();
    }
}

// Helper functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Show hand raise notification with special styling
function showHandRaiseNotification(username) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1.25rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(102, 126, 234, 0.4);
        z-index: 2000;
        animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 15px;
        max-width: 320px;
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    notification.innerHTML = `
        <span style="font-size: 32px; animation: wave 0.6s ease-in-out infinite;">✋</span>
        <div>
            <div style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(username)} raised their hand</div>
            <div style="font-size: 12px; opacity: 0.9;">Click to invite them to speak</div>
        </div>
    `;
    
    // Make clickable to open participants panel
    notification.style.cursor = 'pointer';
    notification.addEventListener('click', () => {
        participantsPanel.style.display = 'flex';
        // Switch to "Raised Hands" tab
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === 'raised') {
                tab.classList.add('active');
            }
        });
        currentTab = 'raised';
        updateParticipantsPanel();
        notification.remove();
    });
    
    document.body.appendChild(notification);
    
    // Play notification sound (optional)
    playNotificationSound();
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000); // Show for 5 seconds
}

// Play a subtle notification sound
function playNotificationSound() {
    // Create a simple beep using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        // Silently fail if audio context not available
        console.log('Audio notification not available');
    }
}

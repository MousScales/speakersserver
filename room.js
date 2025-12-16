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
let localAudioTrack = null;
let localVideoTrack = null;

// Check if room ID exists
if (!roomId) {
    alert('No room ID provided!');
    window.location.href = 'index.html';
}

// Check for existing session (page refresh)
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
        
        // Show video area so they can watch speakers
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
        
        if (currentRole === 'moderator' || currentRole === 'host') {
            participantsBtn.style.display = 'flex';
        }
        
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
        
        let handIcon = participant.hand_raised ? '<span class="hand-raised">✋</span>' : '';
        
        let actions = '';
        if (canModerate && !isTargetHost) {
            if (!participant.is_speaking && currentRole === 'host') {
                actions += `<button class="action-btn invite" onclick="inviteToSpeak('${participant.user_id}')">✓ Invite</button>`;
            }
            if (participant.is_speaking) {
                actions += `<button class="action-btn" onclick="removeFromSpeakers('${participant.user_id}')">🔇 Mute</button>`;
            }
            if (currentRole === 'host' && participant.role === 'speaker') {
                actions += `<button class="action-btn" onclick="makeModeratorFunc('${participant.user_id}')">👑 Mod</button>`;
            }
            actions += `<button class="action-btn remove" onclick="kickParticipant('${participant.user_id}')">✕ Kick</button>`;
        }
        
        // Moderators can't kick/mute host
        if (canModerate && isTargetHost && currentRole === 'moderator') {
            actions = '';
        }
        
        item.innerHTML = `
            <div class="participant-avatar">${initial}</div>
            <div class="participant-info">
                <div class="participant-name">
                    ${escapeHtml(participant.username)}${isMe ? ' (You)' : ''}
                    ${roleBadge}
                    ${handIcon}
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
        const { error } = await supabase
            .from('room_participants')
            .update({ hand_raised: handRaised })
            .eq('room_id', roomId)
            .eq('user_id', currentUserId);
        
        if (error) throw error;
        
        if (handRaised) {
            raiseHandBtn.classList.add('raised');
            raiseHandBtn.innerHTML = '<span>✋</span> Hand Raised';
        } else {
            raiseHandBtn.classList.remove('raised');
            raiseHandBtn.innerHTML = '<span>✋</span> Raise Hand';
        }
        
    } catch (error) {
        console.error('Error toggling hand:', error);
    }
}

// Invite to speak (host only)
window.inviteToSpeak = async function(userId) {
    try {
        const { error } = await supabase
            .from('room_participants')
            .update({ 
                is_speaking: true, 
                hand_raised: false,
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

// Remove from speakers
window.removeFromSpeakers = async function(userId) {
    try {
        const { error } = await supabase
            .from('room_participants')
            .update({ 
                is_speaking: false,
                role: 'participant'
            })
            .eq('room_id', roomId)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        showNotification('Removed from speakers', 'success');
        
    } catch (error) {
        console.error('Error removing from speakers:', error);
    }
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
        console.log('Track subscribed:', track.kind, 'from', participant.identity);
        
        if (track.kind === LivekitClient.Track.Kind.Video) {
            attachVideoTrack(track, participant);
        }
    });
    
    // Track unsubscribed
    livekitRoom.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('Track unsubscribed:', track.kind);
        
        if (track.kind === LivekitClient.Track.Kind.Video) {
            removeVideoTile(participant.identity);
        }
    });
    
    // Local track published
    livekitRoom.on(LivekitClient.RoomEvent.LocalTrackPublished, (publication) => {
        console.log('Local track published:', publication.kind);
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
                console.log('Processing existing track:', publication.kind, 'from', participant.identity);
                
                if (publication.kind === LivekitClient.Track.Kind.Video) {
                    attachVideoTrack(publication.track, participant);
                }
                // Audio tracks are handled automatically by the browser
            }
        });
    });
    
    // Setup local participant listeners
    setupParticipantListeners(livekitRoom.localParticipant);
}

// Setup listeners for a specific participant
function setupParticipantListeners(participant) {
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

// Attach video track to DOM
function attachVideoTrack(track, participant) {
    const identity = participant.identity;
    const participantName = participant.name || participant.identity;
    
    // Check if tile already exists
    let tile = document.querySelector(`[data-participant-id="${identity}"]`);
    
    if (!tile) {
        // Create new tile
        tile = document.createElement('div');
        tile.className = 'speaker-tile';
        tile.setAttribute('data-participant-id', identity);
        
        const videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'speaker-name';
        nameLabel.textContent = participantName;
        
        // Add connection indicator
        const connectionIndicator = document.createElement('div');
        connectionIndicator.className = 'connection-indicator good';
        connectionIndicator.innerHTML = `
            <div class="connection-bar" style="height: 6px;"></div>
            <div class="connection-bar" style="height: 9px;"></div>
            <div class="connection-bar" style="height: 12px;"></div>
            <div class="connection-bar" style="height: 15px;"></div>
        `;
        
        tile.appendChild(videoElement);
        tile.appendChild(nameLabel);
        tile.appendChild(connectionIndicator);
        speakersContainer.appendChild(tile);
        
        // Setup listeners for this participant if not already done
        setupParticipantListeners(participant);
    }
    
    // Attach track to video element
    const videoElement = tile.querySelector('video');
    track.attach(videoElement);
}

// Remove video tile
function removeVideoTile(identity) {
    const tile = document.querySelector(`[data-participant-id="${identity}"]`);
    if (tile) {
        tile.remove();
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

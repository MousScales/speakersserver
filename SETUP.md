# 🎙️ Speakers Server - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Python 3.x (for HTTP server)
- Modern web browser (Chrome, Firefox, Edge)

### Step 1: Install Dependencies

Open terminal in the project folder and run:

```bash
npm install
```

This will install:
- `express` - Web server for token generation
- `cors` - Enable CORS for API
- `livekit-server-sdk` - LiveKit token generation

### Step 2: Run the Database Setup

Go to your Supabase SQL Editor and run this SQL:

```sql
-- Create rooms table (if not exists)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  active_participants INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create room_participants table with roles
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant',
  hand_raised BOOLEAN DEFAULT false,
  is_speaking BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies (public access)
CREATE POLICY "Anyone can view rooms" ON rooms FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can create rooms" ON rooms FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON rooms FOR UPDATE TO public USING (true);

CREATE POLICY "Anyone can view participants" ON room_participants FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can join rooms" ON room_participants FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update themselves" ON room_participants FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can leave rooms" ON room_participants FOR DELETE TO public USING (true);

CREATE POLICY "Anyone can view messages" ON chat_messages FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can send messages" ON chat_messages FOR INSERT TO public WITH CHECK (true);
```

### Step 3: Start the Servers

**Option A: Windows (Easy)**
Double-click `START-SERVER.bat`

**Option B: Manual Start**

Terminal 1 - Token Server:
```bash
node token-server.js
```

Terminal 2 - HTTP Server:
```bash
python -m http.server 8000
```

### Step 4: Access the Application

Open your browser and go to:
```
http://localhost:8000
```

---

## 🎮 How to Use

### Creating a Room (as Host)
1. Click **"+ New Room"**
2. Enter room details
3. Click **"Create Discussion"**
4. You'll automatically join as **Host** 🎯

### Joining a Room (as Participant)
1. Click any room card on the homepage
2. Enter your name
3. Start chatting! 💬
4. Click **"✋ Raise Hand"** to request speaking access

### As a Host/Moderator
1. Click **"👥"** button to see participants panel
2. View tabs:
   - **All**: See everyone
   - **Speakers**: Active speakers
   - **Raised Hands**: Who wants to speak
3. Actions available:
   - **✓ Invite** - Allow someone to speak
   - **🔇 Mute** - Remove from speakers
   - **👑 Mod** - Make them a moderator (host only)
   - **✕ Kick** - Remove from room

### As a Speaker
1. Once invited, you'll see:
   - **🎤 Microphone** button
   - **📹 Video** button
2. Click to toggle your audio/video
3. Your video appears in the center area
4. See other speakers' videos

---

## 🎯 Role System

### **Participant** (Default)
- ✅ Can chat with everyone
- ✅ Can raise hand
- ❌ Cannot speak until invited

### **Speaker**
- ✅ Everything participants can do
- ✅ Audio/video enabled
- ✅ Appears in speaker grid

### **Moderator**
- ✅ Everything speakers can do
- ✅ Can invite participants
- ✅ Can mute/kick (except host)
- ✅ Can view participants panel

### **Host** (Room Creator)
- ✅ Everything moderators can do
- ✅ Can promote to moderator
- ✅ Cannot be kicked or muted
- ✅ Full room control

---

## 🛠️ Technical Details

### LiveKit Integration
- **URL**: `wss://speakersserver-0je4i45z.livekit.cloud`
- **Token Server**: Runs on `localhost:3001`
- **Tokens**: Generated server-side for security

### Features
- ✅ Real-time video/audio (LiveKit)
- ✅ Real-time chat (Supabase)
- ✅ Real-time participant updates (Supabase)
- ✅ Role-based permissions
- ✅ Hand raising system
- ✅ Multi-speaker support

### Architecture
```
Frontend (HTML/JS)
    ↓
Supabase (Database & Real-time)
    +
LiveKit Token Server (localhost:3001)
    ↓
LiveKit Cloud (Video/Audio)
```

---

## 🐛 Troubleshooting

### "Failed to get LiveKit token"
- Make sure token server is running on port 3001
- Check if `npm install` completed successfully

### "Microphone/Video not working"
- Allow browser permissions for camera/mic
- Check if another app is using your devices

### "Not connected to audio/video"
- Wait a few seconds after being invited
- Check browser console for errors (F12)

### Database Errors
- Make sure you ran all SQL in Supabase
- Check if RLS policies are created

---

## 📝 Files Overview

```
SpeakerServer/
├── index.html          # Homepage
├── room.html          # Room interface
├── styles.css         # Homepage styles
├── room.css           # Room styles
├── script.js          # Homepage logic
├── room.js            # Room logic + LiveKit
├── config.js          # Credentials (Supabase & LiveKit)
├── token-server.js    # LiveKit token generation
├── package.json       # Node dependencies
├── START-SERVER.bat   # Windows quick start
└── SETUP.md          # This file
```

---

## 🎉 You're Ready!

Your Speakers Server is now fully functional with:
- ✅ Real-time audio/video via LiveKit
- ✅ Real-time chat via Supabase
- ✅ Role-based access control
- ✅ Hand raising system
- ✅ Multi-user support

Enjoy your discussion platform! 🎙️


# 🎙️ Speakers Server

A modern, real-time discussion platform with audio/video chat, powered by LiveKit and Supabase.

![Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🌟 Features

- 🎥 **Real-time Audio/Video** - Powered by LiveKit for high-quality communication
- 💬 **Live Chat** - Real-time text messaging for all participants
- 👥 **Role-based Access** - Host, Moderator, Speaker, and Participant roles
- ✋ **Hand Raising System** - Participants can request to speak
- 🎤 **Speaking Indicators** - Visual feedback when someone is talking
- 📶 **Connection Quality** - Real-time network strength indicators
- 🔒 **Secure** - Server-side token generation and role-based permissions

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Python 3.x
- Supabase account
- LiveKit Cloud account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/MousScales/speakersserver.git
cd speakersserver
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure credentials**

Copy the example files and add your credentials:
```bash
cp config.example.js config.js
cp token-server.example.js token-server.js
```

Edit `config.js`:
```javascript
const SUPABASE_URL = 'your_supabase_url';
const SUPABASE_ANON_KEY = 'your_supabase_anon_key';
const LIVEKIT_URL = 'your_livekit_url';
```

Edit `token-server.js`:
```javascript
const LIVEKIT_API_KEY = 'your_api_key';
const LIVEKIT_API_SECRET = 'your_api_secret';
```

4. **Setup Supabase Database**

Run the SQL from `SETUP.md` in your Supabase SQL Editor to create the necessary tables.

5. **Start the servers**

**Windows:**
```bash
.\START-SERVER.bat
```

**Manual:**
```bash
# Terminal 1 - Token Server
node token-server.js

# Terminal 2 - HTTP Server
python -m http.server 8000
```

6. **Open the app**
```
http://localhost:8000
```

## 📖 Documentation

See [SETUP.md](SETUP.md) for detailed setup instructions and troubleshooting.

## 🎮 How to Use

### Creating a Room (Host)
1. Click **"+ New Room"**
2. Fill in room details
3. Automatically join as Host

### Joining a Room (Participant)
1. Click any room card
2. Enter your name
3. Start chatting
4. Raise hand to request speaking access

### Host Controls
- Invite participants to speak
- Mute/remove speakers
- Make moderators
- Kick participants
- View participants panel

## 🏗️ Architecture

```
Frontend (HTML/JS/CSS)
    ↓
Supabase (Database + Real-time)
    +
LiveKit Token Server (Node.js)
    ↓
LiveKit Cloud (Video/Audio)
```

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: Supabase (PostgreSQL + Real-time)
- **Video/Audio**: LiveKit
- **Backend**: Node.js + Express (Token Server)

## 📁 Project Structure

```
speakersserver/
├── index.html              # Homepage
├── room.html              # Room interface
├── styles.css             # Homepage styles
├── room.css               # Room styles
├── script.js              # Homepage logic
├── room.js                # Room logic + LiveKit
├── config.example.js      # Config template
├── token-server.example.js # Token server template
├── package.json           # Dependencies
├── START-SERVER.bat       # Windows quick start
├── SETUP.md              # Detailed setup guide
└── README.md             # This file
```

## 🔒 Security

- API keys and secrets stored server-side
- Tokens generated with expiration
- Row Level Security (RLS) enabled in Supabase
- Role-based access control

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- [LiveKit](https://livekit.io/) - Real-time video/audio infrastructure
- [Supabase](https://supabase.com/) - Backend as a Service
- Inspired by platforms like Clubhouse and Discord

## 📧 Contact

- GitHub: [@MousScales](https://github.com/MousScales)
- Repository: [speakersserver](https://github.com/MousScales/speakersserver)

---

Made with ❤️ for open discussions


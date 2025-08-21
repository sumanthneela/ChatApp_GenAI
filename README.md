# Real-Time Chat App

A real-time 1-to-1 chat application built with FastAPI, PostgreSQL, and React. Users can see online users and initiate chat sessions with real-time messaging via WebSocket.

## Features

- **Real-time messaging** using WebSocket connections
- **Online user presence** tracking and display
- **1-to-1 chat sessions** between users
- **Anonymous users** with auto-generated names/UUIDs
- **Clean and responsive UI** built with React and Tailwind CSS
- **Session-based communication** (no message persistence)
- **Graceful disconnect handling**

## Tech Stack

- **Backend**: Python + FastAPI
- **Database**: PostgreSQL (for user presence tracking)
- **Frontend**: React with Vite
- **Real-time**: WebSocket
- **Styling**: Tailwind CSS + shadcn/ui components
- **Containerization**: Docker & Docker Compose

## Architecture Overview

<img width="750" height="750" alt="image" src="https://github.com/user-attachments/assets/3059947b-4836-47c6-8dc8-7c1da221b8c1" />


### Key Components

1. **FastAPI Backend** (`backend/main.py`)
   - WebSocket endpoint for real-time communication
   - Connection manager for handling multiple clients
   - User presence tracking
   - Message routing between users

2. **React Frontend** (`frontend/chat-frontend/src/App.jsx`)
   - User interface for chat functionality
   - WebSocket client for real-time updates
   - User list and chat interface
   - Responsive design with Tailwind CSS

3. **PostgreSQL Database**
   - User presence tracking (online/offline status)
   - No message persistence (session-based only)

## Project Structure

```
real-time-chat-app/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile          # Backend container
├── frontend/
│   └── chat-frontend/
│       ├── src/
│       │   ├── App.jsx     # Main React component
│       │   ├── App.css     # Styles
│       │   └── main.jsx    # Entry point
│       ├── package.json    # Node.js dependencies
│       └── Dockerfile      # Frontend container
├── docker-compose.yml      # Multi-container setup
└── README.md              # This file
```

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Option 1: Local Development (Highly Recommended)

#### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start PostgreSQL (using Docker):
   ```bash
   docker run --name chatapp-postgres -e POSTGRES_DB=chatapp -e POSTGRES_USER=chatuser -e POSTGRES_PASSWORD=chatpass -p 5432:5432 -d postgres:15
   ```

5. Run the FastAPI server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

#### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend/chat-frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start development server:
   ```bash
   pnpm run dev --host
   ```
   
### Option 2: Docker Compose (It's Completely Optional)

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs


## Usage

1. **Join Chat**: Enter your name and click "Join Chat"
2. **See Online Users**: View the list of currently online users
3. **Start Conversation**: Click on any user to start a 1-to-1 chat
4. **Send Messages**: Type and send real-time messages
5. **Multiple Conversations**: Switch between different users to chat

## API Endpoints

### REST Endpoints

- `GET /` - API health check
- `GET /users` - Get list of online users

### WebSocket Endpoints

- `WS /ws/{user_name}` - WebSocket connection for real-time chat

### WebSocket Message Types

#### Client to Server:
```json
{
  "type": "chat_message",
  "receiver_id": "user-uuid",
  "content": "Hello!"
}
```

#### Server to Client:
```json
{
  "type": "connection_established",
  "user_id": "user-uuid",
  "name": "username"
}

{
  "type": "user_list_update",
  "users": [{"id": "uuid", "name": "username", "is_online": true}]
}

{
  "type": "chat_message",
  "message": {
    "id": "message-uuid",
    "sender_id": "sender-uuid",
    "receiver_id": "receiver-uuid",
    "content": "Hello!",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Database Usage
- PostgreSQL is used only for user presence tracking
- No message history is stored (session-based communication)
- Minimal database schema focused on online user management

## Testing

1. Open multiple browser tabs/windows
2. Join with different usernames
3. Verify users appear in each other's online lists
4. Test real-time messaging between users
5. Test disconnect/reconnect scenarios

## Deployment

### Production Considerations

1. **Environment Variables**: Configure database credentials and API URLs
2. **HTTPS/WSS**: Use secure connections in production
3. **Load Balancing**: Consider WebSocket sticky sessions
4. **Database**: Use managed PostgreSQL service
5. **Monitoring**: Add logging and health checks

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://user:pass@host:port/db

# Frontend
VITE_API_URL=https://your-api-domain.com
```

### Logs

- Backend logs: Check Docker container logs or terminal output
- Frontend logs: Check browser developer console
- Database logs: Check PostgreSQL container logs


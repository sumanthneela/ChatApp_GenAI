from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid
import json
import asyncio
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Real-Time Chat App", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class User(BaseModel):
    id: str
    name: str
    is_online: bool = True
    connected_at: datetime

class Message(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    timestamp: datetime

class ChatSession(BaseModel):
    id: str
    user1_id: str
    user2_id: str
    created_at: datetime

# In-memory storage
connected_users: Dict[str, User] = {}
active_connections: Dict[str, WebSocket] = {}
chat_sessions: Dict[str, ChatSession] = {}
messages: Dict[str, List[Message]] = {}  # session_id -> messages

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"User {user_id} connected")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in connected_users:
            del connected_users[user_id]
        logger.info(f"User {user_id} disconnected")

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {e}")
                self.disconnect(user_id)

    async def broadcast_user_list(self):
        user_list = [
            {"id": user.id, "name": user.name, "is_online": user.is_online}
            for user in connected_users.values()
        ]
        message = json.dumps({
            "type": "user_list_update",
            "users": user_list
        })
        
        disconnected_users = []
        for user_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {user_id}: {e}")
                disconnected_users.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected_users:
            self.disconnect(user_id)

    async def send_chat_message(self, sender_id: str, receiver_id: str, content: str):
        message_id = str(uuid.uuid4())
        timestamp = datetime.now()
        
        message_data = {
            "type": "chat_message",
            "message": {
                "id": message_id,
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "content": content,
                "timestamp": timestamp.isoformat()
            }
        }
        
        # Send to both sender and receiver
        for user_id in [sender_id, receiver_id]:
            await self.send_personal_message(json.dumps(message_data), user_id)

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Real-Time Chat App API"}

@app.get("/users")
async def get_users():
    """Get list of online users"""
    user_list = [
        {"id": user.id, "name": user.name, "is_online": user.is_online}
        for user in connected_users.values()
    ]
    return {"users": user_list}

@app.websocket("/ws/{user_name}")
async def websocket_endpoint(websocket: WebSocket, user_name: str):
    user_id = str(uuid.uuid4())
    
    # Create user
    user = User(
        id=user_id,
        name=user_name,
        is_online=True,
        connected_at=datetime.now()
    )
    
    connected_users[user_id] = user
    await manager.connect(websocket, user_id)
    
    # Send welcome message with user ID
    await websocket.send_text(json.dumps({
        "type": "connection_established",
        "user_id": user_id,
        "name": user_name
    }))
    
    # Broadcast updated user list
    await manager.broadcast_user_list()
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                message_type = message_data.get("type")
                
                if message_type == "chat_message":
                    receiver_id = message_data.get("receiver_id")
                    content = message_data.get("content")
                    
                    if receiver_id and content:
                        await manager.send_chat_message(user_id, receiver_id, content)
                    else:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Invalid message format"
                        }))
                
                elif message_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                    
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast_user_list()
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(user_id)
        await manager.broadcast_user_list()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


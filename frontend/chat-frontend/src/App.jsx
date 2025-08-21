import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Users, MessageCircle, Send, Wifi, WifiOff } from 'lucide-react'
import './App.css'

function App() {
  const [userName, setUserName] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  
  const wsRef = useRef(null)
  const messagesEndRef = useRef(null)
const currentUserIdRef = useRef('');
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const connectToChat = () => {
    if (!userName.trim()) return

    const ws = new WebSocket(`ws://localhost:8000/ws/${encodeURIComponent(userName)}`)
    wsRef.current = ws
    setConnectionStatus('connecting')

    ws.onopen = () => {
      setIsConnected(true)
      setConnectionStatus('connected')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'connection_established':
          setCurrentUserId(data.user_id)
          currentUserIdRef.current = data.user_id;
          // Update users list to include self with correct ID
          setUsers(prevUsers => {
            const updatedUsers = prevUsers.map(user => 
              user.id === data.user_id ? { ...user, id: data.user_id } : user
            )
            return updatedUsers.filter(user => user.id !== data.user_id)
          })
          break
          
        case 'user_list_update':
          // Ensure current user is not in the list of other users
          setUsers(data.users.filter(user => user.id !== currentUserId))
          break
          
        case 'chat_message':
          const message = data.message
          setMessages(prev => [...prev, {
            id: message.id,
            senderId: message.sender_id,
            receiverId: message.receiver_id,
            content: message.content,
            timestamp: new Date(message.timestamp),
            isOwn: message.sender_id === currentUserIdRef.current,
            senderName: message.sender_name
          }])
          break
          
        case 'error':
          console.error('WebSocket error:', data.message)
          break
          
        default:
          console.log('Unknown message type:', data.type)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      setConnectionStatus('disconnected')
      setUsers([])
      setSelectedUser(null)
      setMessages([])
      setCurrentUserId('')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('error')
    }
  }

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setUsers([])
    setSelectedUser(null)
    setMessages([])
    setCurrentUserId('')
  }

  const selectUser = (user) => {
    setSelectedUser(user)
    // Filter messages for this conversation
    const conversationMessages = messages.filter(msg => 
      (msg.senderId === currentUserId && msg.receiverId === user.id) ||
      (msg.senderId === user.id && msg.receiverId === currentUserId)
    )
    setMessages(conversationMessages)
  }

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedUser || !wsRef.current) return

    const messageData = {
      type: 'chat_message',
      receiver_id: selectedUser.id,
      content: messageInput.trim()
    }

    wsRef.current.send(JSON.stringify(messageData))
    setMessageInput('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <MessageCircle className="h-6 w-6" />
              Real-Time Chat
            </CardTitle>
            <p className="text-muted-foreground">Enter your name to join the chat</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && connectToChat()}
              disabled={connectionStatus === 'connecting'}
            />
            <Button 
              onClick={connectToChat} 
              className="w-full"
              disabled={!userName.trim() || connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Join Chat'}
            </Button>
            {connectionStatus === 'error' && (
              <p className="text-destructive text-sm text-center">
                Connection failed. Please try again.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-2rem)]">
        {/* Users List */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Online Users ({users.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
                  {connectionStatus === 'connected' ? (
                    <><Wifi className="h-3 w-3 mr-1" /> Online</>
                  ) : (
                    <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                  )}
                </Badge>
                <Button variant="outline" size="sm" onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Welcome, {userName}!</p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="p-4 space-y-2">
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No other users online
                  </p>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => selectUser(user)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {selectedUser ? `${selectedUser.name}` : 'Select a user to start chatting'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-[calc(100vh-8rem)]">
            {selectedUser ? (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No messages yet. Start the conversation!
                      </p>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.isOwn
                                ? 'bg-blue-500 text-white rounded-br-none' // Sent message style
                                : 'bg-gray-200 text-gray-800 rounded-bl-none' // Received message style
                            }`}
                          >
                            {!message.isOwn && message.senderName && (<p className="text-xs font-semibold mb-1">{message.senderName}</p>)}

                            <p className="break-words">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.isOwn ? 'text-blue-200' : 'text-gray-600'
                            }`}>
                              {message.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <Separator />

                {/* Message Input */}
                <div className="p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!messageInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a user from the list to start chatting</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App

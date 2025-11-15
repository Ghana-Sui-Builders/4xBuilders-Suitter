import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Send, Search, Plus, MoreVertical, ArrowLeft, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { getConversations, getMessages, mockUsers, type Conversation, type Message, type User } from '@/lib/mockData'
import { useAuth } from '@/context/AuthContext'
import { useMessaging } from '@/hooks/use-messaging'
import { useSui } from '@/hooks/useSui'
import { EmojiPicker } from '@/components/EmojiPicker'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

export default function MessagesPage() {
  const { currentUser } = useAuth()
  const { messagingClient, isReady, isLoading: isMessagingLoading } = useMessaging()
  const { createConversation, sendMessage: sendMessageOnChain, getConversations: getConversationsFromChain, getMessages: getMessagesFromChain } = useSui()
  const { toast } = useToast()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadConversations = async () => {
      try {
        // Try to load from blockchain first
        if (currentUser?.address) {
          const blockchainConversations = await getConversationsFromChain()
          if (blockchainConversations.length > 0) {
            // Convert blockchain conversations to app format
            const formattedConversations: Conversation[] = blockchainConversations.map((conv: any) => {
              const content = conv.data?.content?.fields || {}
              const participant1 = content.participant1 || ''
              const participant2 = content.participant2 || ''
              const otherParticipant = participant1 === currentUser.address ? participant2 : participant1
              
              // Find user info for the other participant
              const otherUser = mockUsers.find(u => u.address === otherParticipant) || {
                id: otherParticipant,
                address: otherParticipant,
                displayName: otherParticipant.slice(0, 6) + '...',
                username: otherParticipant.slice(0, 6),
                avatar: '',
              }
              
              return {
                id: conv.data?.objectId || `conv-${Date.now()}`,
                participants: [currentUser, otherUser],
                lastMessage: {
                  id: '',
                  conversationId: conv.data?.objectId || '',
                  senderId: '',
                  sender: currentUser,
                  recipientId: '',
                  content: '',
                  images: [],
                  read: false,
                  createdAt: new Date(),
                },
                lastMessageTime: new Date(),
                unreadCount: 0,
              }
            })
            
            setConversations(formattedConversations)
            setLoading(false)
            return
          }
        }
        
        // Fallback to mock data
        setTimeout(() => {
          setConversations(getConversations())
          setLoading(false)
        }, 500)
      } catch (error) {
        console.error('Error loading conversations:', error)
        // Fallback to mock data
        setTimeout(() => {
          setConversations(getConversations())
          setLoading(false)
        }, 500)
      }
    }
    
    loadConversations()
  }, [currentUser, getConversationsFromChain])

  useEffect(() => {
    const loadMessages = async () => {
      if (selectedConversation) {
        try {
          // Try to load from blockchain if conversation ID looks like a blockchain ID
          if (selectedConversation.id.startsWith('0x')) {
            const blockchainMessages = await getMessagesFromChain(selectedConversation.id)
            if (blockchainMessages.length > 0) {
              // Convert blockchain messages to app format
              const formattedMessages: Message[] = blockchainMessages.map((msg: any) => {
                const sender = msg.sender === currentUser?.address ? currentUser : 
                  selectedConversation.participants.find(p => p.address === msg.sender) || currentUser
                const recipient = msg.recipient === currentUser?.address ? currentUser :
                  selectedConversation.participants.find(p => p.address === msg.recipient) || currentUser
                
                return {
                  id: msg.id,
                  conversationId: msg.conversationId,
                  senderId: sender.id,
                  sender,
                  recipientId: recipient.id,
                  content: msg.content,
                  images: [],
                  read: false,
                  createdAt: new Date(Number(msg.timestamp)),
                }
              })
              
              setMessages(formattedMessages)
              return
            }
          }
          
          // Fallback to mock data
          const conversationMessages = getMessages(selectedConversation.id)
          setMessages(conversationMessages)
        } catch (error) {
          console.error('Error loading messages:', error)
          // Fallback to mock data
          const conversationMessages = getMessages(selectedConversation.id)
          setMessages(conversationMessages)
        }
      } else {
        setMessages([])
      }
    }
    
    loadMessages()
  }, [selectedConversation, currentUser, getMessagesFromChain])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentUser) return

    // Determine recipient
    const recipient = showNewMessage && selectedUser 
      ? selectedUser 
      : selectedConversation?.participants.find(p => p.id !== currentUser.id)

    if (!recipient) {
      toast({
        title: 'Error',
        description: 'Please select a conversation or user first',
        variant: 'destructive',
      })
      return
    }

    setSending(true)

    try {
      let conversationId = selectedConversation?.id
      let sentViaBlockchain = false

      // If starting a new conversation, create it on blockchain first
      if (showNewMessage && selectedUser && recipient.address) {
        try {
          console.log('Creating new conversation with:', recipient.address)
          const result = await createConversation(recipient.address)
          conversationId = result.objectId || result.digest
          sentViaBlockchain = true
          console.log('Conversation created on blockchain:', conversationId)
          
          // Create conversation object for UI
          const newConversation: Conversation = {
            id: conversationId,
            participants: [currentUser, selectedUser],
            lastMessage: {
              id: '',
              conversationId,
              senderId: currentUser.id,
              sender: currentUser,
              recipientId: selectedUser.id,
              content: messageInput,
              images: [],
              read: false,
              createdAt: new Date(),
            },
            lastMessageTime: new Date(),
            unreadCount: 0,
          }
          
          setConversations([newConversation, ...conversations])
          setSelectedConversation(newConversation)
          setShowNewMessage(false)
          setSelectedUser(null)
        } catch (error) {
          console.error('Failed to create conversation on blockchain:', error)
          toast({
            title: 'Warning',
            description: 'Failed to create conversation on blockchain. Using local storage.',
            variant: 'default',
          })
        }
      }

      // Send message on blockchain if we have a valid conversation ID
      if (conversationId && conversationId.startsWith('0x')) {
        try {
          console.log('Sending message on blockchain to conversation:', conversationId)
          await sendMessageOnChain(conversationId, messageInput)
          sentViaBlockchain = true
          console.log('Message sent on blockchain')
          
          // Reload messages from blockchain
          if (conversationId) {
            const blockchainMessages = await getMessagesFromChain(conversationId)
            if (blockchainMessages.length > 0) {
              const formattedMessages: Message[] = blockchainMessages.map((msg: any) => {
                const sender = msg.sender === currentUser?.address ? currentUser : 
                  (selectedConversation?.participants.find(p => p.address === msg.sender) || currentUser)
                const recipient = msg.recipient === currentUser?.address ? currentUser :
                  (selectedConversation?.participants.find(p => p.address === msg.recipient) || currentUser)
                
                return {
                  id: msg.id,
                  conversationId: msg.conversationId,
                  senderId: sender.id,
                  sender,
                  recipientId: recipient.id,
                  content: msg.content,
                  images: [],
                  read: false,
                  createdAt: new Date(Number(msg.timestamp)),
                }
              })
              
              setMessages(formattedMessages)
              setMessageInput('')
              toast({
                description: 'Message sent on blockchain!',
              })
              setSending(false)
              return
            }
          }
        } catch (error) {
          console.error('Failed to send message on blockchain:', error)
          toast({
            title: 'Warning',
            description: 'Failed to send message on blockchain. Using local storage.',
            variant: 'default',
          })
        }
      }

      // Fallback to local storage if blockchain fails or conversation ID is not valid
      if (showNewMessage && selectedUser && !conversationId?.startsWith('0x')) {
        // Starting a new conversation
        const newConversation: Conversation = {
          id: `conv-${Date.now()}`,
          participants: [currentUser, selectedUser],
          lastMessage: {
            id: `msg-${Date.now()}`,
            conversationId: `conv-${Date.now()}`,
            senderId: currentUser.id,
            sender: currentUser,
            recipientId: selectedUser.id,
            content: messageInput,
            images: [],
            read: false,
            createdAt: new Date(),
          },
          lastMessageTime: new Date(),
          unreadCount: 0,
        }

        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          conversationId: newConversation.id,
          senderId: currentUser.id,
          sender: currentUser,
          recipientId: selectedUser.id,
          content: messageInput,
          images: [],
          read: false,
          createdAt: new Date(),
        }

        setConversations([newConversation, ...conversations])
        setSelectedConversation(newConversation)
        setMessages([newMessage])
        setShowNewMessage(false)
        setSelectedUser(null)
      } else if (selectedConversation) {
        // Existing conversation
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          conversationId: selectedConversation.id,
          senderId: currentUser.id,
          sender: currentUser,
          recipientId: recipient.id,
          content: messageInput,
          images: [],
          read: false,
          createdAt: new Date(),
        }

        setMessages([...messages, newMessage])
        
        // Update conversation's last message
        setConversations(conversations.map(conv => 
          conv.id === selectedConversation.id
            ? {
                ...conv,
                lastMessage: newMessage,
                lastMessageTime: new Date(),
              }
            : conv
        ))
      }

      setMessageInput('')
      
      toast({
        description: sentViaBlockchain ? 'Message sent via blockchain!' : 'Message sent!',
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji)
  }

  const handleStartNewMessage = (user: User) => {
    setSelectedUser(user)
    setShowNewMessage(true)
    setSelectedConversation(null)
    setMessages([])
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true
    const other = conv.participants.find(p => p.id !== currentUser?.id)
    return other?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           other?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const otherParticipant = selectedConversation?.participants.find(p => p.id !== currentUser?.id) || selectedUser

  const formatMessageTime = (date: Date) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return format(messageDate, 'HH:mm')
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return format(messageDate, 'MMM d')
    }
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {}
    
    messages.forEach(message => {
      const date = format(new Date(message.createdAt), 'yyyy-MM-dd')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    
    return groups
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Conversations List */}
      <div className={cn(
        "w-full md:w-80 border-r border-border flex flex-col transition-all",
        selectedConversation && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Messages</h2>
            <div className="flex items-center gap-2">
              {isMessagingLoading && (
                <Skeleton className="w-5 h-5 rounded-full" />
              )}
              {!isMessagingLoading && !isReady && (
                <AlertCircle className="w-5 h-5 text-yellow-500" title="Blockchain messaging unavailable" />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewMessage(!showNewMessage)}
                className="hover:bg-muted"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {showNewMessage && (
          <div className="p-4 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold mb-3">Start a new conversation</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {mockUsers
                .filter(user => user.id !== currentUser?.id)
                .map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleStartNewMessage(user)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map(conversation => {
                const other = conversation.participants.find(p => p.id !== currentUser?.id)
                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation)
                      setShowNewMessage(false)
                    }}
                    className={cn(
                      'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                      selectedConversation?.id === conversation.id && 'bg-muted'
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={other?.avatar} />
                          <AvatarFallback>{other?.displayName[0]}</AvatarFallback>
                        </Avatar>
                        {conversation.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">{other?.displayName}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatMessageTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground truncate flex-1">
                            {conversation.lastMessage.senderId === currentUser?.id && 'You: '}
                            {conversation.lastMessage.content}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground flex-shrink-0">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedConversation && !showNewMessage && "hidden md:flex"
      )}>
        {(selectedConversation || showNewMessage) && otherParticipant ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-background/95 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => {
                      setSelectedConversation(null)
                      setShowNewMessage(false)
                    }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Link to={`/profile/${otherParticipant.id}`}>
                    <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={otherParticipant.avatar} />
                      <AvatarFallback>{otherParticipant.displayName[0]}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link to={`/profile/${otherParticipant.id}`} className="hover:opacity-80 transition-opacity">
                      <p className="font-semibold">{otherParticipant.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{otherParticipant.username}</p>
                    </Link>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="hover:bg-muted">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-2">No messages yet</p>
                    <p className="text-sm text-muted-foreground">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
                  <div key={date}>
                    <div className="flex items-center justify-center my-4">
                      <div className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                        {format(new Date(date), 'MMMM d, yyyy')}
                      </div>
                    </div>
                    {dateMessages.map((message, index) => {
                      const isOwn = message.senderId === currentUser?.id
                      const prevMessage = index > 0 ? dateMessages[index - 1] : null
                      const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId ||
                        (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) > 5 * 60 * 1000
                      
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'flex gap-2 mb-2',
                            isOwn && 'flex-row-reverse'
                          )}
                        >
                          {showAvatar ? (
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={message.sender.avatar} />
                              <AvatarFallback className="text-xs">
                                {message.sender.displayName[0]}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8" />
                          )}
                          <div className={cn(
                            'flex flex-col max-w-[70%]',
                            isOwn && 'items-end'
                          )}>
                            {showAvatar && (
                              <p className={cn(
                                'text-xs mb-1 px-2',
                                isOwn ? 'text-right' : 'text-left',
                                'text-muted-foreground'
                              )}>
                                {isOwn ? 'You' : message.sender.displayName}
                              </p>
                            )}
                            <div className={cn(
                              'rounded-2xl px-4 py-2',
                              isOwn 
                                ? 'bg-primary text-primary-foreground rounded-br-sm' 
                                : 'bg-muted rounded-bl-sm'
                            )}>
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                              <p className={cn(
                                'text-xs mt-1',
                                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              )}>
                                {formatMessageTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-background/95 backdrop-blur">
              <div className="flex items-end gap-2">
                <Button variant="ghost" size="icon" className="flex-shrink-0 hover:bg-muted">
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder={showNewMessage ? `Message @${otherParticipant.username}...` : "Type a message..."}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="pr-10 min-h-[44px]"
                    maxLength={1000}
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </div>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sending}
                  size="icon"
                  className="flex-shrink-0"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {messageInput.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {messageInput.length} / 1000
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-2">Select a conversation</p>
              <p className="text-sm text-muted-foreground mb-4">Choose a conversation from the list to start messaging</p>
              <Button
                onClick={() => setShowNewMessage(true)}
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Message
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

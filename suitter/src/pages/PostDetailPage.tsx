import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PostCard } from '@/components/PostCard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Skeleton } from '@/components/ui/Skeleton'
import { ArrowLeft, Heart, MessageCircle, Send, Image as ImageIcon, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getPostById } from '@/lib/mockData'
import { type Post, type Reply } from '@/lib/types'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { EmojiPicker } from '@/components/EmojiPicker'
import { useSui } from '@/hooks/useSui'

export default function PostDetailPage() {
  const { id } = useParams()
  const currentAccount = useCurrentAccount()
  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [replyImages, setReplyImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const MAX_IMAGES = 4
  const { toast } = useToast()
  const { getPostById: getPostFromChain, commentOnPost, getProfile } = useSui()

  useEffect(() => {
    if (id) {
      const fetchPost = async () => {
        setLoading(true)
        try {
          const chainPost = await getPostFromChain(id)
          
          if (!chainPost) {
            // Fall back to mock data
            const foundPost = getPostById(id)
            setPost(foundPost || null)
            if (foundPost) {
              setReplies([
                {
                  id: '1',
                  postId: id,
                  authorId: '2',
                  author: {
                    id: '2',
                    address: '0xabcdef',
                    username: 'bob_dev',
                    displayName: 'Bob Developer',
                    bio: 'Developer',
                    avatar: '/placeholder-user.jpg',
                    banner: '/placeholder.jpg',
                    joinedAt: new Date(),
                    followersCount: 100,
                    followingCount: 50,
                  },
                  content: 'Great post! Really insightful.',
                  images: [],
                  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                  likeCount: 5,
                  liked: false,
                  replies: [],
                },
              ])
            }
          } else {
            // Enrich post with profile data
            if (chainPost.author.address) {
              const profile = await getProfile(chainPost.author.address)
              if (profile) {
                chainPost.author = {
                  ...chainPost.author,
                  username: profile.username,
                  displayName: profile.displayName,
                  avatar: profile.avatar,
                  bio: profile.bio,
                }
              }
            }
            setPost(chainPost)
            // Comments/replies would be fetched from blockchain here
            setReplies([])
          }
        } catch (error) {
          console.error('Failed to fetch post:', error)
          // Fall back to mock data
          const foundPost = getPostById(id)
          setPost(foundPost || null)
        } finally {
          setLoading(false)
        }
      }

      fetchPost()
    }
  }, [id, getPostFromChain, getProfile])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const remainingSlots = MAX_IMAGES - replyImages.length

    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          setReplyImages(prev => [...prev, result])
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const removeImage = (index: number) => {
    setReplyImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleReply = async () => {
    if (!replyContent.trim() || !currentAccount || !post) return

    try {
      // Send comment to blockchain
      await commentOnPost(post.id, replyContent, replyImages)

      // Fetch user profile from blockchain
      const userProfile = await getProfile(currentAccount.address)
      
      // Create user object from profile or fallback to address
      const user = userProfile ? {
        id: userProfile.id,
        address: userProfile.address,
        username: userProfile.username,
        displayName: userProfile.displayName,
        bio: userProfile.bio,
        avatar: userProfile.avatar,
        banner: userProfile.banner,
        joinedAt: userProfile.joinedAt,
        followersCount: userProfile.followersCount,
        followingCount: userProfile.followingCount,
      } : {
        id: currentAccount.address.slice(0, 10),
        address: currentAccount.address,
        username: `User ${currentAccount.address.slice(0, 6)}`,
        displayName: `User ${currentAccount.address.slice(0, 6)}`,
        bio: '',
        avatar: '/placeholder-user.jpg',
        banner: '/placeholder.jpg',
        joinedAt: new Date(),
        followersCount: 0,
        followingCount: 0,
      }

      const newReply: Reply = {
        id: Date.now().toString(),
        postId: post.id,
        authorId: user.id,
        author: user,
        content: replyContent,
        images: replyImages,
        createdAt: new Date(),
        likeCount: 0,
        liked: false,
        replies: [],
      }

      setReplies([newReply, ...replies])
      setReplyContent('')
      setReplyImages([])
      setPost({ ...post, replyCount: post.replyCount + 1 })

      toast({
        description: 'Reply posted successfully',
      })
    } catch (error) {
      console.error('Failed to post reply:', error)
      toast({
        title: 'Error',
        description: 'Failed to post reply. Please try again.',
      })
    }
  }

  const handleLike = (postId: string) => {
    // Note: Liking is tracked locally for now
    if (post && post.id === postId) {
      const wasLiked = post.liked
      setPost({ ...post, liked: !post.liked, likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1 })
      
      toast({
        description: wasLiked ? 'Post unliked' : 'Post liked',
      })
    }
  }

  const handleReshare = (postId: string) => {
    if (post && post.id === postId) {
      setPost({ ...post, reshared: !post.reshared, reshareCount: post.reshared ? post.reshareCount - 1 : post.reshareCount + 1 })
      toast({
        description: 'Post reshared',
      })
    }
  }

  const handleBookmark = (postId: string) => {
    if (post && post.id === postId) {
      setPost({ ...post, bookmarked: !post.bookmarked })
      toast({
        description: post.bookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
      })
    }
  }

  const handleCopyLink = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`
    navigator.clipboard.writeText(url)
    toast({
      description: 'Link copied to clipboard',
    })
  }

  const handleShare = (_postId: string) => {
    toast({
      description: 'Post shared',
    })
  }

  const handleMute = (_userId: string) => {
    toast({
      description: 'User muted',
    })
  }

  const handleBlock = (_userId: string) => {
    toast({
      description: 'User blocked',
    })
  }

  const handleReport = (_postId: string) => {
    toast({
      description: 'Post reported',
    })
  }

  const handleDelete = (postId: string) => {
    if (post && post.id === postId) {
      // Navigate away since post is deleted
      window.location.href = '/'
    }
    toast({
      description: 'Post deleted',
    })
  }

  const handleFollow = (userId: string) => {
    const isFollowingUser = following.has(userId)
    
    if (isFollowingUser) {
      setFollowing(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
      toast({
        description: 'User unfollowed',
      })
    } else {
      setFollowing(prev => new Set(prev).add(userId))
      toast({
        description: 'User followed',
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Post not found</p>
        <Link to="/">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur p-4">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Post */}
      <div className="border-b border-border">
        <PostCard 
          post={post}
          onLike={handleLike}
          onReshare={handleReshare}
          onBookmark={handleBookmark}
          onCopyLink={handleCopyLink}
          onShare={handleShare}
          onMute={handleMute}
          onBlock={handleBlock}
          onReport={handleReport}
          onDelete={handleDelete}
          onFollow={handleFollow}
        />
      </div>

      {/* Reply Composer */}
      {currentAccount && (
        <div className="p-6 border-b border-border">
          <div className="flex gap-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>{currentAccount.address.slice(2, 4).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="relative">
                <Textarea
                  placeholder="Post your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={3}
                  className="pr-10"
                />
                <div className="absolute bottom-2 right-2">
                  <EmojiPicker
                    onEmojiSelect={(emoji) => {
                      setReplyContent(prev => prev + emoji)
                    }}
                  />
                </div>
              </div>

              {/* Image Preview */}
              {replyImages.length > 0 && (
                <div className={cn(
                  "grid gap-2",
                  replyImages.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                  {replyImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={replyImages.length >= MAX_IMAGES}
                    aria-label="Upload images"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={replyImages.length >= MAX_IMAGES}
                    className="hover:bg-muted"
                  >
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </Button>
                  {replyImages.length >= MAX_IMAGES && (
                    <span className="text-xs text-muted-foreground">
                      Max {MAX_IMAGES} images
                    </span>
                  )}
                </div>
                <Button
                  onClick={handleReply}
                  disabled={!replyContent.trim()}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replies */}
      <div className="divide-y divide-border">
        {replies.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No replies yet. Be the first to reply!</p>
          </div>
        ) : (
          replies.map(reply => (
            <div key={reply.id} className="p-6">
              <div className="flex gap-4">
                <Link to={`/profile/${reply.author.id}`}>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={reply.author.avatar} />
                    <AvatarFallback>{reply.author.displayName[0]}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/profile/${reply.author.id}`} className="font-semibold hover:underline">
                      {reply.author.displayName}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      @{reply.author.username}
                    </span>
                    <span className="text-sm text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm mb-3">{reply.content}</p>
                  {/* Reply Images */}
                  {reply.images && reply.images.length > 0 && (
                    <div className={cn(
                      'mt-3 rounded-2xl overflow-hidden border border-border',
                      reply.images.length === 1 ? 'w-full' : 'grid grid-cols-2 gap-2'
                    )}>
                      {reply.images.map((image: string, idx: number) => (
                        <img
                          key={idx}
                          src={image}
                          alt={`Reply image ${idx + 1}`}
                          className="w-full h-auto bg-muted object-cover max-h-[400px]"
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <Button variant="ghost" size="sm" className="h-8">
                      <Heart className={cn('w-4 h-4', reply.liked && 'fill-current')} />
                      <span className="ml-1 text-xs">{reply.likeCount}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

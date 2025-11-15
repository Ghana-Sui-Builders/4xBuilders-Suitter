import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { PostCard } from '@/components/PostCard'
import { CreatePostModal } from '@/components/CreatePostModal'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Plus } from 'lucide-react'
import { getPosts } from '@/lib/mockData'
import { type Post } from '@/lib/types'
import { useToast } from '@/hooks/useToast'
import { useSui } from '@/hooks/useSui'
import { fetchLikesForPost, hasUserLikedPost } from '@/services/suiService'
import { useCurrentAccount } from '@mysten/dapp-kit'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('foryou')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const { getPosts: getPostsFromChain, likePost, getProfile, getSuiClient } = useSui()
  const currentAccount = useCurrentAccount()

  // Load following state from localStorage on mount and when tab changes
  useEffect(() => {
    const stored = localStorage.getItem('suitter_following')
    if (stored) {
      try {
        const followingArray = JSON.parse(stored)
        setFollowing(new Set(followingArray))
      } catch (error) {
        console.error('Failed to parse following state:', error)
      }
    }
  }, [activeTab]) // Reload when tab changes to sync with other components

  // Save following state to localStorage whenever it changes
  useEffect(() => {
    if (following.size > 0) {
      localStorage.setItem('suitter_following', JSON.stringify(Array.from(following)))
    } else {
      localStorage.removeItem('suitter_following')
    }
  }, [following])

  // Helper function to enrich posts with profile data from blockchain
  const enrichPostsWithProfiles = async (posts: Post[]): Promise<Post[]> => {
    const suiClient = getSuiClient()
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        try {
          // Fetch profile for the author's address
          const profile = await getProfile(post.author.address)
          
          // Fetch like count and check if current user liked it
          let likeCount = post.likeCount || 0
          let liked = post.liked || false
          
          if (post.id.startsWith('0x')) {
            likeCount = await fetchLikesForPost(suiClient, post.id)
            if (currentAccount) {
              liked = await hasUserLikedPost(suiClient, post.id, currentAccount.address)
            }
          }
          
          if (profile) {
            return {
              ...post,
              likeCount,
              liked,
              author: {
                ...post.author,
                username: profile.username,
                displayName: profile.displayName,
                avatar: profile.avatar,
                bio: profile.bio,
              }
            }
          }
          
          return {
            ...post,
            likeCount,
            liked,
          }
        } catch (error) {
          console.error(`Failed to fetch profile for ${post.author.address}:`, error)
        }
        return post
      })
    )
    return enrichedPosts
  }

  useEffect(() => {
    // Fetch posts from blockchain
    const fetchPosts = async () => {
      setLoading(true)
      try {
        const chainPosts = await getPostsFromChain(20, 0)
        
        // Load local posts from localStorage
        const localPosts = JSON.parse(localStorage.getItem('suitter_posts') || '[]')
        
        // Combine blockchain posts with local posts
        let allPosts = [...localPosts, ...chainPosts]
        
        // Enrich posts with profile data
        allPosts = await enrichPostsWithProfiles(allPosts)
        
        // If no posts at all, fall back to mock data
        if (allPosts.length === 0) {
          const followedUserIds = Array.from(following)
          const mockPosts = getPosts(activeTab as 'foryou' | 'following', followedUserIds)
          setPosts(mockPosts)
        } else {
          // Filter posts based on active tab
          if (activeTab === 'following' && following.size > 0) {
            const followedUserIds = Array.from(following)
            const filteredPosts = allPosts.filter(post => followedUserIds.includes(post.author.id))
            setPosts(filteredPosts)
          } else {
            setPosts(allPosts)
          }
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error)
        // Try loading from localStorage on error
        const localPosts = JSON.parse(localStorage.getItem('suitter_posts') || '[]')
        if (localPosts.length > 0) {
          setPosts(localPosts)
        } else {
          // Fall back to mock data
          const followedUserIds = Array.from(following)
          const mockPosts = getPosts(activeTab as 'foryou' | 'following', followedUserIds)
          setPosts(mockPosts)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [activeTab, following, getPostsFromChain, getProfile, getSuiClient, currentAccount])

  const handlePostCreated = async () => {
    // Refresh posts after creating a new one
    setLoading(true)
    try {
      const chainPosts = await getPostsFromChain(20, 0)
      const localPosts = JSON.parse(localStorage.getItem('suitter_posts') || '[]')
      let allPosts = [...localPosts, ...chainPosts]
      
      // Enrich posts with profile data
      allPosts = await enrichPostsWithProfiles(allPosts)
      
      if (allPosts.length === 0) {
        const followedUserIds = Array.from(following)
        const mockPosts = getPosts(activeTab as 'foryou' | 'following', followedUserIds)
        setPosts(mockPosts)
      } else {
        if (activeTab === 'following' && following.size > 0) {
          const followedUserIds = Array.from(following)
          const filteredPosts = allPosts.filter(post => followedUserIds.includes(post.author.id))
          setPosts(filteredPosts)
        } else {
          setPosts(allPosts)
        }
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      const localPosts = JSON.parse(localStorage.getItem('suitter_posts') || '[]')
      if (localPosts.length > 0) {
        setPosts(localPosts)
      } else {
        const followedUserIds = Array.from(following)
        const mockPosts = getPosts(activeTab as 'foryou' | 'following', followedUserIds)
        setPosts(mockPosts)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!currentAccount) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet to like posts',
      })
      return
    }
    
    // Optimistically update UI
    const previousPosts = [...posts]
    const post = posts.find(p => p.id === postId)
    const wasLiked = post?.liked || false
    
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1 }
        : post
    ))

    // Send to blockchain
    try {
      await likePost(postId)
      
      // Refresh like count from blockchain after a short delay
      setTimeout(async () => {
        try {
          const suiClient = getSuiClient()
          const likeCount = await fetchLikesForPost(suiClient, postId)
          const liked = await hasUserLikedPost(suiClient, postId, currentAccount.address)
          
          setPosts(prevPosts => prevPosts.map(post => 
            post.id === postId 
              ? { ...post, liked, likeCount }
              : post
          ))
        } catch (err) {
          console.error('Failed to refresh like count:', err)
        }
      }, 2000)
      
      toast({
        description: wasLiked ? 'Post unliked successfully' : 'Post liked successfully',
      })
    } catch (error) {
      console.error('Failed to like post on blockchain:', error)
      // Revert on error
      setPosts(previousPosts)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to like post. Please try again.',
      })
    }
  }

  const handleReshare = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, reshared: !post.reshared, reshareCount: post.reshared ? post.reshareCount - 1 : post.reshareCount + 1 }
        : post
    ))
    toast({
      description: 'Post reshared',
    })
  }

  const handleBookmark = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, bookmarked: !post.bookmarked }
        : post
    ))
    toast({
      description: posts.find(p => p.id === postId)?.bookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
    })
  }

  const handleCopyLink = (_postId: string) => {
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
    setPosts(posts.filter(post => post.id !== postId))
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

  return (
    <div className="flex flex-col">
      {/* Feed Header */}
      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full max-w-md">
              <TabsTrigger value="foryou" className="flex-1">For You</TabsTrigger>
              <TabsTrigger value="following" className="flex-1">Following</TabsTrigger>
            </TabsList>

            {/* For You Tab Content */}
            <TabsContent value="foryou" className="mt-0">
              {loading ? (
                <div className="divide-y divide-border">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-6 space-y-4">
                      <div className="flex gap-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {posts.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <PostCard
                        key={post.id}
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
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* Following Tab Content */}
            <TabsContent value="following" className="mt-0">
              {loading ? (
                <div className="divide-y divide-border">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-6 space-y-4">
                      <div className="flex gap-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {posts.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-muted-foreground">
                        {following.size === 0
                          ? "You're not following anyone yet. Follow some users to see their posts here!"
                          : "No posts from people you're following yet."}
                      </p>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <PostCard
                        key={post.id}
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
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Floating Create Post Button - Fixed position, doesn't scroll */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all hover:scale-105"
          onClick={() => setShowCreatePost(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <CreatePostModal 
        open={showCreatePost} 
        onOpenChange={setShowCreatePost}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { PostCard } from '@/components/PostCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { 
  UserPlus, 
  MoreHorizontal, 
  Edit, 
  Calendar, 
  MapPin, 
  Link as LinkIcon, 
  Upload, 
  X as XIcon,
  Check,
  MessageCircle,
  Heart,
  Image as ImageIcon,
  Verified,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { getUserById, getPosts, getRepliesByUserId, getMediaPostsByUserId, getLikedPostsByUserId, mockReplies, mockMediaPosts, mockLikedPosts } from '@/lib/mockData'
import { type User, type Post } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { useSui } from '@/hooks/useSui'
import { isContractConfigured, getConfigurationError } from '@/config/contracts'

export default function ProfilePage() {
  const { id } = useParams()
  const { currentUser } = useAuth()
  const { updateProfile: updateProfileOnChain, getUserProfileId, checkProfileExists, createProfile } = useSui()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [hasOnChainProfile, setHasOnChainProfile] = useState<boolean>(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [replies, setReplies] = useState<Post[]>([])
  const [mediaPosts, setMediaPosts] = useState<Post[]>([])
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState('posts')
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCreateProfileDialog, setShowCreateProfileDialog] = useState(false)
  const [createProfileName, setCreateProfileName] = useState('')
  const [createProfileBio, setCreateProfileBio] = useState('')
  const [createProfileAvatar, setCreateProfileAvatar] = useState('')
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [editBanner, setEditBanner] = useState('')
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const { getProfile } = useSui()
  
  const isOwnProfile = !id || id === currentUser?.id

  // Load profile ID when viewing own profile
  useEffect(() => {
    const loadProfileId = async () => {
      if (!isOwnProfile || !currentUser) return
      
      try {
        const profileExists = await checkProfileExists(currentUser.address)
        setHasOnChainProfile(profileExists)
        
        if (profileExists) {
          const id = await getUserProfileId(currentUser.address)
          setProfileId(id)
        }
      } catch (error) {
        console.error('Failed to load profile ID:', error)
      }
    }
    
    loadProfileId()
  }, [currentUser, isOwnProfile, checkProfileExists, getUserProfileId])

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      try {
        let profileUser: User | null = null
        
        if (id) {
          console.log('Fetching profile for ID:', id)
          // The ID could be either a profile ID or an address
          // Try to fetch as address first (most common case when clicking on posts)
          if (id.startsWith('0x')) {
            console.log('ID looks like an address, fetching profile...')
            profileUser = await getProfile(id)
            console.log('Profile fetched:', profileUser)
          }
          
          // Fall back to mock data if not found
          if (!profileUser) {
            console.log('No blockchain profile found, trying mock data')
            profileUser = getUserById(id) || null
          }
          
          if (!profileUser) {
            console.log('No profile found at all for ID:', id)
          }
        } else {
          // Viewing own profile
          if (currentUser) {
            // Try to fetch from blockchain
            profileUser = await getProfile(currentUser.address)
            
            // Fall back to currentUser if not found
            if (!profileUser) {
              profileUser = currentUser
            }
          } else {
            // Not connected - show realistic dummy profile
            profileUser = {
              id: 'demo',
              address: '0x1234567890abcdef1234567890abcdef12345678',
              username: 'sui_builder',
              displayName: 'Sui Builder',
              bio: 'Blockchain developer passionate about Web3 and decentralized applications. Building the future on Sui. 🚀 Always learning, always building.',
              avatar: '/placeholder-user.jpg',
              banner: '/placeholder.jpg',
              location: 'San Francisco, CA',
              website: 'suibuilder.dev',
              joinedAt: new Date('2023-11-15'),
              followersCount: 2847,
              followingCount: 523,
              isVerified: true,
            }
          }
        }
        
        if (profileUser) {
          setUser(profileUser)
          setEditName(profileUser.displayName)
          setEditBio(profileUser.bio || '')
          setEditLocation(profileUser.location || '')
          setEditWebsite(profileUser.website || '')
          setEditAvatar(profileUser.avatar)
          setEditBanner(profileUser.banner)
          
          // Get posts for this user from localStorage
          const localPosts = JSON.parse(localStorage.getItem('suitter_posts') || '[]')
          // Filter by wallet address instead of id
          const localUserPosts = localPosts.filter((p: any) => 
            p.author?.address === profileUser.address || p.authorId === profileUser.id
          )
          
          // Get posts from mock data
          const mockUserPosts = getPosts().filter(p => p.authorId === profileUser!.id)
          
          // Combine local and mock posts
          const userPosts = [...localUserPosts, ...mockUserPosts]
          const userReplies = getRepliesByUserId(profileUser.id)
          const userMedia = getMediaPostsByUserId(profileUser.id)
          const userLiked = getLikedPostsByUserId(profileUser.id)
          
          // If no posts found, use demo data to make profile look realistic
          // For demo/guest users, always show demo data
          // For other users, show demo data if they have no posts
          if (userPosts.length === 0 && profileUser.id === 'demo') {
            // Create posts with the user's info
            const demoPosts = getPosts().slice(0, 8).map((post, index) => ({
              ...post,
              id: `demo-post-${index}`,
              authorId: profileUser.id,
              author: profileUser,
            }))
            setPosts(demoPosts)
          } else {
            setPosts(userPosts)
          }
          
          if (userReplies.length === 0 && profileUser.id === 'demo') {
            const demoReplies = mockReplies.slice(0, 5).map((reply, index) => ({
              ...reply,
              id: `demo-reply-${index}`,
              authorId: profileUser.id,
              author: profileUser,
            }))
            setReplies(demoReplies)
          } else {
            setReplies(userReplies)
          }
          
          if (userMedia.length === 0 && profileUser.id === 'demo') {
            const demoMedia = mockMediaPosts.slice(0, 6).map((post, index) => ({
              ...post,
              id: `demo-media-${index}`,
              authorId: profileUser.id,
              author: profileUser,
            }))
            setMediaPosts(demoMedia)
          } else {
            setMediaPosts(userMedia)
          }
          
          // Liked posts can be from any user, so we don't need to change author
          if (userLiked.length === 0) {
            setLikedPosts(mockLikedPosts.slice(0, 7))
          } else {
            setLikedPosts(userLiked)
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfile()
  }, [id, currentUser, getProfile])

  const handleFollow = () => {
    setIsFollowing(!isFollowing)
    if (user) {
      setUser({
        ...user,
        followersCount: isFollowing ? user.followersCount - 1 : user.followersCount + 1,
      })
    }
  }

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1 }
        : post
    ))
    setReplies(replies.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1 }
        : post
    ))
    setMediaPosts(mediaPosts.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1 }
        : post
    ))
    setLikedPosts(likedPosts.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1 }
        : post
    ))
  }

  const handleReshare = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, reshared: !post.reshared, reshareCount: post.reshared ? post.reshareCount - 1 : post.reshareCount + 1 }
        : post
    ))
    setReplies(replies.map(post => 
      post.id === postId 
        ? { ...post, reshared: !post.reshared, reshareCount: post.reshared ? post.reshareCount - 1 : post.reshareCount + 1 }
        : post
    ))
    setMediaPosts(mediaPosts.map(post => 
      post.id === postId 
        ? { ...post, reshared: !post.reshared, reshareCount: post.reshared ? post.reshareCount - 1 : post.reshareCount + 1 }
        : post
    ))
    setLikedPosts(likedPosts.map(post => 
      post.id === postId 
        ? { ...post, reshared: !post.reshared, reshareCount: post.reshared ? post.reshareCount - 1 : post.reshareCount + 1 }
        : post
    ))
  }

  const handleBookmark = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, bookmarked: !post.bookmarked }
        : post
    ))
    setReplies(replies.map(post => 
      post.id === postId 
        ? { ...post, bookmarked: !post.bookmarked }
        : post
    ))
    setMediaPosts(mediaPosts.map(post => 
      post.id === postId 
        ? { ...post, bookmarked: !post.bookmarked }
        : post
    ))
    setLikedPosts(likedPosts.map(post => 
      post.id === postId 
        ? { ...post, bookmarked: !post.bookmarked }
        : post
    ))
    toast({
      description: posts.find(p => p.id === postId)?.bookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
    })
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
    setPosts(posts.filter(post => post.id !== postId))
    setReplies(replies.filter(post => post.id !== postId))
    setMediaPosts(mediaPosts.filter(post => post.id !== postId))
    setLikedPosts(likedPosts.filter(post => post.id !== postId))
    toast({
      description: 'Post deleted',
    })
  }

  const _handleFollowUser = (userId: string) => {
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

  const handleCreateProfile = async () => {
    if (!createProfileName.trim() || !currentUser) return
    
    // Check if contract is configured
    if (!isContractConfigured()) {
      toast({
        title: 'Configuration Required',
        description: getConfigurationError(),
      })
      return
    }
    
    setIsCreatingProfile(true)
    try {
      await createProfile(
        createProfileName,
        createProfileBio || '',
        createProfileAvatar || '/placeholder-user.jpg'
      )
      
      toast({
        description: 'Profile created successfully on blockchain!',
      })
      
      // Refresh profile data
      const newProfileId = await getUserProfileId(currentUser.address)
      setProfileId(newProfileId)
      setHasOnChainProfile(true)
      
      // Update user state
      if (user) {
        setUser({
          ...user,
          username: createProfileName,
          displayName: createProfileName,
          bio: createProfileBio || '',
          avatar: createProfileAvatar || '/placeholder-user.jpg',
        })
      }
      
      // Close dialog and reset form
      setShowCreateProfileDialog(false)
      setCreateProfileName('')
      setCreateProfileBio('')
      setCreateProfileAvatar('')
      
    } catch (error) {
      console.error('Failed to create profile:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create profile. Please try again.',
      })
    } finally {
      setIsCreatingProfile(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !editName.trim()) return
    
    // Check if contract is configured
    if (!isContractConfigured()) {
      toast({
        title: 'Configuration Required',
        description: getConfigurationError(),
      })
      return
    }
    
    try {
      // If we have a profileId, update it on-chain
      if (profileId && isOwnProfile) {
        await updateProfileOnChain(
          profileId,
          editName,
          editBio,
          editAvatar
        )
        
        toast({
          description: 'Profile updated on blockchain',
        })
      } else if (isOwnProfile && !hasOnChainProfile) {
        // Create new profile on-chain
        try {
          await createProfile(editName, editBio, editAvatar)
          
          toast({
            description: 'Profile created on blockchain',
          })
          
          // Refresh profile ID
          if (currentUser) {
            const newProfileId = await getUserProfileId(currentUser.address)
            setProfileId(newProfileId)
            setHasOnChainProfile(true)
          }
        } catch (error: any) {
          if (error.message?.includes('Profile already exists')) {
            // Profile was created in another session, just refresh
            if (currentUser) {
              const existingProfileId = await getUserProfileId(currentUser.address)
              setProfileId(existingProfileId)
              setHasOnChainProfile(true)
            }
          } else {
            throw error
          }
        }
      }
      
      // Update local state
      setUser({
        ...user,
        displayName: editName,
        bio: editBio,
        location: editLocation || undefined,
        website: editWebsite || undefined,
        avatar: editAvatar,
        banner: editBanner,
      })
      
      setShowEditDialog(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile. Please try again.',
      })
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditBanner(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-48 md:h-56 w-full" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="relative -mt-20 mb-6">
            <div className="flex items-end gap-4 mb-6">
              <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-full" />
              <div className="pb-2">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <Skeleton className="h-6 w-full max-w-xl" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-6 pt-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <Skeleton className="h-10 w-full max-w-md rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground mb-4">User not found</p>
        {!currentUser && (
          <p className="text-sm text-muted-foreground mb-4">
            Connect your wallet to view your profile
          </p>
        )}
        <Link to="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner Section */}
      <div className="relative h-56 md:h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 overflow-hidden">
        {user.banner ? (
          <div className="relative w-full h-full">
            <img
              src={user.banner}
              alt="Profile banner"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5" />
        )}
        
        {isOwnProfile && currentUser && (
          <div className="absolute top-4 right-4 z-10">
            {hasOnChainProfile ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
                className="bg-background/95 backdrop-blur-md hover:bg-background shadow-lg border-border/50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowCreateProfileDialog(true)}
                className="bg-primary/95 backdrop-blur-md hover:bg-primary shadow-lg"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Profile
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Profile Header */}
        <div className="relative -mt-24 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            {/* Avatar and Name */}
            <div className="flex items-end gap-5">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/50 to-primary/20 rounded-full opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
                <Avatar className="relative w-28 h-28 sm:w-36 sm:h-36 border-4 border-background shadow-2xl ring-2 ring-border/50">
                  <AvatarImage src={user.avatar} alt={user.displayName} />
                  <AvatarFallback className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                    {user.displayName[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {user.isVerified && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary border-4 border-background flex items-center justify-center shadow-lg">
                    <Verified className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              
              <div className="pb-3 space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl sm:text-4xl font-bold">{user.displayName}</h1>
                  {user.isVerified && (
                    <Verified className="w-5 h-5 text-primary" />
                  )}
                </div>
                <p className="text-muted-foreground text-lg">@{user.username}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!isOwnProfile && currentUser && (
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  onClick={handleFollow}
                  className={cn(
                    "min-w-[120px] font-semibold transition-all",
                    isFollowing && "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                  )}
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              )}
              {isOwnProfile && !currentUser && (
                <WalletConnectButton />
              )}
              {currentUser && (
                <Button variant="outline" size="icon" className="hover:bg-muted">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bio and Info */}
        <div className="mb-8 space-y-5">
          {user.bio && (
            <p className="text-base leading-relaxed text-foreground/90 max-w-2xl">{user.bio}</p>
          )}
          
          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-5 text-sm">
            {user.location && (
              <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <MapPin className="w-4 h-4" />
                <span>{user.location}</span>
              </div>
            )}
            {user.website && (
              <a
                href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{user.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Joined {format(new Date(user.joinedAt), 'MMMM yyyy')}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 pt-6 border-t border-border">
            <Link
              to={`/profile/${user.id}/following`}
              className="group hover:opacity-80 transition-all"
            >
              <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {user.followingCount.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Following
                </span>
              </div>
            </Link>
            <Link
              to={`/profile/${user.id}/followers`}
              className="group hover:opacity-80 transition-all"
            >
              <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {user.followersCount.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Followers
                </span>
              </div>
            </Link>
            <div className="group">
              <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground">
                  {posts.length.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">
                  Posts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger 
              value="posts" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="replies"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold"
            >
              Replies
            </TabsTrigger>
            <TabsTrigger 
              value="media"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold"
            >
              Media
            </TabsTrigger>
            <TabsTrigger 
              value="likes"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold"
            >
              Likes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-8">
            {posts.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-muted/30">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-semibold text-foreground mb-2">No posts yet</p>
                {isOwnProfile && currentUser && (
                  <p className="text-sm text-muted-foreground">Start sharing your thoughts with the community</p>
                )}
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {posts.map(post => (
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
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="replies" className="mt-8">
            {replies.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-muted/30">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-semibold text-foreground mb-2">No replies yet</p>
                <p className="text-sm text-muted-foreground">Replies will appear here</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {replies.map(reply => (
                  <PostCard 
                    key={reply.id} 
                    post={reply}
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
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="mt-8">
            {mediaPosts.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-muted/30">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-semibold text-foreground mb-2">No media yet</p>
                <p className="text-sm text-muted-foreground">Photos and videos will appear here</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {mediaPosts.map(post => (
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
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="likes" className="mt-8">
            {likedPosts.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-muted/30">
                <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-semibold text-foreground mb-2">No liked posts yet</p>
                <p className="text-sm text-muted-foreground">Posts you like will appear here</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {likedPosts.map(post => (
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
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Profile Dialog */}
      <Dialog open={showCreateProfileDialog} onOpenChange={setShowCreateProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Create Your Profile</DialogTitle>
            <DialogDescription className="text-base">
              Set up your on-chain profile to get started
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Username */}
            <div>
              <Label htmlFor="create-name" className="text-base font-semibold">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-name"
                value={createProfileName}
                onChange={(e) => setCreateProfileName(e.target.value)}
                placeholder="Your display name"
                className="mt-2"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be your on-chain identity
              </p>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="create-bio" className="text-base font-semibold">
                Bio <span className="text-muted-foreground text-sm">(optional)</span>
              </Label>
              <Textarea
                id="create-bio"
                value={createProfileBio}
                onChange={(e) => setCreateProfileBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="mt-2 resize-none"
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {createProfileBio.length}/160 characters
              </p>
            </div>

            {/* Avatar URL */}
            <div>
              <Label htmlFor="create-avatar" className="text-base font-semibold">
                Avatar URL <span className="text-muted-foreground text-sm">(optional)</span>
              </Label>
              <Input
                id="create-avatar"
                value={createProfileAvatar}
                onChange={(e) => setCreateProfileAvatar(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use default avatar
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateProfileDialog(false)}
              disabled={isCreatingProfile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProfile}
              disabled={!createProfileName.trim() || isCreatingProfile}
              className="min-w-[120px]"
            >
              {isCreatingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Profile'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Edit Profile</DialogTitle>
            <DialogDescription className="text-base">
              Update your profile information and make it stand out
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Banner Upload */}
            <div>
              <Label className="text-base font-semibold">Banner Image</Label>
              <p className="text-sm text-muted-foreground mb-3">Upload a banner to personalize your profile</p>
              <div className="mt-2">
                <div className="h-40 w-full bg-gradient-to-br from-muted to-muted/50 rounded-xl overflow-hidden border-2 border-border">
                  {editBanner ? (
                    <div className="relative h-full group">
                      <img
                        src={editBanner}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setEditBanner('')}
                        >
                          <XIcon className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-border/50">
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No banner image</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  id="banner-upload"
                  className="hidden"
                />
                <label htmlFor="banner-upload" className="mt-3 block">
                  <Button variant="outline" size="sm" className="w-full cursor-pointer font-semibold" type="button">
                    <Upload className="w-4 h-4 mr-2" />
                    {editBanner ? 'Change Banner' : 'Upload Banner'}
                  </Button>
                </label>
              </div>
            </div>

            {/* Avatar Upload */}
            <div>
              <Label className="text-base font-semibold">Profile Picture</Label>
              <p className="text-sm text-muted-foreground mb-3">Your profile picture appears next to your posts</p>
              <div className="mt-2 flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-background shadow-lg ring-2 ring-border">
                    <AvatarImage src={editAvatar} />
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                      {editName[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    id="avatar-upload"
                    className="hidden"
                  />
                  <label htmlFor="avatar-upload">
                    <Button variant="outline" size="sm" type="button" className="cursor-pointer font-semibold">
                      <Upload className="w-4 h-4 mr-2" />
                      {editAvatar ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                  </label>
                  {editAvatar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditAvatar('')}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <Label htmlFor="displayName" className="text-base font-semibold">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Your display name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={50}
                className="mt-2 h-11"
              />
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {editName.length} / 50
              </p>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio" className="text-base font-semibold">Bio</Label>
              <p className="text-sm text-muted-foreground mb-2">Tell the community about yourself</p>
              <Textarea
                id="bio"
                placeholder="What's on your mind?"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={160}
                rows={4}
                className="mt-2 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {editBio.length} / 160
              </p>
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location" className="text-base font-semibold">Location</Label>
              <Input
                id="location"
                placeholder="City, Country"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="mt-2 h-11"
              />
            </div>

            {/* Website */}
            <div>
              <Label htmlFor="website" className="text-base font-semibold">Website</Label>
              <Input
                id="website"
                placeholder="https://example.com"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                type="url"
                className="mt-2 h-11"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="font-semibold">
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={!editName.trim()} className="font-semibold min-w-[120px]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

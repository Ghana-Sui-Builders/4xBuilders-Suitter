import { useState, useRef } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useSui } from '@/hooks/useSui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog'
import { Textarea } from './ui/Textarea'
import { Button } from './ui/Button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar'
import { Loader2, Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MAX_POST_CHARS } from '@/lib/constants'
import { EmojiPicker } from './EmojiPicker'
import { useToast } from '@/hooks/useToast'

interface CreatePostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPostCreated?: () => void
}

export function CreatePostModal({ open, onOpenChange, onPostCreated }: CreatePostModalProps) {
  const currentAccount = useCurrentAccount()
  const { createPost, getProfile } = useSui()
  const { toast } = useToast()
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const MAX_IMAGES = 4

  const charCount = content.length
  const isOverLimit = charCount > MAX_POST_CHARS
  const canPost = content.trim().length > 0 && !isOverLimit && !isPosting && currentAccount

  // Extract URLs from content
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urls = content.match(urlRegex) || []

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const remainingSlots = MAX_IMAGES - images.length

    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          setImages(prev => [...prev, result])
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handlePost = async () => {
    if (!canPost || !currentAccount) return

    setIsPosting(true)
    try {
      console.log('Creating post with content:', content)
      console.log('Current account:', currentAccount)
      console.log('Images:', images)
      
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
      
      // Create post on blockchain
      const txResult = await createPost(content, images)
      console.log('Transaction result:', txResult)
      
      // Use the object ID if available, otherwise use digest
      const postId = (txResult as any).objectId || (txResult as any).digest || txResult
      
      // Save post locally so it appears immediately
      const newPost = {
        id: postId,
        author: user,
        authorId: user.id,
        content,
        images,
        createdAt: new Date(),
        likeCount: 0,
        replyCount: 0,
        reshareCount: 0,
        viewCount: 0,
        liked: false,
        reshared: false,
        bookmarked: false,
      }
      
      console.log('Saving post locally:', newPost)
      
      // Store in localStorage
      const existingPosts = JSON.parse(localStorage.getItem('suitter_posts') || '[]')
      existingPosts.unshift(newPost)
      localStorage.setItem('suitter_posts', JSON.stringify(existingPosts))
      
      toast({
        description: 'Post created successfully!',
      })
      
      setContent('')
      setImages([])
      onOpenChange(false)
      
      // Notify parent component to refresh posts
      if (onPostCreated) {
        onPostCreated()
      }
    } catch (error: any) {
      console.error('Failed to create post:', error)
      console.error('Error message:', error?.message)
      console.error('Error stack:', error?.stack)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create post. Please try again.',
      })
    } finally {
      setIsPosting(false)
    }
  }

  const handleClose = () => {
    if (!isPosting) {
      setContent('')
      setImages([])
      onOpenChange(false)
    }
  }

  const initials = currentAccount?.address
    ?.slice(2, 4)
    .toUpperCase() || 'U'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl overflow-visible">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Share your thoughts with the community
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex gap-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src="/placeholder-user.jpg" alt={currentAccount?.address || 'User'} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="What's happening?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] resize-none pr-10"
                  maxLength={MAX_POST_CHARS + 100} // Allow typing past limit for visual feedback
                />
                <div className="absolute bottom-2 right-2">
                  <EmojiPicker
                    onEmojiSelect={(emoji) => {
                      setContent(prev => prev + emoji)
                    }}
                  />
                </div>
              </div>

              {/* Link Preview */}
              {urls.length > 0 && (
                <div className="space-y-2">
                  {urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate flex-1"
                      >
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Image Preview */}
              {images.length > 0 && (
                <div className={cn(
                  "grid gap-2",
                  images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                  {images.map((image, index) => (
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

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={images.length >= MAX_IMAGES || isPosting}
                    aria-label="Upload images"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={images.length >= MAX_IMAGES || isPosting}
                    className="hover:bg-muted"
                  >
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </Button>
                  {images.length >= MAX_IMAGES && (
                    <span className="text-xs text-muted-foreground">
                      Max {MAX_IMAGES} images
                    </span>
                  )}
                </div>

                {/* Character Counter and Post Button */}
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    <span className={cn(
                      charCount > MAX_POST_CHARS * 0.9 && 'text-yellow-600 dark:text-yellow-400',
                      isOverLimit && 'text-destructive'
                    )}>
                      {charCount} / {MAX_POST_CHARS}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={isPosting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePost}
                      disabled={!canPost}
                    >
                      {isPosting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        'Post'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


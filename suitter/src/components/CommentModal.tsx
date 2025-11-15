import { useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
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
import { Loader2, Image as ImageIcon, X, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MAX_POST_CHARS } from '@/lib/constants'
import { EmojiPicker } from './EmojiPicker'
import { useToast } from '@/hooks/useToast'
import { Post } from '@/lib/types'

interface CommentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: Post
  onCommentAdded?: () => void
  isReply?: boolean
  parentReplyId?: string
}

export function CommentModal({ 
  open, 
  onOpenChange, 
  post, 
  onCommentAdded,
  isReply = false,
  parentReplyId 
}: CommentModalProps) {
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isPosting, setIsPosting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const MAX_IMAGES = 4

  const charCount = content.length
  const isOverLimit = charCount > MAX_POST_CHARS
  const canPost = content.trim().length > 0 && !isOverLimit && !isPosting

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

  const handleComment = async () => {
    if (!canPost || !currentUser) return

    setIsPosting(true)
    try {
      // TODO: Integrate with blockchain to create comment/reply
      // For now, this is a mock implementation
      
      toast({
        description: isReply ? 'Reply posted successfully!' : 'Comment posted successfully!',
      })
      
      setContent('')
      setImages([])
      onOpenChange(false)
      
      // Notify parent component to refresh comments
      if (onCommentAdded) {
        onCommentAdded()
      }
    } catch (error) {
      console.error('Failed to post comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to post comment. Please try again.',
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

  const initials = currentUser?.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl overflow-visible">
        <DialogHeader>
          <DialogTitle>{isReply ? 'Reply' : 'Add Comment'}</DialogTitle>
          <DialogDescription>
            {isReply ? 'Post your reply' : 'Share your thoughts on this post'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex gap-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={currentUser?.avatar} alt={currentUser?.displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="relative">
                <Textarea
                  placeholder={isReply ? "Post your reply..." : "Add a comment..."}
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

                {/* Character Counter and Send Button */}
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
                      onClick={handleComment}
                      disabled={!canPost}
                      className="gap-2"
                    >
                      {isPosting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {isReply ? 'Replying...' : 'Posting...'}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {isReply ? 'Reply' : 'Comment'}
                        </>
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



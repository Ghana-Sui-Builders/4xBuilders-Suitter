import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar'
import { Button } from './ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/DropdownMenu'
import { MessageCircle, Repeat2, Heart, Share2, Bookmark, MoreHorizontal, Copy, Trash2, Flag, UserX, VolumeX, UserPlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Post } from '@/lib/types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { CommentModal } from './CommentModal'

interface PostCardProps {
  post: Post
  onLike?: (postId: string) => void
  onReshare?: (postId: string) => void
  onBookmark?: (postId: string) => void
  onCopyLink?: (postId: string) => void
  onShare?: (postId: string) => void
  onMute?: (userId: string) => void
  onBlock?: (userId: string) => void
  onReport?: (postId: string) => void
  onDelete?: (postId: string) => void
  onFollow?: (userId: string) => void
}

export function PostCard({ 
  post, 
  onLike, 
  onReshare, 
  onBookmark,
  onCopyLink,
  onShare,
  onMute,
  onBlock,
  onReport,
  onDelete,
  onFollow,
}: PostCardProps) {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [showCommentModal, setShowCommentModal] = useState(false)
  const isOwnPost = currentUser?.id === post.author.id
  
  const initials = post.author.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(url)
    onCopyLink?.(post.id)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author.displayName}`,
          text: post.content,
          url: `${window.location.origin}/post/${post.id}`,
        })
        onShare?.(post.id)
      } catch (err) {
        // User cancelled or error occurred
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group p-6 border-b border-border hover:bg-muted/50 transition-colors"
    >
      <div className="flex gap-4">
        <Link to={`/profile/${post.author.address}`}>
          <Avatar className="w-12 h-12">
            <AvatarImage src={post.author.avatar} alt={post.author.displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <Link to={`/profile/${post.author.address}`} className="flex items-center gap-2 hover:opacity-80">
              <span className="font-semibold text-foreground">{post.author.displayName}</span>
              <span className="text-sm text-muted-foreground">@{post.author.username}</span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon-sm" 
                  className="opacity-60 hover:opacity-100 hover:bg-muted transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isOwnPost ? (
                  <>
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <Copy className="w-4 h-4" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="w-4 h-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete?.(post.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <Copy className="w-4 h-4" />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="w-4 h-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {onFollow && (
                      <DropdownMenuItem onClick={() => onFollow(post.author.id)}>
                        <UserPlus className="w-4 h-4" />
                        Follow @{post.author.username}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onMute?.(post.author.id)}>
                      <VolumeX className="w-4 h-4" />
                      Mute @{post.author.username}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBlock?.(post.author.id)}>
                      <UserX className="w-4 h-4" />
                      Block @{post.author.username}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onReport?.(post.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Flag className="w-4 h-4" />
                      Report post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <Link to={`/post/${post.id}`}>
            <p className="text-base text-foreground leading-relaxed mb-3 whitespace-pre-wrap">
              {post.content}
            </p>
          </Link>

          {/* Images */}
          {post.images.length > 0 && (
            <div className={cn(
              'mt-3 rounded-2xl overflow-hidden border border-border',
              post.images.length === 1 ? 'w-full' : 'grid grid-cols-2 gap-2'
            )}>
              {post.images.map((image, idx) => (
                <img
                  key={idx}
                  src={image}
                  alt={`Post image ${idx + 1}`}
                  className="w-full h-auto bg-muted object-cover max-h-[1200px]"
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 hover:text-foreground rounded-full"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (currentUser) {
                  setShowCommentModal(true)
                } else {
                  navigate(`/post/${post.id}`)
                }
              }}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">{post.replyCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'flex items-center gap-2 rounded-full',
                post.reshared
                  ? 'text-foreground'
                  : 'hover:text-foreground'
              )}
              onClick={() => onReshare?.(post.id)}
            >
              <Repeat2 className="w-4 h-4" />
              <span className="text-sm">{post.reshareCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'flex items-center gap-2 rounded-full',
                post.liked
                  ? 'text-foreground'
                  : 'hover:text-foreground'
              )}
              onClick={() => onLike?.(post.id)}
            >
              <Heart className={cn('w-4 h-4', post.liked && 'fill-current')} />
              <span className="text-sm">{post.likeCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 hover:text-foreground rounded-full"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleShare()
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'flex items-center gap-2 rounded-full',
                post.bookmarked && 'text-foreground'
              )}
              onClick={() => onBookmark?.(post.id)}
            >
              <Bookmark className={cn('w-4 h-4', post.bookmarked && 'fill-current')} />
            </Button>
          </div>
        </div>
      </div>

      <CommentModal
        open={showCommentModal}
        onOpenChange={setShowCommentModal}
        post={post}
        onCommentAdded={() => {
          // Optionally refresh post data or update reply count
        }}
      />
    </motion.article>
  )
}


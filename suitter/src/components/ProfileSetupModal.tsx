import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Button } from './ui/Button'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useSui } from '@/hooks/useSui'

interface ProfileSetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProfileCreated?: () => void
}

export function ProfileSetupModal({ open, onOpenChange, onProfileCreated }: ProfileSetupModalProps) {
  const { createProfile } = useSui()
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const canCreate = displayName.trim().length > 0 && !isCreating

  const handleCreate = async () => {
    if (!canCreate) return

    setIsCreating(true)
    try {
      await createProfile(displayName, bio, avatar)
      
      toast({
        description: 'Profile created successfully!',
      })
      
      setDisplayName('')
      setBio('')
      setAvatar('')
      onOpenChange(false)
      
      if (onProfileCreated) {
        onProfileCreated()
      }
    } catch (error) {
      console.error('Failed to create profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to create profile. Please try again.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Setup Your Profile</DialogTitle>
          <DialogDescription>
            Create your profile to start using Suitter
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name *</label>
            <Input
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              placeholder="Tell us about yourself"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isCreating}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Avatar URL</label>
            <Input
              placeholder="https://example.com/avatar.jpg"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Skip for now
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={!canCreate}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Profile'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

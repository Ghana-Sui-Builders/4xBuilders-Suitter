import { useCallback } from 'react'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { User, Post, Reply } from '@/lib/types'
import { 
  createProfileOnChain,
  updateProfileOnChain,
  createPostOnChain, 
  likePostOnChain, 
  addCommentOnChain,
  fetchPostsFromChain,
  fetchLikesForPost,
  fetchCommentsForPost,
  fetchUserProfile,
  createConversationOnChain,
  sendMessageOnChain,
  fetchConversations,
  fetchMessages,
  hasProfile,
  getProfileId,
  getProfile as getProfileFromChain,
  PROFILE_REGISTRY_ID
} from '@/services/suiService'

// Sui network configuration
const SUI_NETWORK = 'testnet' // Change to 'mainnet' for production
const FULLNODE_URL = getFullnodeUrl(SUI_NETWORK)

let suiClient: SuiClient | null = null

export function getSuiClient(): SuiClient {
  if (!suiClient) {
    suiClient = new SuiClient({ url: FULLNODE_URL })
  }
  return suiClient
}

export function useSui() {
  const currentAccount = useCurrentAccount()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  // Profile operations
  const createProfile = useCallback(async (displayName: string, bio: string, avatar?: string, banner?: string): Promise<string> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    if (!PROFILE_REGISTRY_ID) {
      throw new Error('Profile registry not initialized. Please set the registry ID first.')
    }

    const client = getSuiClient()
    
    // Check if profile already exists
    const profileExists = await hasProfile(client, PROFILE_REGISTRY_ID, currentAccount.address)
    if (profileExists) {
      throw new Error('Profile already exists for this address')
    }
    
    // Create a signer object compatible with the service
    const signer = {
      signAndExecuteTransaction: (params: any) => {
        return new Promise((resolve, reject) => {
          if (!params.transaction) {
            reject(new Error('Transaction is undefined'))
            return
          }
          signAndExecuteTransaction(
            {
              transaction: params.transaction,
            },
            {
              onSuccess: (result) => resolve(result),
              onError: (error) => reject(error),
            }
          )
        })
      }
    }
    
    const result = await createProfileOnChain(
      client,
      signer as any,
      PROFILE_REGISTRY_ID,
      displayName,
      bio,
      avatar || ''
    )

    return result.digest
  }, [currentAccount, signAndExecuteTransaction])

  const updateProfile = useCallback(async (profileId: string, displayName: string, bio: string, avatar: string): Promise<string> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    const client = getSuiClient()
    
    // Create a signer object compatible with the service
    const signer = {
      signAndExecuteTransaction: (params: any) => {
        return new Promise((resolve, reject) => {
          if (!params.transaction) {
            reject(new Error('Transaction is undefined'))
            return
          }
          signAndExecuteTransaction(
            {
              transaction: params.transaction,
            },
            {
              onSuccess: (result) => resolve(result),
              onError: (error) => reject(error),
            }
          )
        })
      }
    }
    
    const result = await updateProfileOnChain(
      client,
      signer as any,
      profileId,
      displayName,
      bio,
      avatar
    )

    return result.digest
  }, [currentAccount, signAndExecuteTransaction])

  const getProfile = useCallback(async (address: string): Promise<User | null> => {
    const client = getSuiClient()
    
    if (!PROFILE_REGISTRY_ID) {
      console.warn('Profile registry not initialized')
      return null
    }
    
    try {
      // First check if profile exists
      const profileExists = await hasProfile(client, PROFILE_REGISTRY_ID, address)
      if (!profileExists) {
        return null
      }
      
      // Get the profile ID from the registry
      const profileId = await getProfileId(client, PROFILE_REGISTRY_ID, address)
      if (!profileId) {
        return null
      }
      
      // Fetch the profile object
      const profileData = await getProfileFromChain(client, profileId)
      if (!profileData) {
        return null
      }
      
      // Convert to User format
      return {
        id: profileId,
        address: address,
        username: (profileData as any).username || '',
        displayName: (profileData as any).username || '',
        bio: (profileData as any).bio || '',
        avatar: (profileData as any).image_url || '',
        banner: '',
        joinedAt: new Date(),
        followersCount: 0,
        followingCount: 0,
        isVerified: false,
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }, [])
  
  const checkProfileExists = useCallback(async (address: string): Promise<boolean> => {
    if (!PROFILE_REGISTRY_ID) {
      return false
    }
    
    const client = getSuiClient()
    return await hasProfile(client, PROFILE_REGISTRY_ID, address)
  }, [])
  
  const getUserProfileId = useCallback(async (address: string): Promise<string | null> => {
    if (!PROFILE_REGISTRY_ID) {
      return null
    }
    
    const client = getSuiClient()
    return await getProfileId(client, PROFILE_REGISTRY_ID, address)
  }, [])

  // Post operations
  const createPost = useCallback(async (content: string, images: string[] = []): Promise<{ digest: string; objectId: string }> => {
    console.log('useSui.createPost called')
    console.log('currentAccount:', currentAccount)
    console.log('signAndExecuteTransaction available:', !!signAndExecuteTransaction)
    
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    if (content.length > 280) {
      throw new Error('Post content exceeds 280 characters')
    }

    const client = getSuiClient()
    
    // For now, images are stored as base64 data URLs in the frontend
    // In production, you would upload images to IPFS or similar storage
    // and pass the URLs to the smart contract
    // For now, we'll pass empty array and handle images client-side
    const imageUrls: string[] = [] // TODO: Upload images to IPFS and get URLs
    
    console.log('Calling createPostOnChain...')
    
    // Create a signer object compatible with the service
    const signer = {
      signAndExecuteTransaction: (params: any) => {
        console.log('Signer wrapper called with params:', params)
        return new Promise((resolve, reject) => {
          if (!params.transaction) {
            reject(new Error('Transaction is undefined'))
            return
          }
          // Extract options from params if they exist
          const txConfig: any = { transaction: params.transaction }
          
          signAndExecuteTransaction(
            txConfig,
            {
              onSuccess: (result) => {
                console.log('Transaction success:', result)
                // If we need effects/objectChanges, fetch them separately
                resolve(result)
              },
              onError: (error) => {
                console.error('Transaction error:', error)
                reject(error)
              },
            }
          )
        })
      }
    }
    
    const result = await createPostOnChain(
      client,
      signer as any,
      content,
      imageUrls
    )
    
    console.log('createPostOnChain result:', result)
    // Return both digest and objectId (if available)
    return {
      digest: result.digest,
      objectId: result.objectId || result.digest
    }
  }, [currentAccount, signAndExecuteTransaction])

  const deletePost = useCallback(async (postId: string): Promise<string> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    const tx = new Transaction()
    
    // TODO: Implement actual contract call
    return new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => resolve(result.digest),
          onError: (error) => reject(error),
        }
      )
    })
  }, [currentAccount, signAndExecuteTransaction])

  const getPosts = useCallback(async (limit = 20, offset = 0): Promise<Post[]> => {
    const client = getSuiClient()
    
    try {
      const posts = await fetchPostsFromChain(client) as Post[]
      return posts.slice(offset, offset + limit)
    } catch (error) {
      console.error('Error fetching posts:', error)
      return []
    }
  }, [])

  const getPostById = useCallback(async (postId: string): Promise<Post | null> => {
    const client = getSuiClient()
    
    try {
      const posts = (await fetchPostsFromChain(client)) as Post[]
      const post = posts.find((p: Post) => p.id === postId)
      return post || null
    } catch (error) {
      console.error('Error fetching post:', error)
      return null
    }
  }, [])

  // Interaction operations
  const likePost = useCallback(async (postId: string): Promise<string> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    const client = getSuiClient()
    
    // Create a signer object compatible with the service
    const signer = {
      signAndExecuteTransaction: (params: any) => {
        return new Promise((resolve, reject) => {
          if (!params.transaction) {
            reject(new Error('Transaction is undefined'))
            return
          }
          signAndExecuteTransaction(
            {
              transaction: params.transaction,
            },
            {
              onSuccess: (result) => resolve(result),
              onError: (error) => reject(error),
            }
          )
        })
      }
    }
    
    const result = await likePostOnChain(
      client,
      signer as any,
      postId
    )

    return result.digest
  }, [currentAccount, signAndExecuteTransaction])

  const unlikePost = useCallback(async (postId: string): Promise<string> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    const tx = new Transaction()
    
    // TODO: Implement actual contract call
    return new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => resolve(result.digest),
          onError: (error) => reject(error),
        }
      )
    })
  }, [currentAccount, signAndExecuteTransaction])

  const resharePost = useCallback(async (postId: string): Promise<string> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    const tx = new Transaction()
    
    // TODO: Implement actual contract call
    return new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => resolve(result.digest),
          onError: (error) => reject(error),
        }
      )
    })
  }, [currentAccount, signAndExecuteTransaction])

  const commentOnPost = useCallback(async (postId: string, content: string, images: string[] = []): Promise<string> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    const client = getSuiClient()
    
    // Create a signer object compatible with the service
    const signer = {
      signAndExecuteTransaction: (params: any) => {
        return new Promise((resolve, reject) => {
          if (!params.transaction) {
            reject(new Error('Transaction is undefined'))
            return
          }
          signAndExecuteTransaction(
            {
              transaction: params.transaction,
            },
            {
              onSuccess: (result) => resolve(result),
              onError: (error) => reject(error),
            }
          )
        })
      }
    }
    
    const result = await addCommentOnChain(
      client,
      signer as any,
      postId,
      content
    )

    return result.digest
  }, [currentAccount, signAndExecuteTransaction])

  // Follow operations
  const followUser = useCallback(async (userId: string): Promise<string> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    const tx = new Transaction()
    
    // TODO: Implement actual contract call
    return new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => resolve(result.digest),
          onError: (error) => reject(error),
        }
      )
    })
  }, [currentAccount, signAndExecuteTransaction])

  const unfollowUser = useCallback(async (userId: string): Promise<string> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    const tx = new Transaction()
    
    // TODO: Implement actual contract call
    return new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => resolve(result.digest),
          onError: (error) => reject(error),
        }
      )
    })
  }, [currentAccount, signAndExecuteTransaction])

  const getFollowers = useCallback(async (userId: string, limit = 20, offset = 0): Promise<User[]> => {
    const client = getSuiClient()
    
    // TODO: Query on-chain followers
    return []
  }, [])

  const getFollowing = useCallback(async (userId: string, limit = 20, offset = 0): Promise<User[]> => {
    const client = getSuiClient()
    
    // TODO: Query on-chain following
    return []
  }, [])

  // Notification operations
  const getNotifications = useCallback(async (limit = 20, offset = 0) => {
    const client = getSuiClient()
    
    // TODO: Query on-chain notifications
    return []
  }, [])

  const markNotificationRead = useCallback(async (notificationId: string): Promise<string> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    const tx = new Transaction()
    
    // TODO: Implement actual contract call
    return new Promise((resolve, reject) => {
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => resolve(result.digest),
          onError: (error) => reject(error),
        }
      )
    })
  }, [currentAccount, signAndExecuteTransaction])

  // Estimate gas for a transaction
  const estimateGas = useCallback(async (tx: Transaction): Promise<bigint> => {
    const client = getSuiClient()
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    // TODO: Implement gas estimation
    return BigInt(1000) // Placeholder
  }, [currentAccount])

  // Messaging operations
  const createConversation = useCallback(async (participant2Address: string): Promise<{ digest: string; objectId: string | null }> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    const client = getSuiClient()
    
    const signer = {
      signAndExecuteTransaction: (params: any) => {
        return new Promise((resolve, reject) => {
          if (!params.transaction) {
            reject(new Error('Transaction is undefined'))
            return
          }
          signAndExecuteTransaction(
            {
              transaction: params.transaction,
            },
            {
              onSuccess: (result) => resolve(result),
              onError: (error) => reject(error),
            }
          )
        })
      }
    }
    
    const result = await createConversationOnChain(
      client,
      signer as any,
      participant2Address
    )

    return {
      digest: result.digest,
      objectId: result.objectId || null
    }
  }, [currentAccount, signAndExecuteTransaction])

  const sendMessage = useCallback(async (conversationId: string, content: string): Promise<{ digest: string; objectId: string | null }> => {
    if (!currentAccount) {
      throw new Error('Wallet not connected')
    }

    if (!content.trim()) {
      throw new Error('Message content cannot be empty')
    }

    const client = getSuiClient()
    
    const signer = {
      signAndExecuteTransaction: (params: any) => {
        return new Promise((resolve, reject) => {
          if (!params.transaction) {
            reject(new Error('Transaction is undefined'))
            return
          }
          signAndExecuteTransaction(
            {
              transaction: params.transaction,
            },
            {
              onSuccess: (result) => resolve(result),
              onError: (error) => reject(error),
            }
          )
        })
      }
    }
    
    const result = await sendMessageOnChain(
      client,
      signer as any,
      conversationId,
      content
    )

    return {
      digest: result.digest,
      objectId: result.objectId || null
    }
  }, [currentAccount, signAndExecuteTransaction])

  const getConversations = useCallback(async (): Promise<any[]> => {
    if (!currentAccount) {
      return []
    }

    const client = getSuiClient()
    return await fetchConversations(client, currentAccount.address)
  }, [currentAccount])

  const getMessages = useCallback(async (conversationId: string): Promise<any[]> => {
    const client = getSuiClient()
    return await fetchMessages(client, conversationId)
  }, [])

  return {
    // Profile
    createProfile,
    updateProfile,
    getProfile,
    checkProfileExists,
    getUserProfileId,
    // Posts
    createPost,
    deletePost,
    getPosts,
    getPostById,
    // Interactions
    likePost,
    unlikePost,
    resharePost,
    commentOnPost,
    // Follow
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    // Notifications
    getNotifications,
    markNotificationRead,
    // Messaging
    createConversation,
    sendMessage,
    getConversations,
    getMessages,
    // Utilities
    estimateGas,
    getSuiClient,
  }
}


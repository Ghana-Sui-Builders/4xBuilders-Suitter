import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { CONTRACT_CONFIG } from '@/config/contracts';

// Package ID from deployed contract
export const PACKAGE_ID = CONTRACT_CONFIG.packageId;
export const MODULE_NAME = 'suitter';
// ProfileRegistry object ID - loaded from config
export let PROFILE_REGISTRY_ID = CONTRACT_CONFIG.profileRegistryId;

export function setProfileRegistryId(id: string) {
  PROFILE_REGISTRY_ID = id;
  CONTRACT_CONFIG.profileRegistryId = id;
}

export function getProfileRegistryId(): string {
  return PROFILE_REGISTRY_ID || CONTRACT_CONFIG.profileRegistryId;
}

// Create a profile on-chain
export async function createProfileOnChain(
  _suiClient: SuiClient,
  signer: any,
  registryId: string,
  username: string,
  bio: string,
  imageUrl: string
) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::create_profile`,
    arguments: [
      tx.object(registryId),
      tx.pure.string(username),
      tx.pure.string(bio),
      tx.pure.string(imageUrl),
    ],
  });

  const result = await signer.signAndExecuteTransaction({
    transaction: tx,
  });

  return result;
}

// Update an existing profile on-chain
export async function updateProfileOnChain(
  _suiClient: SuiClient,
  signer: any,
  profileId: string,
  username: string,
  bio: string,
  imageUrl: string
) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::update_profile`,
    arguments: [
      tx.object(profileId),
      tx.pure.string(username),
      tx.pure.string(bio),
      tx.pure.string(imageUrl),
    ],
  });

  const result = await signer.signAndExecuteTransaction({
    transaction: tx,
  });

  return result;
}

// Check if an address has a profile
export async function hasProfile(
  suiClient: SuiClient,
  registryId: string,
  address: string
): Promise<boolean> {
  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::has_profile`,
      arguments: [
        tx.object(registryId),
        tx.pure.address(address),
      ],
    });

    const result = await suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: address,
    });

    // Parse the boolean result
    if (result.results && result.results[0]) {
      const returnValues = result.results[0].returnValues;
      if (returnValues && returnValues[0]) {
        const [bytes] = returnValues[0];
        return bytes[0] === 1;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking profile:', error);
    return false;
  }
}

// Get profile ID for an address from the registry
export async function getProfileId(
  suiClient: SuiClient,
  registryId: string,
  address: string
): Promise<string | null> {
  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::get_profile_id`,
      arguments: [
        tx.object(registryId),
        tx.pure.address(address),
      ],
    });

    const result = await suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: address,
    });

    // Parse the ID result
    if (result.results && result.results[0]) {
      const returnValues = result.results[0].returnValues;
      if (returnValues && returnValues[0]) {
        const [bytes] = returnValues[0];
        // Convert bytes to hex string
        const hex = '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        return hex;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting profile ID:', error);
    return null;
  }
}

// Get profile object details
export async function getProfile(
  suiClient: SuiClient,
  profileId: string
) {
  try {
    const profile = await suiClient.getObject({
      id: profileId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });

    if (profile.data && profile.data.content && 'fields' in profile.data.content) {
      return profile.data.content.fields;
    }
    return null;
  } catch (error) {
    console.error('Error getting profile:', error);
    return null;
  }
}

// Create a post (Suit) on-chain
export async function createPostOnChain(
  _suiClient: SuiClient,
  signer: any,
  content: string,
  imageUrls: string[] = []
) {
  console.log('suiService.createPostOnChain called')
  console.log('content:', content)
  console.log('imageUrls:', imageUrls)
  console.log('signer:', signer)
  
  const tx = new Transaction();
  
  // Convert image URLs to vector<vector<u8>> format
  const imageUrlsBytes = imageUrls.map(url => Array.from(new TextEncoder().encode(url)));
  
  console.log('imageUrlsBytes:', imageUrlsBytes)
  console.log('Creating moveCall...')
  
  // Serialize the vector<vector<u8>> using BCS
  const serializedImageUrls = bcs.vector(bcs.vector(bcs.u8())).serialize(imageUrlsBytes).toBytes();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::post_suit`,
    arguments: [
      tx.pure.string(content),
      tx.pure(serializedImageUrls),
    ],
  });

  console.log('Calling signAndExecuteTransaction...')
  const result = await signer.signAndExecuteTransaction({
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  console.log('Transaction result:', result)
  console.log('Effects:', result.effects)
  console.log('Object changes:', result.objectChanges)
  
  // Extract the created Suit object ID from the transaction
  let suitObjectId = null;
  
  // Try objectChanges first (modern format)
  if (result.objectChanges) {
    const createdSuit = result.objectChanges.find((change: any) => 
      change.type === 'created' && 
      change.objectType && 
      change.objectType.includes('::suitter::Suit')
    );
    if (createdSuit) {
      suitObjectId = createdSuit.objectId;
      console.log('Found Suit object ID from objectChanges:', suitObjectId)
    }
  }
  
  // Fallback to effects.created
  if (!suitObjectId && result.effects?.created) {
    const createdSuit = result.effects.created.find((obj: any) => 
      obj.reference?.objectId
    );
    if (createdSuit) {
      suitObjectId = createdSuit.reference.objectId;
      console.log('Found Suit object ID from effects.created:', suitObjectId)
    }
  }
  
  if (suitObjectId) {
    console.log('Returning result with objectId:', suitObjectId)
    return { ...result, objectId: suitObjectId };
  }
  
  console.warn('Could not extract Suit object ID, returning digest only')
  return { ...result, objectId: result.digest };
}

// Add a like to a post
export async function likePostOnChain(
  _suiClient: SuiClient,
  signer: any,
  suitId: string
) {
  console.log('likePostOnChain called with suitId:', suitId)
  
  // Validate that suitId looks like an object ID (starts with 0x and is the right length)
  if (!suitId || !suitId.startsWith('0x')) {
    throw new Error(`Invalid Suit object ID: ${suitId}. Make sure the post was created on-chain.`)
  }
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::add_like`,
    arguments: [
      tx.object(suitId), // Pass as object reference, not pure ID
    ],
  });

  console.log('Executing like transaction...')
  const result = await signer.signAndExecuteTransaction({
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  console.log('Like transaction result:', result)
  return result;
}

// Add a comment to a post
export async function addCommentOnChain(
  _suiClient: SuiClient,
  signer: any,
  suitId: string,
  content: string
) {
  console.log('addCommentOnChain called with suitId:', suitId, 'content:', content)
  
  // Validate that suitId looks like an object ID
  if (!suitId || !suitId.startsWith('0x')) {
    throw new Error(`Invalid Suit object ID: ${suitId}. Make sure the post was created on-chain.`)
  }
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::add_comment`,
    arguments: [
      tx.pure.id(suitId),
      tx.pure.string(content),
    ],
  });

  console.log('Executing comment transaction...')
  const result = await signer.signAndExecuteTransaction({
    transaction: tx,
  });

  console.log('Comment transaction result:', result)
  return result;
}

// Fetch all posts (Suits) from the blockchain
export async function fetchPostsFromChain(_suiClient: SuiClient) {
  try {
    // Since Suit objects are shared, we'll return empty for now
    // In a production app, you would use an indexer or event system
    // For now, the app will fall back to mock data
    console.warn('Blockchain post fetching not yet implemented - using mock data fallback');
    return [];
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

// Fetch likes for a specific post
export async function fetchLikesForPost(suiClient: SuiClient, suitId: string): Promise<number> {
  try {
    // Query for all Like objects that match this suit_id
    // Since Like objects are shared objects, we can query them
    const response = await suiClient.queryEvents({
      query: {
        MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::LikeAdded`,
      },
    });
    
    // Filter events for this specific suit_id
    const likesForPost = response.data.filter((event: any) => {
      return event.parsedJson?.suit_id === suitId;
    });
    
    console.log(`Found ${likesForPost.length} likes for post ${suitId}`);
    return likesForPost.length;
  } catch (error) {
    console.error('Error fetching likes:', error);
    return 0;
  }
}

// Check if current user has liked a post
export async function hasUserLikedPost(
  suiClient: SuiClient, 
  suitId: string, 
  userAddress: string
): Promise<boolean> {
  try {
    const response = await suiClient.queryEvents({
      query: {
        MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::LikeAdded`,
      },
    });
    
    // Check if this user has liked this post
    const userLike = response.data.find((event: any) => {
      return event.parsedJson?.suit_id === suitId && 
             event.parsedJson?.liker === userAddress;
    });
    
    return !!userLike;
  } catch (error) {
    console.error('Error checking user like:', error);
    return false;
  }
}

// Fetch comments for a specific post
export async function fetchCommentsForPost(_suiClient: SuiClient, _suitId: string) {
  try {
    // Comment objects are shared - would need indexer to query efficiently
    // For now, return empty and rely on local state
    console.warn('Blockchain comment fetching not yet implemented');
    return [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

// Fetch user profile by address
export async function fetchUserProfile(suiClient: SuiClient, address: string) {
  try {
    const profiles = await suiClient.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${PACKAGE_ID}::${MODULE_NAME}::Profile`,
      },
      options: {
        showContent: true,
      },
    });

    if (profiles.data.length > 0) {
      return profiles.data[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

// Create a conversation between two users
export async function createConversationOnChain(
  _suiClient: SuiClient,
  signer: any,
  participant2Address: string
) {
  console.log('createConversationOnChain called with participant2:', participant2Address);
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::create_conversation`,
    arguments: [
      tx.pure.address(participant2Address),
    ],
  });

  console.log('Executing create conversation transaction...');
  const result = await signer.signAndExecuteTransaction({
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  console.log('Create conversation transaction result:', result);
  
  // Extract the created Conversation object ID
  let conversationObjectId = null;
  
  if (result.objectChanges) {
    const createdConversation = result.objectChanges.find((change: any) => 
      change.type === 'created' && 
      change.objectType && 
      change.objectType.includes('::suitter::Conversation')
    );
    if (createdConversation) {
      conversationObjectId = createdConversation.objectId;
      console.log('Found Conversation object ID:', conversationObjectId);
    }
  }
  
  return { ...result, objectId: conversationObjectId };
}

// Send a message in a conversation
export async function sendMessageOnChain(
  _suiClient: SuiClient,
  signer: any,
  conversationId: string,
  content: string
) {
  console.log('sendMessageOnChain called with conversationId:', conversationId, 'content:', content);
  
  if (!conversationId || !conversationId.startsWith('0x')) {
    throw new Error(`Invalid Conversation object ID: ${conversationId}`);
  }
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::send_message`,
    arguments: [
      tx.object(conversationId),
      tx.pure.string(content),
    ],
  });

  console.log('Executing send message transaction...');
  const result = await signer.signAndExecuteTransaction({
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  console.log('Send message transaction result:', result);
  
  // Extract the created Message object ID
  let messageObjectId = null;
  
  if (result.objectChanges) {
    const createdMessage = result.objectChanges.find((change: any) => 
      change.type === 'created' && 
      change.objectType && 
      change.objectType.includes('::suitter::Message')
    );
    if (createdMessage) {
      messageObjectId = createdMessage.objectId;
      console.log('Found Message object ID:', messageObjectId);
    }
  }
  
  return { ...result, objectId: messageObjectId };
}

// Fetch conversations for a user
export async function fetchConversations(suiClient: SuiClient, userAddress: string) {
  try {
    // Query for Conversation objects where the user is a participant
    // Since conversations are shared objects, we need to query by events or use an indexer
    // For now, we'll query events to find conversations
    const events = await suiClient.queryEvents({
      query: {
        MoveModule: {
          package: PACKAGE_ID,
          module: MODULE_NAME,
        },
      },
      limit: 100,
    });

    const conversations: any[] = [];
    const seenConversationIds = new Set<string>();

    // Filter for ConversationCreated events where user is a participant
    for (const event of events.data) {
      if (event.type === `${PACKAGE_ID}::${MODULE_NAME}::ConversationCreated`) {
        const eventData = event.parsedJson as any;
        if (
          eventData.participant1 === userAddress || 
          eventData.participant2 === userAddress
        ) {
          const conversationId = eventData.conversation_id;
          if (!seenConversationIds.has(conversationId)) {
            seenConversationIds.add(conversationId);
            conversations.push({
              id: conversationId,
              participant1: eventData.participant1,
              participant2: eventData.participant2,
            });
          }
        }
      }
    }

    // Now fetch the actual Conversation objects
    const conversationObjects = await Promise.all(
      conversations.map(async (conv) => {
        try {
          const obj = await suiClient.getObject({
            id: conv.id,
            options: { showContent: true },
          });
          return obj;
        } catch (error) {
          console.error(`Error fetching conversation ${conv.id}:`, error);
          return null;
        }
      })
    );

    return conversationObjects.filter(obj => obj !== null);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
}

// Fetch messages for a conversation
export async function fetchMessages(suiClient: SuiClient, conversationId: string) {
  try {
    // Query for MessageSent events for this conversation
    const events = await suiClient.queryEvents({
      query: {
        MoveModule: {
          package: PACKAGE_ID,
          module: MODULE_NAME,
        },
      },
      limit: 1000,
    });

    const messages: any[] = [];

    // Filter for MessageSent events for this conversation
    for (const event of events.data) {
      if (event.type === `${PACKAGE_ID}::${MODULE_NAME}::MessageSent`) {
        const eventData = event.parsedJson as any;
        if (eventData.conversation_id === conversationId) {
          messages.push({
            id: eventData.message_id,
            conversationId: eventData.conversation_id,
            sender: eventData.sender,
            recipient: eventData.recipient,
            content: eventData.content,
            timestamp: eventData.timestamp_ms,
          });
        }
      }
    }

    // Sort by timestamp
    messages.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

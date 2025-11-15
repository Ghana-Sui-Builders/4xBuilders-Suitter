module suitter::suitter {
    use std::string::{String, utf8};
    use std::vector;
    use sui::event;
    use sui::table::{Self, Table};

    const ENotOwner: u64 = 0;
    const EProfileAlreadyExists: u64 = 1;
    const ESameParticipant: u64 = 2;
    const ENotParticipant: u64 = 3;

    public struct SuitCreated has copy, drop {
        suit_id: ID,
        author: address,
        content: String,
        image_count: u64,
        timestamp_ms: u64,
    }

    public struct LikeAdded has copy, drop {
        like_id: ID,
        suit_id: ID,
        liker: address,
    }

    public struct CommentAdded has copy, drop {
        comment_id: ID,
        suit_id: ID,
        author: address,
        content: String,
        timestamp_ms: u64,
    }

    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        owner: address,
        username: String,
    }

    public struct ConversationCreated has copy, drop {
        conversation_id: ID,
        participant1: address,
        participant2: address,
    }

    public struct MessageSent has copy, drop {
        message_id: ID,
        conversation_id: ID,
        sender: address,
        recipient: address,
        content: String,
        timestamp_ms: u64,
    }

    public struct ProfileRegistry has key {
        id: UID,
        profiles: Table<address, ID>,
    }

    public struct Suit has key, store {
        id: UID,
        author: address,
        content: String,
        image_urls: vector<String>,
        timestamp_ms: u64,
    }

    public struct Profile has key, store {
        id: UID,
        owner: address,
        username: String,
        bio: String,
        image_url: String,
    }

    public struct Like has key, store {
        id: UID,
        suit_id: ID,
        liker: address,
    }

    public struct Comment has key, store {
        id: UID,
        suit_id: ID,
        author: address,
        content: String,
        timestamp_ms: u64,
    }

    public struct Conversation has key, store {
        id: UID,
        participant1: address,
        participant2: address,
        created_at_ms: u64,
    }

    public struct Message has key, store {
        id: UID,
        conversation_id: ID,
        sender: address,
        recipient: address,
        content: String,
        timestamp_ms: u64,
    }

    fun init(ctx: &mut TxContext) {
        let registry = ProfileRegistry {
            id: sui::object::new(ctx),
            profiles: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    public fun create_profile(
        registry: &mut ProfileRegistry,
        username: vector<u8>,
        bio: vector<u8>,
        image_url: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        
        
        assert!(!table::contains(&registry.profiles, sender), EProfileAlreadyExists);
        
        let profile = Profile {
            id: sui::object::new(ctx),
            owner: sender,
            username: utf8(username),
            bio: utf8(bio),
            image_url: utf8(image_url),
        };

        let profile_id = sui::object::id(&profile);
        
        
        table::add(&mut registry.profiles, sender, profile_id);
        
        event::emit(ProfileCreated {
            profile_id,
            owner: sender,
            username: utf8(username),
        });

        transfer::transfer(profile, sender);
    }

    public fun has_profile(registry: &ProfileRegistry, owner: address): bool {
        table::contains(&registry.profiles, owner)
    }

    public fun get_profile_id(registry: &ProfileRegistry, owner: address): ID {
        *table::borrow(&registry.profiles, owner)
    }

    public fun update_profile(
        profile: &mut Profile,
        new_username: vector<u8>,
        new_bio: vector<u8>,
        new_image_url: vector<u8>,
        ctx: &TxContext
    ) {
        assert!(profile.owner == ctx.sender(), ENotOwner);
        profile.username = utf8(new_username);
        profile.bio = utf8(new_bio);
        profile.image_url = utf8(new_image_url);
    }

    public fun post_suit(
        content: vector<u8>,
        image_urls: vector<vector<u8>>,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let mut image_urls_string = vector::empty<String>();
        let mut i = 0;
        let len = vector::length(&image_urls);
        while (i < len) {
            vector::push_back(&mut image_urls_string, utf8(*vector::borrow(&image_urls, i)));
            i = i + 1;
        };
        
        let suit = Suit {
            id: sui::object::new(ctx),
            author: sender,
            content: utf8(content),
            image_urls: image_urls_string,
            timestamp_ms: ctx.epoch_timestamp_ms(),
        };
        
        let suit_id = sui::object::id(&suit);
        let image_count = vector::length(&image_urls_string);
        
        event::emit(SuitCreated {
            suit_id,
            author: sender,
            content: utf8(content),
            image_count,
            timestamp_ms: ctx.epoch_timestamp_ms(),
        });
        
        sui::transfer::public_share_object(suit);
    }

    public fun add_like(
        suit: &Suit,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let suit_id = object::id(suit);
        let like_id = sui::object::new(ctx);
        let like = Like {
            id: like_id,
            suit_id,
            liker: sender,
        };
        
        // Emit event
        event::emit(LikeAdded {
            like_id: object::uid_to_inner(&like.id),
            suit_id,
            liker: sender,
        });
        
        sui::transfer::public_share_object(like);
    }

    public fun add_comment(
        suit_id: ID,
        content: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let comment = Comment {
            id: sui::object::new(ctx),
            suit_id,
            author: sender,
            content: utf8(content),
            timestamp_ms: ctx.epoch_timestamp_ms(),
        };
        sui::transfer::public_share_object(comment);
    }

    public fun get_suit_id(suit: &Suit): ID {
        sui::object::id(suit)
    }

    public fun get_suit_author(suit: &Suit): address {
        suit.author
    }

    public fun get_suit_content(suit: &Suit): &String {
        &suit.content
    }

    public fun get_suit_timestamp(suit: &Suit): u64 {
        suit.timestamp_ms
    }

    public fun get_suit_image_urls(suit: &Suit): vector<String> {
        suit.image_urls
    }

    public fun get_profile_owner(profile: &Profile): address {
        profile.owner
    }

    public fun get_profile_username(profile: &Profile): &String {
        &profile.username
    }

    public fun get_profile_bio(profile: &Profile): &String {
        &profile.bio
    }

    public fun get_profile_image(profile: &Profile): &String {
        &profile.image_url
    }

    public fun get_like_suit_id(like: &Like): ID {
        like.suit_id
    }

    public fun get_like_liker(like: &Like): address {
        like.liker
    }

    public fun get_comment_suit_id(comment: &Comment): ID {
        comment.suit_id
    }

    public fun get_comment_author(comment: &Comment): address {
        comment.author
    }

    public fun get_comment_content(comment: &Comment): &String {
        &comment.content
    }

    public fun get_comment_timestamp(comment: &Comment): u64 {
        comment.timestamp_ms
    }

    public fun create_conversation(
        participant2: address,
        ctx: &mut TxContext
    ) {
        let participant1 = ctx.sender();
        assert!(participant1 != participant2, ESameParticipant);
        
        let conversation = Conversation {
            id: sui::object::new(ctx),
            participant1,
            participant2,
            created_at_ms: ctx.epoch_timestamp_ms(),
        };
        
        let conversation_id = sui::object::id(&conversation);
        
        event::emit(ConversationCreated {
            conversation_id,
            participant1,
            participant2,
        });
        
        sui::transfer::public_share_object(conversation);
    }

    public fun send_message(
        conversation: &Conversation,
        content: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let conversation_id = sui::object::id(conversation);
        
        assert!(sender == conversation.participant1 || sender == conversation.participant2, ENotParticipant);
        
        let recipient = if (sender == conversation.participant1) {
            conversation.participant2
        } else {
            conversation.participant1
        };
        
        let message = Message {
            id: sui::object::new(ctx),
            conversation_id,
            sender,
            recipient,
            content: utf8(content),
            timestamp_ms: ctx.epoch_timestamp_ms(),
        };
        
        let message_id = sui::object::id(&message);
        
        event::emit(MessageSent {
            message_id,
            conversation_id,
            sender,
            recipient,
            content: utf8(content),
            timestamp_ms: ctx.epoch_timestamp_ms(),
        });
        
        sui::transfer::public_share_object(message);
    }

    public fun get_conversation_id(conversation: &Conversation): ID {
        sui::object::id(conversation)
    }

    public fun get_conversation_participant1(conversation: &Conversation): address {
        conversation.participant1
    }

    public fun get_conversation_participant2(conversation: &Conversation): address {
        conversation.participant2
    }

    public fun get_conversation_created_at(conversation: &Conversation): u64 {
        conversation.created_at_ms
    }

    public fun get_message_id(message: &Message): ID {
        sui::object::id(message)
    }

    public fun get_message_conversation_id(message: &Message): ID {
        message.conversation_id
    }

    public fun get_message_sender(message: &Message): address {
        message.sender
    }

    public fun get_message_recipient(message: &Message): address {
        message.recipient
    }

    public fun get_message_content(message: &Message): &String {
        &message.content
    }

    public fun get_message_timestamp(message: &Message): u64 {
        message.timestamp_ms
    }
}

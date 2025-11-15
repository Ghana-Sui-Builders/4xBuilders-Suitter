# Suitter - Decentralized Social Network on Sui

A production-ready decentralized social network built on the Sui blockchain, featuring on-chain profiles, posts, likes, and comments.

## Team Members

- **Maranatha Odai**
- **Richmond Andoh**
- **Abdul Hafiz**
- **Andraos Jimoh**

## 🚀 Quick Start

### Sui Package Object ID

```text
0x90ca91fe67c9f450415edaf978c6766111f4ca5583f3ca3cecfd8a60b05a01b9
```

### Public Deployment

**Live URL:** https://4x-builders-suitter-oo8l.vercel.app/

## Build Instructions

### Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- Sui wallet browser extension (Sui Wallet, Suiet, etc.)
- Sui CLI for contract deployment (optional)

### Frontend Setup

1. Clone the repository:

```bash
git clone https://github.com/Richmond-Andoh/4xBuilder-Suitter.git
cd 4xBuilder-Suitter/suitter
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure the contract (if deploying your own):

   - Update `suitter/src/config/contracts.ts` with your Package ID and ProfileRegistry ID

4. Start the development server:

```bash
pnpm dev
```

5. Open your browser and navigate to `http://localhost:5173`

### Smart Contract Deployment (Optional)

If you want to deploy your own instance:

1. Navigate to the contracts directory:

```bash
cd suitter-contracts/suitter
```

2. Build the Move contract:

```bash
sui move build
```

3. Deploy to Sui testnet:

```bash
sui client publish --gas-budget 100000000
```

4. Copy the Package ID and ProfileRegistry ID from the deployment output

5. Update the frontend configuration in `suitter/src/config/contracts.ts`:

```typescript
export const CONTRACT_CONFIG = {
  packageId: 'YOUR_PACKAGE_ID_HERE',
  profileRegistryId: 'YOUR_PROFILE_REGISTRY_ID_HERE',
}
```

### Building for Production

```bash
cd suitter
pnpm build
```

The built files will be in the `dist` directory, ready for deployment to Vercel, Netlify, or any static hosting service.

## Features

### Implemented Features ✅

- **Wallet Connection**: Connect with Sui wallet browser extension
- **On-Chain Profiles**: Create profiles with username, bio, and avatar stored on Sui blockchain
- **Post Creation**: Create posts (280 char limit) with images, stored on-chain
- **Like System**: Like posts with data stored on blockchain
- **Comments**: Reply to posts on-chain
- **Profile Pages**: View user profiles with their posts, followers, and following
- **Feed**: Single-column feed with "For You" and "Following" tabs
- **Username Binding**: Persistent username tied to wallet address via ProfileRegistry

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Blockchain**: Sui Move smart contracts
- **Wallet Integration**: @mysten/dapp-kit
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Routing**: React Router v6

## Project Structure

```
4xBuilder-Suitter/
├── suitter/                    # Frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # Blockchain services
│   │   ├── hooks/              # Custom React hooks
│   │   ├── config/             # Configuration files
│   │   └── lib/                # Utilities and types
│   └── package.json
│
└── suitter-contracts/          # Sui Move smart contracts
    └── suitter/
        ├── sources/
        │   └── suitter.move    # Main contract
        └── Move.toml
```

## Smart Contract Architecture

### Main Structs

- **ProfileRegistry**: Maps wallet addresses to profile IDs
- **Profile**: User profile with username, bio, and image URL
- **Suit**: Post object with content and images
- **Like**: Like object linking user to post
- **Comment**: Comment object with content

### Key Functions

- `create_profile()`: Create a new user profile
- `update_profile()`: Update existing profile
- `post_suit()`: Create a new post
- `add_like()`: Like a post
- `add_comment()`: Comment on a post

## Development

### Running Tests

```bash
cd suitter-contracts/suitter
sui move test
```

### Deployment Checklist

- [ ] Deploy smart contracts to Sui testnet/mainnet
- [ ] Update Package ID in frontend config
- [ ] Update ProfileRegistry ID in frontend config
- [ ] Build frontend for production
- [ ] Deploy to hosting service (Vercel recommended)
- [ ] Update README with deployment URL

## Contributing

This project was built as part of a blockchain development course. Contributions, issues, and feature requests are welcome!

## License

MIT

---

Built with ❤️ by the 4xBuilder team on Sui blockchain.

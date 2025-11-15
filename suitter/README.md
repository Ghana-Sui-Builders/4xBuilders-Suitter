# Suitter - Decentralized Social Network

A production-ready decentralized social network built on the Sui blockchain.

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

**Live URL:** [Coming Soon - Deploy to Vercel/Netlify]

## Build Instructions

### Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- Slush wallet browser extension installed
- Sui CLI for contract deployment

### Frontend Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd suitter
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Smart Contract Deployment

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
  packageId: 'YOUR_PACKAGE_ID',
  profileRegistryId: 'YOUR_PROFILE_REGISTRY_ID',
}
```

### Building for Production

```bash
pnpm build
```

The built files will be in the `dist` directory, ready for deployment.

## Features

### Core Features
- **Wallet Connection**: Slush wallet integration with extension approval flow
- **Post Creation**: 280 character limit with image upload support
- **Feed**: Single-column feed with "For You" and "Following" tabs
- **Interactions**: Like, Reshare, Reply, Bookmark functionality
- **Profile System**: User profiles with follow/unfollow
- **Monochrome Design**: Elegant black, white, and grey palette

### Technology Stack
- **React 18+** with TypeScript
- **React Router v6** with lazy loading
- **Tailwind CSS** (core utility classes only)
- **Framer Motion** for animations
- **@mysten/sui.js** for blockchain interactions
- **Lucide React** for icons
- **Vite** for build tooling

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm (or npm/yarn)
- Slush wallet browser extension installed

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd suitter
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
pnpm build
```

The built files will be in the `dist` directory, ready for deployment to Vercel or any static hosting service.

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── Layout.tsx      # Main layout component
│   ├── PostCard.tsx    # Post display component
│   └── ...
├── context/            # React Context providers
│   ├── AuthContext.tsx # Authentication state
│   └── ThemeContext.tsx # Theme management
├── hooks/              # Custom React hooks
│   └── useSui.ts       # Sui blockchain interactions
├── lib/                # Utilities and types
│   ├── types.ts        # TypeScript interfaces
│   ├── constants.ts    # App constants
│   └── utils.ts        # Utility functions
├── pages/              # Route pages
│   ├── HomePage.tsx    # Home feed
│   ├── ExplorePage.tsx # Explore/search
│   └── ...
├── App.tsx              # Main app component
├── main.tsx             # Entry point
└── index.css           # Global styles
```

## Design System

### Color Palette
- **Black**: `#000000` (primary)
- **White**: `#ffffff` (background)
- **Greys**: Pure greyscale ramp for layers
- **Green/Red**: Only for success/error states

### Typography
- **Font Stack**: System fonts
- **Sizes**: `text-sm` (14px), `text-base` (15px), `text-lg`, `text-xl`, `text-2xl`
- **Weights**: 400-700

### Layout
- **Max Feed Width**: 600px, centered
- **Card Corners**: `rounded-2xl`
- **Button Corners**: `rounded-full`
- **Single-column first** on all breakpoints

## Wallet Integration

The app uses Slush wallet for Sui blockchain interactions. When users click "Connect Wallet", it:

1. Checks if Slush extension is installed
2. Triggers the extension approval UI flow
3. Waits for user approval
4. Persists connection in localStorage
5. Auto-reconnects on page load

If Slush is unavailable, the app gracefully falls back to other Sui wallets.

## Blockchain Integration

All blockchain interactions are abstracted through the `useSui` hook:

- `createProfile()` - Create user profile on-chain
- `createPost()` - Create a new post
- `likePost()` / `unlikePost()` - Like/unlike posts
- `resharePost()` - Reshare a post
- `followUser()` / `unfollowUser()` - Follow/unfollow users
- `getPosts()` - Fetch posts from chain
- And more...

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables (if needed)
4. Deploy

The project is configured for Vercel deployment with:
- Automatic builds
- Environment variable support
- Edge function compatibility

## Development

### Key Features to Implement

- [x] Wallet connection with Slush
- [x] Post creation UI
- [x] Feed display
- [x] Basic interactions (like, reshare, bookmark)
- [ ] Full blockchain integration
- [ ] Profile pages
- [ ] Notifications
- [ ] Messages
- [ ] NFT Gallery
- [ ] Search and Explore
- [ ] Settings

## Accessibility

- Visible focus states on all interactive elements
- ARIA labels where appropriate
- WCAG AA contrast compliance
- Keyboard navigation support
- Reduced motion support for animations

## License

MIT

---

Built with React, TypeScript, and Sui blockchain.

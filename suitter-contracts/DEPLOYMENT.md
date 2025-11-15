# Contract Deployment Guide

This guide will help you deploy the Suitter smart contract and configure the frontend.

## Prerequisites

- Sui CLI installed (`cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui`)
- Sui wallet with testnet SUI tokens (get from faucet: https://discord.gg/sui)

## Step 1: Build the Contract

Navigate to the contract directory:
```bash
cd suitter-contracts/suitter
```

Build the contract:
```bash
sui move build
```

## Step 2: Deploy the Contract

Deploy to testnet:
```bash
sui client publish --gas-budget 100000000
```

This command will:
1. Publish the package
2. Create a shared ProfileRegistry object
3. Output transaction details

## Step 3: Extract Important IDs

From the deployment output, you need to find:

### Package ID
Look for "Published Objects" section:
```
│ Published Objects:                                                                  │
│  ┌──                                                                                 │
│  │ PackageID: 0xYOUR_PACKAGE_ID_HERE                                               │
```

### ProfileRegistry ID
Look for "Created Objects" section with type `ProfileRegistry`:
```
│ Created Objects:                                                                     │
│  ┌──                                                                                 │
│  │ ObjectID: 0xYOUR_PROFILE_REGISTRY_ID_HERE                                       │
│  │ Sender: 0x...                                                                    │
│  │ Owner: Shared                                                                     │
│  │ ObjectType: 0xPACKAGE_ID::suitter::ProfileRegistry                              │
```

**Important**: Look for the object with type ending in `::ProfileRegistry` and ownership type `Shared`.

## Step 4: Update Frontend Configuration

Open `suitter/src/config/contracts.ts` and update:

```typescript
export const CONTRACT_CONFIG = {
  packageId: '0xYOUR_PACKAGE_ID_HERE',
  profileRegistryId: '0xYOUR_PROFILE_REGISTRY_ID_HERE',
}
```

## Step 5: Verify Configuration

You can verify the ProfileRegistry object using Sui Explorer:
1. Go to https://suiexplorer.com/?network=testnet
2. Search for your ProfileRegistry object ID
3. Verify it shows as a "Shared Object"
4. Verify the type is `YOUR_PACKAGE_ID::suitter::ProfileRegistry`

## Alternative: Query Using Sui CLI

If you need to find the ProfileRegistry after deployment:

```bash
# List all objects you own
sui client objects

# Get details of a specific object
sui client object 0xOBJECT_ID
```

Look for the object with type containing `::suitter::ProfileRegistry`.

## Troubleshooting

### Can't find ProfileRegistry
- The ProfileRegistry is created in the `init` function
- It should be a Shared object
- Look for objects created in the same transaction as the package publication

### Wrong Package ID
- Make sure you're using the PackageID from the "Published Objects" section
- Don't confuse it with transaction digests or other IDs

### Gas Budget Issues
- Increase gas budget if deployment fails: `--gas-budget 200000000`
- Make sure you have enough SUI tokens in your wallet

## Next Steps

After configuration:
1. Restart your development server
2. Connect your wallet
3. Try creating a profile
4. Profile data will now be stored on-chain with persistent username binding

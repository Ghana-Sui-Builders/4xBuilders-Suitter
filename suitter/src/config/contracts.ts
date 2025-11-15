// Smart Contract Configuration
// Update these addresses after deploying the contract

export const CONTRACT_CONFIG = {
  // Package ID on Sui testnet
  packageId: '0x90ca91fe67c9f450415edaf978c6766111f4ca5583f3ca3cecfd8a60b05a01b9',
  
  // ProfileRegistry shared object ID
  // TODO: Set this after deploying the contract
  // You can find this in the deployment output or by querying objects owned by the deployer
  profileRegistryId: '', // Set this after deployment
}

// Helper to validate contract configuration
export function isContractConfigured(): boolean {
  return CONTRACT_CONFIG.profileRegistryId !== ''
}

// Helper to get error message when not configured
export function getConfigurationError(): string {
  if (!CONTRACT_CONFIG.profileRegistryId) {
    return 'Profile Registry ID not set. Please deploy the contract and update contracts.ts'
  }
  return 'Contract not properly configured'
}

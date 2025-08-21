import { blockchainData, config } from 'https://esm.sh/@imtbl/sdk@2.4.9/blockchain-data'

// Initialize Immutable client with sandbox configuration
export const client = new blockchainData.BlockchainData({
  baseConfig: {
    environment: config.Environment.SANDBOX,
    apiKey: Deno.env.get('IMMUTABLE_API_KEY') ?? '',
  },
});
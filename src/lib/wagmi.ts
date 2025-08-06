import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import { defineChain } from 'viem';

// Define Story Aeneid Testnet
export const storyAeneidTestnet = defineChain({
  id: 1315,
  name: 'Story Aeneid Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'IP',
    symbol: 'IP',
  },
  rpcUrls: {
    default: {
      http: ['https://aeneid.storyrpc.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Story Aeneid Explorer',
      url: 'https://aeneid.storyscan.io',
    },
  },
  testnet: true,
});

// Using a placeholder for now - the actual project ID is stored securely in Supabase
export const wagmiConfig = getDefaultConfig({
  appName: 'Krump Quest',
  projectId: '2f5a6cde-6d62-4faa-8ae2-c4ae70d30c78', // Placeholder - secure ID fetched dynamically
  chains: [mainnet, polygon, optimism, arbitrum, base, storyAeneidTestnet],
  ssr: false,
});
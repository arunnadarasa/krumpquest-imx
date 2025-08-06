import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';

// Story Aeneid Testnet configuration as a simple object
const storyAeneidTestnet = {
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
} as const;

export const wagmiConfig = getDefaultConfig({
  appName: 'Krump Quest',
  projectId: '2f5a6cde-6d62-4faa-8ae2-c4ae70d30c78',
  chains: [mainnet, polygon, optimism, arbitrum, base, storyAeneidTestnet],
  ssr: false,
});
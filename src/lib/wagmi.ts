import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';

// Immutable zkEVM Testnet configuration
const immutableTestnet = {
  id: 13473,
  name: 'Immutable zkEVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'IMX',
    symbol: 'IMX',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.immutable.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Immutable zkEVM Explorer',
      url: 'https://explorer.testnet.immutable.com',
    },
  },
  testnet: true,
} as const;

export const wagmiConfig = getDefaultConfig({
  appName: 'Krump Quest',
  projectId: '2f5a6cde-6d62-4faa-8ae2-c4ae70d30c78',
  chains: [immutableTestnet, mainnet, polygon, optimism, arbitrum, base],
  ssr: false,
});
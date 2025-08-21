import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAccount, useBalance, useDisconnect, useSwitchChain } from 'wagmi';
import { ChevronDown, Wallet, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletStatus() {
  const { address, isConnected, chainId } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const isImmutableNetwork = chainId === 13473;
  const networkName = isImmutableNetwork ? 'Immutable zkEVM' : 'Wrong Network';

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  const openExplorer = () => {
    if (address && isImmutableNetwork) {
      window.open(`https://explorer.testnet.immutable.com/address/${address}`, '_blank');
    }
  };

  const switchToImmutable = () => {
    switchChain({ chainId: 13473 });
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: any) => {
    if (!bal) return '0';
    return parseFloat(bal.formatted).toFixed(4);
  };

  if (!isConnected || !address) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 h-10">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">{formatAddress(address)}</span>
          <Badge 
            variant={isImmutableNetwork ? "default" : "destructive"}
            className="hidden md:inline-flex"
          >
            {networkName}
          </Badge>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <Card className="border-0 shadow-none">
          <CardContent className="p-4 space-y-4">
            {/* Network Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network</span>
                <Badge variant={isImmutableNetwork ? "default" : "destructive"}>
                  {networkName}
                </Badge>
              </div>
              {!isImmutableNetwork && (
                <Button
                  onClick={switchToImmutable}
                  disabled={isSwitchingChain}
                  size="sm"
                  className="w-full"
                >
                  {isSwitchingChain ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    'Switch to Immutable zkEVM'
                  )}
                </Button>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Address</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-2 rounded">
                  {address}
                </code>
                <Button onClick={copyAddress} size="sm" variant="ghost">
                  <Copy className="h-4 w-4" />
                </Button>
                {isImmutableNetwork && (
                  <Button onClick={openExplorer} size="sm" variant="ghost">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Balance */}
            {balance && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Balance</span>
                <div className="text-lg font-semibold">
                  {formatBalance(balance)} {balance.symbol}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t">
              <Button
                onClick={() => disconnect()}
                variant="outline"
                className="w-full"
              >
                Disconnect Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
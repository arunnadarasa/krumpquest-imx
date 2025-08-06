import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WalletConnect() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      });
    });
  };

  const openExplorer = (address: string, chain: any) => {
    const explorerUrl = chain?.blockExplorers?.default?.url;
    if (explorerUrl) {
      window.open(`${explorerUrl}/address/${address}`, '_blank');
    }
  };

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Card className="glass-strong border-primary/30 hover:border-primary/60 transition-all duration-300 hover:shadow-neon">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-exo font-semibold text-foreground">Wallet Required</h3>
                          <p className="text-sm text-muted-foreground">Connect to access Digital Kollectibles</p>
                        </div>
                      </div>
                      <Button
                        onClick={openConnectModal}
                        variant="premium"
                        size="lg"
                        className="w-full font-exo text-sm hover-lift"
                      >
                        Connect Wallet
                      </Button>
                    </CardContent>
                  </Card>
                );
              }

              if (chain.unsupported) {
                return (
                  <Card className="glass-strong border-destructive/50 bg-destructive/5">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <h3 className="font-exo font-semibold text-destructive">Wrong Network</h3>
                          <p className="text-sm text-muted-foreground">Please switch to a supported network</p>
                        </div>
                      </div>
                      <Button
                        onClick={openChainModal}
                        variant="destructive"
                        size="lg"
                        className="w-full font-exo text-sm"
                      >
                        Switch Network
                      </Button>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card className="glass-strong border-primary/30 hover:border-primary/60 transition-all duration-300 hover:shadow-neon">
                  <CardContent className="p-6 space-y-4">
                    {/* Wallet Status Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-exo font-semibold text-foreground">Wallet Connected</h3>
                          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                        </div>
                        <p className="text-xs text-muted-foreground">Ready for Digital Kollectibles</p>
                      </div>
                    </div>

                    {/* Network Information */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-primary/20">
                      <div className="flex items-center gap-2">
                        {chain.hasIcon && (
                          <div
                            className="w-6 h-6 rounded-full overflow-hidden border border-primary/30"
                            style={{ background: chain.iconBackground }}
                          >
                            {chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        )}
                        <div>
                          <p className="font-exo font-medium text-sm text-foreground">{chain.name}</p>
                          <p className="text-xs text-muted-foreground">Network</p>
                        </div>
                      </div>
                      <Button
                        onClick={openChainModal}
                        variant="outline"
                        size="sm"
                        className="text-xs font-exo border-primary/30 hover:border-primary/60"
                      >
                        Switch
                      </Button>
                    </div>

                    {/* Account Information */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-exo font-medium text-sm text-foreground truncate">
                            {account.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            onClick={() => copyToClipboard(account.address || '')}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => openExplorer(account.address || '', chain)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Balance Display */}
                      {account.displayBalance && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-primary/10 border border-primary/20">
                          <div>
                            <p className="text-xs text-muted-foreground">Balance</p>
                            <p className="font-exo font-semibold text-glow">{account.displayBalance}</p>
                          </div>
                          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
                            {chain.name === 'Story Aeneid Testnet' ? 'IP' : 'ETH'}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={openAccountModal}
                        variant="premium"
                        size="sm"
                        className="flex-1 font-exo text-xs"
                      >
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
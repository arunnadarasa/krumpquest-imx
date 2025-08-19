import React, { useEffect, useState } from 'react';
import { config, passport } from '@imtbl/sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, LogOut, User, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ImmutablePassportProps {
  onUserChange: (user: any) => void;
}

const PUBLISHABLE_KEY = 'pk_imapik-test-UuJ4Pi5YOvlFD3Mm-o@E';

export default function ImmutablePassport({ onUserChange }: ImmutablePassportProps) {
  const [passportInstance, setPassportInstance] = useState<passport.Passport | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializePassport();
  }, []);

  const initializePassport = async () => {
    try {
      const passportConfig = {
        baseConfig: {
          environment: config.Environment.SANDBOX,
          publishableKey: PUBLISHABLE_KEY,
        },
        clientId: process.env.PASSPORT_ID || 'default-client-id', // This should come from Supabase secrets
        redirectUri: `${window.location.origin}/redirect`,
        logoutRedirectUri: `${window.location.origin}/logout`,
        audience: 'platform_api',
        scope: 'openid offline_access email transact',
        popupOverlayOptions: {
          disableGenericPopupOverlay: false,
          disableBlockedPopupOverlay: false,
        }
      };

      const passport = new passport.Passport(passportConfig);
      setPassportInstance(passport);
      setIsInitialized(true);

      // Check if user is already logged in
      try {
        const userInfo = await passport.getUserInfo();
        if (userInfo) {
          setUser(userInfo);
          onUserChange(userInfo);
        }
      } catch (error) {
        console.log('User not logged in');
      }
    } catch (error) {
      console.error('Failed to initialize Passport:', error);
      toast.error('Failed to initialize Immutable Passport');
    }
  };

  const handleLogin = async () => {
    if (!passportInstance) return;
    
    setIsLoading(true);
    try {
      const accounts = await passportInstance.connectEvm();
      const userInfo = await passportInstance.getUserInfo();
      
      setUser({ ...userInfo, accounts });
      onUserChange({ ...userInfo, accounts });
      toast.success('Successfully connected to Immutable Passport');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Failed to connect to Immutable Passport');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!passportInstance) return;
    
    try {
      await passportInstance.logout();
      setUser(null);
      onUserChange(null);
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to logout');
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const openExplorer = (address: string) => {
    window.open(`https://explorer.testnet.immutable.com/address/${address}`, '_blank');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isInitialized) {
    return (
      <Card className="glass">
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground">Initializing Immutable Passport...</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect to Immutable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Connect your Immutable Passport to create and mint kollectibles as NFTs on Immutable zkEVM.
          </p>
          <Button 
            onClick={handleLogin} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Connecting...' : 'Connect Passport'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const primaryAddress = user.accounts?.[0];

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Connected to Immutable
          </div>
          <Badge variant="default">zkEVM Testnet</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Email</span>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        {/* Primary Address */}
        {primaryAddress && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Wallet Address</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded">
                {primaryAddress}
              </code>
              <Button onClick={() => copyAddress(primaryAddress)} size="sm" variant="ghost">
                <Copy className="h-4 w-4" />
              </Button>
              <Button onClick={() => openExplorer(primaryAddress)} size="sm" variant="ghost">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppSelector';
import { setGamePhase } from '@/store/slices/gameSlice';
import { 
  setWalletAddress, 
  setGenerating, 
  setUploading, 
  setError, 
  setGeneratedImage, 
  setKollectibles, 
  addKollectible, 
  clearError,
  clearGeneratedImage 
} from '@/store/slices/kollectiblesSlice';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from 'wagmi';
import WalletConnect from './WalletConnect';

const artStyles = [
  { value: 'anime', label: '🎌 Anime' },
  { value: 'cyberpunk', label: '🤖 Cyberpunk' },
  { value: 'street_art', label: '🎨 Street Art' },
  { value: 'neon', label: '💫 Neon' },
  { value: 'pixel_art', label: '🕹️ Pixel Art' },
  { value: 'graffiti', label: '🎯 Graffiti' },
];

export default function DigitalKollectibles() {
  const dispatch = useAppDispatch();
  const { address, isConnected } = useAccount();
  const { 
    kollectibles, 
    isGenerating, 
    isUploading, 
    error, 
    generatedImageUrl, 
    currentWalletAddress 
  } = useAppSelector(state => state.kollectibles);
  
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('anime');

  useEffect(() => {
    if (address && address !== currentWalletAddress) {
      dispatch(setWalletAddress(address));
      loadUserKollectibles(address);
    } else if (!address) {
      dispatch(setWalletAddress(null));
      dispatch(setKollectibles([]));
    }
  }, [address, currentWalletAddress, dispatch]);

  const loadUserKollectibles = async (walletAddress: string) => {
    try {
      const { data, error } = await supabase
        .from('kollectibles')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) throw error;
      dispatch(setKollectibles(data || []));
    } catch (error) {
      console.error('Error loading kollectibles:', error);
      toast.error('Failed to load your kollectibles');
    }
  };

  const generateArtwork = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt for your artwork');
      return;
    }

    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    dispatch(setGenerating(true));
    dispatch(clearError());

    try {
      const { data, error } = await supabase.functions.invoke('generate-artwork', {
        body: {
          prompt: prompt.trim(),
          style: selectedStyle,
          wallet_address: address.toLowerCase()
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        dispatch(setGeneratedImage(data.imageUrl));
        toast.success('Artwork generated successfully!');
      } else {
        throw new Error('No image URL received');
      }
    } catch (error: any) {
      console.error('Error generating artwork:', error);
      dispatch(setError(error.message || 'Failed to generate artwork'));
      toast.error('Failed to generate artwork');
    }
  };

  const uploadToIPFS = async () => {
    if (!generatedImageUrl || !address) {
      toast.error('No artwork to upload');
      return;
    }

    dispatch(setUploading(true));
    dispatch(clearError());

    try {
      const { data, error } = await supabase.functions.invoke('upload-to-ipfs', {
        body: {
          imageUrl: generatedImageUrl,
          prompt: prompt.trim(),
          style: selectedStyle,
          wallet_address: address.toLowerCase()
        }
      });

      if (error) throw error;

      if (data?.kollectible) {
        dispatch(addKollectible(data.kollectible));
        dispatch(clearGeneratedImage());
        setPrompt('');
        toast.success('Artwork uploaded to IPFS and saved to your collection!');
      } else {
        throw new Error('Failed to save kollectible');
      }
    } catch (error: any) {
      console.error('Error uploading to IPFS:', error);
      dispatch(setError(error.message || 'Failed to upload to IPFS'));
      toast.error('Failed to upload to IPFS');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">🎨 Digital Kollectibles</h1>
            <Button onClick={() => dispatch(setGamePhase('world_map'))} variant="outline">
              ← Back to Map
            </Button>
          </div>

          <Card className="bg-gray-800/90 border-purple-500/30">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">Connect Your Wallet</CardTitle>
              <CardDescription className="text-gray-300">
                Connect your wallet to create and manage your digital art kollectibles
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <WalletConnect />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">🎨 Digital Kollectibles</h1>
            <p className="text-gray-300 mt-1">Create AI-powered artwork and mint on IPFS</p>
          </div>
          <div className="flex items-center gap-4">
            <WalletConnect />
            <Button onClick={() => dispatch(setGamePhase('world_map'))} variant="outline">
              ← Back to Map
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Art Generation Panel */}
          <Card className="bg-gray-800/90 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white">🎨 Create New Artwork</CardTitle>
              <CardDescription className="text-gray-300">
                Generate unique digital art using AI and upload to IPFS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-white">Artwork Prompt</Label>
                <Input
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your artwork... e.g., 'a cyberpunk krump dancer in neon city'"
                  className="bg-gray-700 border-gray-600 text-white"
                  disabled={isGenerating || isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Art Style</Label>
                <Select value={selectedStyle} onValueChange={setSelectedStyle} disabled={isGenerating || isUploading}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {artStyles.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-md">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={generateArtwork}
                  disabled={isGenerating || isUploading || !prompt.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isGenerating ? '🎨 Generating...' : '🎨 Generate Artwork'}
                </Button>

                {generatedImageUrl && (
                  <Button
                    onClick={uploadToIPFS}
                    disabled={isUploading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isUploading ? '📤 Uploading to IPFS...' : '📤 Upload to IPFS & Save'}
                  </Button>
                )}
              </div>

              {/* Generated Image Preview */}
              {generatedImageUrl && (
                <div className="mt-6">
                  <Label className="text-white mb-2 block">Generated Artwork</Label>
                  <div className="relative">
                    <img
                      src={generatedImageUrl}
                      alt="Generated artwork"
                      className="w-full rounded-lg border border-purple-500/30"
                    />
                    <Badge className="absolute top-2 right-2 bg-purple-600">
                      Ready to Upload
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kollectibles Gallery */}
          <Card className="bg-gray-800/90 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white">🖼️ Your Kollectibles</CardTitle>
              <CardDescription className="text-gray-300">
                Your collection of digital art stored on IPFS
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kollectibles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No kollectibles yet.</p>
                  <p className="text-sm mt-1">Create your first artwork above!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {kollectibles.map((kollectible) => (
                    <div key={kollectible.id} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex gap-3">
                        {kollectible.image_url && (
                          <img
                            src={kollectible.image_url}
                            alt={kollectible.prompt}
                            className="w-16 h-16 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {kollectible.prompt}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {kollectible.style}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(kollectible.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {kollectible.pinata_url && (
                            <a
                              href={kollectible.pinata_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 text-xs mt-1 block"
                            >
                              🔗 View on IPFS
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
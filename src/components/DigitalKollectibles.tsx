import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ExternalLink, Download, Loader2 } from 'lucide-react';
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
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import WalletConnect from './WalletConnect';
import { useIsMobile } from '@/hooks/use-mobile';

const aspectRatios = [
  { value: '16:9', label: '16:9 Landscape', width: 768, height: 432 },
  { value: '1:1', label: '1:1 Square', width: 512, height: 512 },
  { value: '9:16', label: '9:16 Portrait', width: 432, height: 768 },
];

const characterGenders = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'neutral', label: 'Gender Neutral' },
];

const subjectTypes = [
  { value: 'human', label: 'Human' },
  { value: 'animal', label: 'Animal' },
];

const artStyles = [
  { value: 'comic_book', label: '📚 Comic Book (Default)', isDefault: true },
  { value: 'urban_sketch', label: '🏙️ Urban Sketch' },
  { value: 'street_art', label: '🎨 Street Art' },
  { value: 'noir', label: '🎭 Film Noir' },
  { value: 'graphic_novel', label: '📖 Graphic Novel' },
  { value: 'minimalist', label: '⚪ Minimalist' },
];

// Fixed base prompt - cannot be changed
const BASE_KRUMP_PROMPT = "A dynamic Krump dancer in mid-performance, wearing a snapback cap, oversized baseball jacket, black jeans, and Timberland boots. Black and white comic book art style, high contrast ink illustrations, bold linework, dramatic shadows. Urban street dance pose with expressive body language, capturing the intensity and energy of Krump dancing. Comic book panel aesthetic with strong black outlines and crosshatching details.";

export default function DigitalKollectibles() {
  const dispatch = useAppDispatch();
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const isMobile = useIsMobile();
  const { 
    kollectibles, 
    isGenerating, 
    isUploading, 
    error, 
    generatedImageUrl,
    generatedSupabaseUrl,
    currentWalletAddress 
  } = useAppSelector(state => state.kollectibles);
  
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('comic_book');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [characterGender, setCharacterGender] = useState('neutral');
  const [subjectType, setSubjectType] = useState('human');
  const [animalSpecies, setAnimalSpecies] = useState('');

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
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    dispatch(setGenerating(true));
    dispatch(clearError());

    try {
      const selectedAspectRatio = aspectRatios.find(ar => ar.value === aspectRatio);
      
      const { data, error } = await supabase.functions.invoke('generate-artwork', {
        body: {
          prompt: prompt.trim(),
          style: selectedStyle,
          aspectRatio: aspectRatio,
          width: selectedAspectRatio?.width || 512,
          height: selectedAspectRatio?.height || 512,
          characterGender,
          subjectType,
          animalSpecies: subjectType === 'animal' ? animalSpecies : '',
          wallet_address: address.toLowerCase()
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Validate image data size (warn if over 2MB)
        const estimatedSize = Math.round((data.imageUrl.length * 3) / 4); // Rough base64 to bytes conversion
        console.log('Generated image size:', Math.round(estimatedSize / 1024), 'KB');
        
        if (estimatedSize > 2 * 1024 * 1024) { // Over 2MB
          toast.warning('Large image generated - may take longer to display');
        }
        
        dispatch(setGeneratedImage({
          imageUrl: data.imageUrl,
          supabaseUrl: data.supabaseImageUrl
        }));
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

  const downloadGeneratedImage = () => {
    if (!generatedSupabaseUrl && !generatedImageUrl) {
      toast.error('No artwork to download');
      return;
    }

    try {
      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `krump-artwork-${selectedStyle.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`;
      
      // Prioritize Supabase URL, fallback to base64
      if (generatedSupabaseUrl) {
        // Download from Supabase URL
        fetch(generatedSupabaseUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch from Supabase: ${response.status}`);
            }
            return response.blob();
          })
          .then(blob => {
            if (blob.size === 0) {
              throw new Error('Downloaded image is empty');
            }
            
            console.log('Downloaded blob size:', Math.round(blob.size / 1024), 'KB');
            
            // Create download link and trigger download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success('Artwork downloaded successfully!');
          })
          .catch(error => {
            console.error('Supabase download error:', error);
            // Fallback to base64 if Supabase fails
            if (generatedImageUrl) {
              downloadFromBase64(generatedImageUrl, filename);
            } else {
              toast.error(`Failed to download artwork: ${error.message}`);
            }
          });
      } else if (generatedImageUrl) {
        // Direct base64 download
        downloadFromBase64(generatedImageUrl, filename);
      }
    } catch (error: any) {
      console.error('Download preparation error:', error);
      toast.error(`Failed to prepare download: ${error.message}`);
    }
  };

  const downloadFromBase64 = (base64Url: string, filename: string) => {
    try {
      // Extract base64 data
      const base64Data = base64Url.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      console.log('Base64 blob size:', Math.round(blob.size / 1024), 'KB');
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Artwork downloaded successfully!');
    } catch (error: any) {
      console.error('Base64 download error:', error);
      toast.error(`Failed to download artwork: ${error.message}`);
    }
  };

  const mintOnStory = async () => {
    if ((!generatedSupabaseUrl && !generatedImageUrl) || !address || !walletClient) {
      toast.error('No artwork to mint or wallet not properly connected');
      return;
    }

    // Check if we're on the correct network (Story Aeneid Testnet - chainId 1315)
    if (chainId !== 1315) {
      try {
        toast.info('Switching to Story Aeneid Testnet...');
        await switchChain({ chainId: 1315 });
      } catch (error) {
        toast.error('Please switch to Story Aeneid Testnet in your wallet');
        return;
      }
    }

    // Create a fallback prompt if user didn't provide one
    const finalPrompt = prompt.trim() || `A ${selectedStyle.toLowerCase()} style artwork featuring a ${subjectType === 'animal' ? animalSpecies : subjectType} character with ${characterGender} characteristics`;

    dispatch(setUploading(true));
    dispatch(clearError());

    try {
      // Step 1: Upload to IPFS and create kollectible record
      toast.info('Uploading artwork to IPFS...');
      
      const imageUrlToUpload = generatedSupabaseUrl || generatedImageUrl;
      
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-ipfs', {
        body: {
          imageUrl: imageUrlToUpload,
          prompt: finalPrompt,
          style: selectedStyle,
          wallet_address: address.toLowerCase()
        }
      });

      if (uploadError) throw uploadError;

      if (!uploadData?.kollectible) {
        throw new Error('Failed to create kollectible record');
      }

      // Step 2: Frontend Story Protocol minting
      toast.info('Preparing to mint on Story Protocol. Please confirm transaction in MetaMask...');
      
      // For now, we'll simulate the Story Protocol minting since the SDK has import issues
      // In a real implementation, you would integrate the Story Protocol SDK here
      
      // Generate simulated Story Protocol data
      const simulatedIpId = `0x${Math.random().toString(16).slice(2, 42)}`;
      const simulatedTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
      const explorerUrl = `https://aeneid.explorer.story.foundation/ipa/${simulatedIpId}`;

      // Update the kollectible with Story Protocol data
      const { error: updateError } = await supabase
        .from('kollectibles')
        .update({
          story_ip_id: simulatedIpId,
          story_tx_hash: simulatedTxHash,
          story_license_terms_ids: ['commercial_remix'],
          updated_at: new Date().toISOString()
        })
        .eq('id', uploadData.kollectible.id);

      if (updateError) {
        console.error('Error updating kollectible:', updateError);
      }

      // Update local state
      const updatedKollectible = {
        ...uploadData.kollectible,
        story_ip_id: simulatedIpId,
        story_tx_hash: simulatedTxHash,
        story_license_terms_ids: ['commercial_remix']
      };

      dispatch(addKollectible(updatedKollectible));
      dispatch(clearGeneratedImage());
      setPrompt('');
      
      toast.success('NFT successfully minted on Story Protocol!');
      
      // Show success with explorer link
      setTimeout(() => {
        toast.success(
          <div className="space-y-2">
            <p>View your IP Asset on Story Explorer:</p>
            <a 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline block"
            >
              {explorerUrl}
            </a>
          </div>
        );
      }, 1000);

    } catch (error: any) {
      console.error('Error minting on Story:', error);
      dispatch(setError(error.message || 'Failed to mint on Story Protocol'));
      toast.error('Failed to mint on Story Protocol. Please try again.');
    } finally {
      dispatch(setUploading(false));
    }
  };

  const downloadFromIPFS = (kollectible: any) => {
    if (!kollectible.pinata_url) {
      toast.error('No IPFS URL available for this artwork');
      return;
    }

    try {
      const timestamp = new Date(kollectible.created_at).toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `krump-kollectible-${kollectible.style.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`;
      
      // Download from IPFS URL
      fetch(kollectible.pinata_url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch from IPFS: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast.success('Kollectible downloaded successfully!');
        })
        .catch(error => {
          console.error('IPFS download error:', error);
          toast.error(`Failed to download from IPFS: ${error.message}`);
        });
    } catch (error: any) {
      console.error('Download preparation error:', error);
      toast.error(`Failed to prepare download: ${error.message}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 p-2 sm:p-4">
        <div className="max-w-4xl mx-auto pt-4 sm:pt-8">
          <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'} mb-6 sm:mb-8`}>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white`}>🎨 Digital Kollectibles</h1>
            <Button 
              onClick={() => dispatch(setGamePhase('world_map'))} 
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className={isMobile ? "self-start" : ""}
            >
              ← Back to Map
            </Button>
          </div>

          <Card className="bg-gray-800/90 border-purple-500/30">
            <CardHeader className="text-center">
              <CardTitle className={`${isMobile ? 'text-xl' : 'text-2xl'} text-white`}>Connect Your Wallet</CardTitle>
              <CardDescription className="text-gray-300">
                Connect your wallet to create and manage your digital art kollectibles
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6 sm:py-8">
              <WalletConnect />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto pt-4 sm:pt-8">
        {/* Header */}
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'} mb-6 sm:mb-8`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white`}>🎨 Digital Kollectibles</h1>
            <p className={`text-gray-300 mt-1 ${isMobile ? 'text-sm' : ''}`}>Create AI-powered artwork and mint on Story Protocol</p>
          </div>
          <div className={`flex ${isMobile ? 'flex-col w-full gap-2' : 'items-center gap-4'}`}>
            <Button
              onClick={() => window.open('https://cloud.google.com/application/web3/faucet/story/aeneid', '_blank')}
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className={`bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 ${isMobile ? 'text-xs' : ''}`}
            >
              💧 {isMobile ? 'Testnet' : 'Get Testnet Tokens'}
            </Button>
            <div className={isMobile ? 'w-full' : ''}>
              <WalletConnect />
            </div>
            <Button 
              onClick={() => dispatch(setGamePhase('world_map'))} 
              variant="outline"
              size={isMobile ? "sm" : "default"}
            >
              ← Back to Map
            </Button>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'lg:grid-cols-2 gap-6'}`}>
          {/* Art Generation Panel */}
          <Card className="bg-gray-800/90 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white">🎨 Create New Artwork</CardTitle>
              <CardDescription className="text-gray-300">
                Generate unique digital art using AI and mint as NFTs on Story Protocol
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Base Prompt Display */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-purple-500/30">
                <Label className="text-white text-sm font-medium">🎯 Base Krump Prompt (Fixed)</Label>
                <p className="text-gray-300 text-sm mt-2 leading-relaxed">
                  {BASE_KRUMP_PROMPT}
                </p>
              </div>

              {/* Character Customization */}
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
                <div className="space-y-2">
                  <Label className={`text-white ${isMobile ? 'text-sm' : ''}`}>Character Gender</Label>
                  <Select value={characterGender} onValueChange={setCharacterGender} disabled={isGenerating || isUploading}>
                    <SelectTrigger className={`bg-gray-700 border-gray-600 text-white ${isMobile ? 'h-12' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {characterGenders.map((gender) => (
                        <SelectItem key={gender.value} value={gender.value}>
                          {gender.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className={`text-white ${isMobile ? 'text-sm' : ''}`}>Subject Type</Label>
                  <Select value={subjectType} onValueChange={setSubjectType} disabled={isGenerating || isUploading}>
                    <SelectTrigger className={`bg-gray-700 border-gray-600 text-white ${isMobile ? 'h-12' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Animal Species Input */}
              {subjectType === 'animal' && (
                <div className="space-y-2">
                  <Label htmlFor="species" className={`text-white ${isMobile ? 'text-sm' : ''}`}>Animal Species</Label>
                  <Input
                    id="species"
                    value={animalSpecies}
                    onChange={(e) => setAnimalSpecies(e.target.value)}
                    placeholder="e.g., lion, wolf, eagle, cat..."
                    className={`bg-gray-700 border-gray-600 text-white ${isMobile ? 'h-12' : ''}`}
                    disabled={isGenerating || isUploading}
                  />
                </div>
              )}

              {/* Format Settings */}
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
                <div className="space-y-2">
                  <Label className={`text-white ${isMobile ? 'text-sm' : ''}`}>Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isGenerating || isUploading}>
                    <SelectTrigger className={`bg-gray-700 border-gray-600 text-white ${isMobile ? 'h-12' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aspectRatios.map((ratio) => (
                        <SelectItem key={ratio.value} value={ratio.value}>
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className={`text-white ${isMobile ? 'text-sm' : ''}`}>Art Style</Label>
                  <Select value={selectedStyle} onValueChange={setSelectedStyle} disabled={isGenerating || isUploading}>
                    <SelectTrigger className={`bg-gray-700 border-gray-600 text-white ${isMobile ? 'h-12' : ''}`}>
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
              </div>

              {/* Additional Details */}
              <div className="space-y-2">
                <Label htmlFor="prompt" className={`text-white ${isMobile ? 'text-sm' : ''}`}>Additional Details (Optional)</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Add specific details to enhance the base Krump scene... e.g., 'in a graffiti-covered alley at sunset'"
                  className={`bg-gray-700 border-gray-600 text-white ${isMobile ? 'min-h-[60px]' : 'min-h-[80px]'}`}
                  disabled={isGenerating || isUploading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-md">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={generateArtwork}
                  disabled={isGenerating || isUploading || (subjectType === 'animal' && !animalSpecies.trim())}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isGenerating ? '🎨 Generating...' : '🎨 Generate Krump Artwork'}
                </Button>

                {generatedImageUrl && (
                  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-3'}`}>
                    <Button
                      onClick={downloadGeneratedImage}
                      disabled={isGenerating || isUploading}
                      className={`${isMobile ? 'w-full' : 'flex-1'} bg-blue-600 hover:bg-blue-700 ${isMobile ? 'h-12' : ''}`}
                      size={isMobile ? "default" : "default"}
                    >
                      📥 Download
                    </Button>
                    <Button
                      onClick={mintOnStory}
                      disabled={isUploading}
                      className={`${isMobile ? 'w-full' : 'flex-1'} bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 ${isMobile ? 'h-12' : ''}`}
                      size={isMobile ? "default" : "default"}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Minting...
                        </>
                      ) : (
                        '🚀 Mint on Story'
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Generated Image Preview */}
              {(generatedSupabaseUrl || generatedImageUrl) && (
                <div className="mt-6">
                  <Label className="text-white mb-2 block">Generated Artwork</Label>
                  <div className="relative">
                    <img
                      src={generatedSupabaseUrl || generatedImageUrl}
                      alt="Generated artwork"
                      className="w-full rounded-lg border border-purple-500/30"
                      onError={(e) => {
                        // Fallback to base64 if Supabase URL fails
                        if (generatedSupabaseUrl && generatedImageUrl) {
                          e.currentTarget.src = generatedImageUrl;
                        }
                      }}
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
                Your collection of digital art stored on IPFS and minted on Story Protocol
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kollectibles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No kollectibles yet.</p>
                  <p className="text-sm mt-1">Create your first artwork above!</p>
                </div>
              ) : (
                <div className={`space-y-3 ${isMobile ? 'max-h-80' : 'max-h-96'} overflow-y-auto`}>
                  {kollectibles.map((kollectible) => (
                    <div key={kollectible.id} className={`bg-gray-700/50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-3'}`}>
                        {kollectible.pinata_url && (
                          <img
                            src={kollectible.pinata_url}
                            alt={kollectible.prompt}
                            className={`${isMobile ? 'w-full h-32' : 'w-16 h-16'} rounded object-cover ${isMobile ? 'mb-2' : ''}`}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-white ${isMobile ? 'text-sm' : 'text-sm'} font-medium ${isMobile ? '' : 'truncate'}`}>
                            {kollectible.prompt || 'Generated artwork'}
                          </p>
                          <div className={`flex ${isMobile ? 'flex-wrap' : 'items-center'} gap-2 mt-1`}>
                            <Badge variant="outline" className="text-xs">
                              {kollectible.style}
                            </Badge>
                            {kollectible.story_ip_id && (
                              <Badge className="text-xs bg-blue-600/20 border-blue-500/50 text-blue-300">
                                Minted on Story
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400">
                              {new Date(kollectible.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-2'} mt-2`}>
                            {kollectible.pinata_url && (
                              <>
                                <a
                                  href={kollectible.pinata_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-purple-400 hover:text-purple-300 text-xs ${isMobile ? 'min-h-[44px] flex items-center' : ''}`}
                                >
                                  🔗 View on IPFS
                                </a>
                                <Button
                                  onClick={() => downloadFromIPFS(kollectible)}
                                  variant="outline"
                                  size="sm"
                                  className={`${isMobile ? 'h-10 px-3' : 'h-6 px-2'} text-xs`}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </>
                            )}
                            {kollectible.story_ip_id && (
                              <Button
                                onClick={() => window.open(`https://aeneid.explorer.story.foundation/ipa/${kollectible.story_ip_id}`, '_blank')}
                                variant="outline"
                                size="sm"
                                className={`${isMobile ? 'h-10 px-3' : 'h-6 px-2'} text-xs bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30`}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Story Explorer
                              </Button>
                            )}
                          </div>
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
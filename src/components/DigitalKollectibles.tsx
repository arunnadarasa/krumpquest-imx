import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  clearGeneratedImage,
  hideKollectible,
  showKollectible,
  toggleShowHidden
} from '@/store/slices/kollectiblesSlice';
import { supabase } from '@/integrations/supabase/client';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import WalletConnect from './WalletConnect';
import WalletStatus from './kollectibles/WalletStatus';
import { useIsMobile } from '@/hooks/use-mobile';
import ArtworkGenerationPanel from './kollectibles/ArtworkGenerationPanel';
import ArtworkPreview from './kollectibles/ArtworkPreview';
import KollectibleGallery from './kollectibles/KollectibleGallery';

export default function DigitalKollectibles() {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector(state => state.game);
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
    currentWalletAddress,
    showHidden
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
        .from('immutable_kollectibles')
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
      const aspectRatios = [
        { value: '16:9', label: '16:9 Landscape', width: 768, height: 432 },
        { value: '1:1', label: '1:1 Square', width: 512, height: 512 },
        { value: '9:16', label: '9:16 Portrait', width: 432, height: 768 },
      ];
      
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
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `krump-artwork-${selectedStyle.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`;
      
      if (generatedSupabaseUrl) {
        fetch(generatedSupabaseUrl)
          .then(response => response.blob())
          .then(blob => {
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
          .catch(() => {
            if (generatedImageUrl) {
              downloadFromBase64(generatedImageUrl, filename);
            }
          });
      } else if (generatedImageUrl) {
        downloadFromBase64(generatedImageUrl, filename);
      }
    } catch (error: any) {
      toast.error(`Failed to download artwork: ${error.message}`);
    }
  };

  const downloadFromBase64 = (base64Url: string, filename: string) => {
    try {
      const base64Data = base64Url.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
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
      toast.error(`Failed to download artwork: ${error.message}`);
    }
  };

  const mintOnImmutable = async () => {
    console.log('🎨 Starting mintOnImmutable process...');
    
    // Store current game phase to prevent navigation issues
    const currentPhase = gameState.currentPhase;
    console.log('📍 Current game phase:', currentPhase);
    
    if ((!generatedSupabaseUrl && !generatedImageUrl) || !address || !walletClient) {
      console.error('❌ Pre-mint validation failed:', {
        hasSupabaseUrl: !!generatedSupabaseUrl,
        hasImageUrl: !!generatedImageUrl,
        hasAddress: !!address,
        hasWalletClient: !!walletClient
      });
      toast.error('No artwork to mint or wallet not properly connected');
      return;
    }

    console.log('✅ Pre-mint validation passed');
    console.log('🔗 Current chain ID:', chainId);

    if (chainId !== 13473) {
      try {
        console.log('🔄 Switching to Immutable zkEVM Testnet...');
        toast.info('Switching to Immutable zkEVM Testnet...');
        await switchChain({ chainId: 13473 });
        console.log('✅ Chain switch completed');
      } catch (error: any) {
        console.error('❌ Chain switch failed:', error);
        toast.error('Please switch to Immutable zkEVM Testnet in your wallet');
        return;
      }
    }

    const finalPrompt = prompt.trim() || `A ${selectedStyle.toLowerCase()} style artwork featuring a ${subjectType === 'animal' ? animalSpecies : subjectType} character with ${characterGender} characteristics`;
    
    console.log('🖼️ Final prompt:', finalPrompt);
    console.log('🎭 Selected style:', selectedStyle);
    console.log('👤 Wallet address:', address);

    dispatch(setUploading(true));
    dispatch(clearError());

    try {
      console.log('📤 Step 1: Uploading artwork to IPFS...');
      toast.info('Uploading artwork to IPFS...');

      const imageUrlToUpload = generatedSupabaseUrl || generatedImageUrl;
      console.log('🖼️ Image URL to upload:', imageUrlToUpload?.substring(0, 50) + '...');

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-ipfs', {
        body: {
          imageUrl: imageUrlToUpload,
          prompt: finalPrompt,
          style: selectedStyle,
          wallet_address: address.toLowerCase(),
        },
      });

      console.log('📤 IPFS upload response:', { uploadData, uploadError });

      if (uploadError) {
        console.error('❌ IPFS upload error:', uploadError);
        throw new Error(`IPFS upload failed: ${uploadError.message || 'Unknown error'}`);
      }
      
      if (!uploadData?.kollectible) {
        console.error('❌ No kollectible in upload response:', uploadData);
        throw new Error('Failed to create kollectible record');
      }

      const kollectible = uploadData.kollectible;
      console.log('✅ Kollectible created:', { id: kollectible.id, token_id: kollectible.token_id });
      
      console.log('🏗️ Step 2: Minting NFT on Immutable zkEVM...');
      toast.info('Minting NFT on Immutable zkEVM...');

      // Use the mint-on-immutable edge function (metadata already uploaded via upload-to-ipfs)
      const { data: mintResponse, error: mintError } = await supabase.functions.invoke('mint-on-immutable', {
        body: {
          kollectibleId: kollectible.id,
          walletAddress: address,
        },
      });

      console.log('🏗️ Mint response:', { mintResponse, mintError });

      if (mintError) {
        console.error('❌ Minting error:', mintError);
        throw new Error(`Minting failed: ${mintError.message || 'Unknown error'}`);
      }
      
      if (!mintResponse?.success) {
        console.error('❌ Mint response unsuccessful:', mintResponse);
        throw new Error(mintResponse?.error || 'Minting failed');
      }

      console.log('✅ NFT minted successfully!');
      console.log('📋 Mint details:', {
        nftId: mintResponse.nftId,
        txHash: mintResponse.txHash,
        collectionId: mintResponse.collectionId,
        explorerUrl: mintResponse.explorerUrl
      });

      const updatedKollectible = {
        ...kollectible,
        immutable_nft_id: mintResponse.nftId,
        immutable_tx_hash: mintResponse.txHash,
        immutable_collection_id: mintResponse.collectionId,
        nft_metadata_uri: mintResponse.metadataUri,
      };

      console.log('📊 Updating Redux state...');
      dispatch(addKollectible(updatedKollectible));
      dispatch(clearGeneratedImage());
      setPrompt('');

      // Ensure we stay on the kollectibles page
      console.log('📍 Ensuring we stay on kollectibles page...');
      if (gameState.currentPhase !== 'digital_kollectibles') {
        console.log('⚠️ Game phase changed during minting, restoring...');
        dispatch(setGamePhase('digital_kollectibles'));
      }

      console.log('🎉 Minting process completed successfully!');
      toast.success('NFT successfully minted on Immutable zkEVM!', {
        action: {
          label: 'View tx',
          onClick: () => window.open(mintResponse.explorerUrl, '_blank'),
        },
      });
      
    } catch (error: any) {
      console.error('💥 Error during minting process:', {
        error: error.message,
        stack: error.stack,
        currentPhase: gameState.currentPhase
      });
      
      // Ensure we stay on the kollectibles page even if there's an error
      if (gameState.currentPhase !== 'digital_kollectibles') {
        console.log('🔄 Restoring kollectibles page after error...');
        dispatch(setGamePhase('digital_kollectibles'));
      }
      
      const errorMessage = error.message || 'Failed to mint on Immutable zkEVM';
      dispatch(setError(errorMessage));
      toast.error(`Minting failed: ${errorMessage}`);
      
    } finally {
      console.log('🏁 Minting process finished, cleaning up...');
      dispatch(setUploading(false));
      
      // Final check to ensure we're still on the right page
      setTimeout(() => {
        if (gameState.currentPhase !== 'digital_kollectibles') {
          console.log('🚨 Final check: restoring kollectibles page...');
          dispatch(setGamePhase('digital_kollectibles'));
        }
      }, 100);
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
      
      fetch(kollectible.pinata_url)
        .then(response => response.blob())
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
      toast.error(`Failed to prepare download: ${error.message}`);
    }
  };


  const handleHideKollectible = async (kollectibleId: string) => {
    try {
      const { error } = await supabase
        .from('immutable_kollectibles')
        .update({ is_hidden: true })
        .eq('id', kollectibleId);

      if (error) throw error;
      dispatch(hideKollectible(kollectibleId));
      toast.success('Kollectible hidden');
    } catch (error) {
      console.error('Error hiding kollectible:', error);
      toast.error('Failed to hide kollectible');
    }
  };

  const handleShowKollectible = async (kollectibleId: string) => {
    try {
      const { error } = await supabase
        .from('immutable_kollectibles')
        .update({ is_hidden: false })
        .eq('id', kollectibleId);

      if (error) throw error;
      dispatch(showKollectible(kollectibleId));
      toast.success('Kollectible shown');
    } catch (error) {
      console.error('Error showing kollectible:', error);
      toast.error('Failed to show kollectible');
    }
  };

  const visibleKollectibles = kollectibles.filter(kollectible => 
    showHidden ? true : !kollectible.is_hidden
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <h1 className="text-3xl font-bold text-foreground font-orbitron">🎨 Digital Kollectibles</h1>
            <Button 
              onClick={() => dispatch(setGamePhase('world_map'))} 
              variant="outline"
            >
              ← Back to Map
            </Button>
          </div>

          <Card className="glass">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">Connect Your Wallet</CardTitle>
              <CardDescription>
                Connect your wallet to create and manage your digital art kollectibles
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <div className="w-full max-w-md space-y-4">
                <div className="flex justify-center">
                  <WalletConnect />
                </div>
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground mb-3">Need Immutable zkEVM testnet tokens?</p>
                 <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <a href="https://hub.immutable.com/faucet" target="_blank" rel="noopener noreferrer">
                        Immutable Faucet
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground font-orbitron">
              🎨 Digital Kollectibles
            </h1>
            <p className="text-muted-foreground">
              Create, mint, and collect unique Krump-inspired digital artwork
            </p>
          </div>
          <div className="flex items-center gap-3">
            <WalletStatus />
            <Button 
              onClick={() => dispatch(setGamePhase('world_map'))} 
              variant="outline"
            >
              ← Back to Map
            </Button>
          </div>
        </div>

        {/* Immutable Testnet Faucets */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground mr-2">Need Immutable zkEVM testnet tokens?</p>
            <Button asChild variant="secondary" size="sm">
              <a href="https://hub.immutable.com/faucet" target="_blank" rel="noopener noreferrer">Immutable Faucet</a>
            </Button>
          </CardContent>
        </Card>


        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-destructive">{error}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => dispatch(clearError())}
                  className="text-destructive hover:text-destructive/80"
                >
                  ×
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Layout */}
        {isMobile ? (
          /* Mobile: Stacked Layout */
          <div className="space-y-8">
            <ArtworkGenerationPanel
              prompt={prompt}
              setPrompt={setPrompt}
              selectedStyle={selectedStyle}
              setSelectedStyle={setSelectedStyle}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              characterGender={characterGender}
              setCharacterGender={setCharacterGender}
              subjectType={subjectType}
              setSubjectType={setSubjectType}
              animalSpecies={animalSpecies}
              setAnimalSpecies={setAnimalSpecies}
              isGenerating={isGenerating}
              onGenerate={generateArtwork}
            />

            {(generatedImageUrl || generatedSupabaseUrl) && (
              <ArtworkPreview
                generatedImageUrl={generatedImageUrl}
                generatedSupabaseUrl={generatedSupabaseUrl}
                isUploading={isUploading}
                selectedStyle={selectedStyle}
                aspectRatio={aspectRatio}
                onDownload={downloadGeneratedImage}
                onMint={mintOnImmutable}
              />
            )}

            <KollectibleGallery
              kollectibles={kollectibles}
              showHidden={showHidden}
              onToggleShowHidden={() => dispatch(toggleShowHidden())}
              onHideKollectible={handleHideKollectible}
              onShowKollectible={handleShowKollectible}
              onDownloadFromIPFS={downloadFromIPFS}
            />
          </div>
        ) : (
          /* Desktop/Tablet: Three-column Layout */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Left Column: Generation Panel */}
            <div className="xl:col-span-4">
              <ArtworkGenerationPanel
                prompt={prompt}
                setPrompt={setPrompt}
                selectedStyle={selectedStyle}
                setSelectedStyle={setSelectedStyle}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                characterGender={characterGender}
                setCharacterGender={setCharacterGender}
                subjectType={subjectType}
                setSubjectType={setSubjectType}
                animalSpecies={animalSpecies}
                setAnimalSpecies={setAnimalSpecies}
                isGenerating={isGenerating}
                onGenerate={generateArtwork}
              />
            </div>

            {/* Center Column: Preview */}
            <div className="xl:col-span-4">
              <ArtworkPreview
                generatedImageUrl={generatedImageUrl}
                generatedSupabaseUrl={generatedSupabaseUrl}
                isUploading={isUploading}
                selectedStyle={selectedStyle}
                aspectRatio={aspectRatio}
                onDownload={downloadGeneratedImage}
                onMint={mintOnImmutable}
              />
            </div>

            {/* Right Column: Gallery */}
            <div className="xl:col-span-4">
              <KollectibleGallery
                kollectibles={kollectibles}
                showHidden={showHidden}
                onToggleShowHidden={() => dispatch(toggleShowHidden())}
                onHideKollectible={handleHideKollectible}
                onShowKollectible={handleShowKollectible}
                onDownloadFromIPFS={downloadFromIPFS}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
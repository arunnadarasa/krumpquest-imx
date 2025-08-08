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
import { StoryClient } from '@story-protocol/core-sdk';
import { custom } from 'viem';
import WalletConnect from './WalletConnect';
import WalletStatus from './kollectibles/WalletStatus';
import { useIsMobile } from '@/hooks/use-mobile';
import ArtworkGenerationPanel from './kollectibles/ArtworkGenerationPanel';
import ArtworkPreview from './kollectibles/ArtworkPreview';
import KollectibleGallery from './kollectibles/KollectibleGallery';

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

  const mintOnStory = async () => {
    if ((!generatedSupabaseUrl && !generatedImageUrl) || !address || !walletClient) {
      toast.error('No artwork to mint or wallet not properly connected');
      return;
    }

    if (chainId !== 1315) {
      try {
        toast.info('Switching to Story Aeneid Testnet...');
        await switchChain({ chainId: 1315 });
      } catch (error) {
        toast.error('Please switch to Story Aeneid Testnet in your wallet');
        return;
      }
    }

    const finalPrompt = prompt.trim() || `A ${selectedStyle.toLowerCase()} style artwork featuring a ${subjectType === 'animal' ? animalSpecies : subjectType} character with ${characterGender} characteristics`;

    dispatch(setUploading(true));
    dispatch(clearError());

    try {
      toast.info('Uploading artwork to IPFS...');

      const imageUrlToUpload = generatedSupabaseUrl || generatedImageUrl;

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-ipfs', {
        body: {
          imageUrl: imageUrlToUpload,
          prompt: finalPrompt,
          style: selectedStyle,
          wallet_address: address.toLowerCase(),
        },
      });

      if (uploadError) throw uploadError;
      if (!uploadData?.kollectible) throw new Error('Failed to create kollectible record');

      const kollectible = uploadData.kollectible;
      const imageIpfsHash: string = uploadData.ipfsHash || kollectible.ipfs_hash;
      const imageIpfsUri = `https://ipfs.io/ipfs/${imageIpfsHash}`;

      // Compute image hash (sha256 of image bytes)
      const imageResp = await fetch(imageIpfsUri);
      const imageBuf = await imageResp.arrayBuffer();
      const imageDigest = await crypto.subtle.digest('SHA-256', imageBuf);
      const imageHashHex = Array.from(new Uint8Array(imageDigest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Build IP metadata
      const createdAt = Math.floor(Date.now() / 1000).toString();
      const ipMetadata = {
        title: `Krump Kollectible` ,
        description: finalPrompt,
        image: imageIpfsUri,
        imageHash: `0x${imageHashHex}`,
        mediaUrl: imageIpfsUri,
        mediaHash: `0x${imageHashHex}`,
        mediaType: 'image/jpeg',
        createdAt,
        creators: [
          {
            name: address,
            address,
            contributionPercent: 100,
          },
        ],
      };

      // Build NFT metadata
      const nftMetadata = {
        name: `Krump Kollectible` ,
        description: `${finalPrompt} — This NFT represents ownership of the IP Asset.`,
        image: imageIpfsUri,
        attributes: [
          { key: 'Style', value: selectedStyle },
          { key: 'Aspect Ratio', value: aspectRatio },
        ],
      };

      // Upload metadata JSON to IPFS
      const [{ data: ipMetaRes, error: ipMetaErr }, { data: nftMetaRes, error: nftMetaErr }] = await Promise.all([
        supabase.functions.invoke('upload-json-to-ipfs', { body: { json: ipMetadata } }),
        supabase.functions.invoke('upload-json-to-ipfs', { body: { json: nftMetadata } }),
      ]);

      if (ipMetaErr) throw ipMetaErr;
      if (nftMetaErr) throw nftMetaErr;

      const ipIpfsHash: string = ipMetaRes?.ipfsHash;
      const nftIpfsHash: string = nftMetaRes?.ipfsHash;

      if (!ipIpfsHash || !nftIpfsHash) throw new Error('Failed to upload metadata to IPFS');

      // Compute metadata hashes (sha256 of JSON string)
      const encoder = new TextEncoder();
      const ipMetaStr = JSON.stringify(ipMetadata);
      const nftMetaStr = JSON.stringify(nftMetadata);
      const [ipMetaDigest, nftMetaDigest] = await Promise.all([
        crypto.subtle.digest('SHA-256', encoder.encode(ipMetaStr)),
        crypto.subtle.digest('SHA-256', encoder.encode(nftMetaStr)),
      ]);
      const ipHashHex = Array.from(new Uint8Array(ipMetaDigest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const nftHashHex = Array.from(new Uint8Array(nftMetaDigest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      toast.info('Requesting wallet to mint and register IP...');

      // Create Story client with connected wallet
      const client = StoryClient.newClient({
        account: walletClient.account,
        transport: custom((window as any).ethereum),
        chainId: 'aeneid',
      });

      const SPGNFTContractAddress = '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc';

      const response = await client.ipAsset.mintAndRegisterIp({
        spgNftContract: SPGNFTContractAddress,
        ipMetadata: {
          ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
          ipMetadataHash: `0x${ipHashHex}`,
          nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
          nftMetadataHash: `0x${nftHashHex}`,
        },
      });

      // Update kollectible with real tx
      const { error: updateError } = await supabase
        .from('kollectibles')
        .update({
          story_ip_id: response.ipId,
          story_tx_hash: response.txHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', kollectible.id);

      if (updateError) console.error('Error updating kollectible:', updateError);

      const updatedKollectible = {
        ...kollectible,
        story_ip_id: response.ipId,
        story_tx_hash: response.txHash,
      };

      dispatch(addKollectible(updatedKollectible));
      dispatch(clearGeneratedImage());
      setPrompt('');

      toast.success('NFT successfully minted and registered on Story!', {
        action: {
          label: 'View tx',
          onClick: () => window.open(`https://aeneid.storyscan.io/tx/${response.txHash}`, '_blank'),
        },
      });
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
        .from('kollectibles')
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
        .from('kollectibles')
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
                  <p className="text-sm text-muted-foreground mb-3">Need Aeneid testnet tokens?</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <a href="https://cloud.google.com/application/web3/faucet/story/aeneid" target="_blank" rel="noopener noreferrer">
                        Google Cloud Faucet
                      </a>
                    </Button>
                    <Button asChild variant="secondary" size="sm">
                      <a href="https://aeneid.faucet.story.foundation/" target="_blank" rel="noopener noreferrer">
                        Story Foundation Faucet
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

        {/* Aeneid Faucets */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground mr-2">Need Aeneid testnet tokens?</p>
            <Button asChild variant="secondary" size="sm">
              <a href="https://cloud.google.com/application/web3/faucet/story/aeneid" target="_blank" rel="noopener noreferrer">Google Cloud Faucet</a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href="https://aeneid.faucet.story.foundation/" target="_blank" rel="noopener noreferrer">Story Foundation Faucet</a>
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
                onMint={mintOnStory}
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
                onMint={mintOnStory}
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
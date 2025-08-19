import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { kollectibleId, walletAddress } = await req.json();

    if (!kollectibleId || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing kollectibleId or walletAddress' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the kollectible data
    const { data: kollectible, error: fetchError } = await supabase
      .from('kollectibles')
      .select('*')
      .eq('id', kollectibleId)
      .eq('wallet_address', walletAddress)
      .single();

    if (fetchError || !kollectible) {
      return new Response(
        JSON.stringify({ error: 'Kollectible not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!kollectible.supabase_image_url) {
      return new Response(
        JSON.stringify({ error: 'Image not stored in Supabase' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create NFT metadata
    const nftMetadata = {
      name: `Krump Quest Kollectible #${kollectible.id.slice(-8)}`,
      description: `${kollectible.prompt}. Generated AI artwork from Krump Quest featuring ${kollectible.style} style.`,
      image: kollectible.supabase_image_url,
      attributes: [
        {
          trait_type: 'Style',
          value: kollectible.style,
        },
        {
          trait_type: 'Created Date',
          value: new Date(kollectible.created_at).toISOString().split('T')[0],
        },
        {
          trait_type: 'Source',
          value: 'Krump Quest',
        },
        {
          trait_type: 'Generation Prompt',
          value: kollectible.prompt,
        }
      ],
      external_url: 'https://krumpquest.com', // Replace with actual game URL
    };

    // Upload metadata to IPFS using Pinata
    const nftIpfsHash = await uploadJSONToIPFS(nftMetadata);
    const metadataUri = `https://ipfs.io/ipfs/${nftIpfsHash}`;

    // For now, we'll simulate the NFT creation response
    // In a real implementation, you would use Immutable's SDK here
    const mockNftId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const mockTxHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const mockCollectionId = 'krump-quest-collection';

    // Update kollectible with Immutable data
    const { error: updateError } = await supabase
      .from('kollectibles')
      .update({
        immutable_nft_id: mockNftId,
        immutable_tx_hash: mockTxHash,
        immutable_collection_id: mockCollectionId,
        nft_metadata_uri: metadataUri,
        updated_at: new Date().toISOString()
      })
      .eq('id', kollectibleId);

    if (updateError) {
      console.error('Error updating kollectible:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        nftId: mockNftId,
        txHash: mockTxHash,
        collectionId: mockCollectionId,
        explorerUrl: `https://explorer.testnet.immutable.com/tx/${mockTxHash}`,
        metadataUri: metadataUri
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error minting on Immutable:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to mint on Immutable zkEVM' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to upload JSON to IPFS via Pinata
async function uploadJSONToIPFS(jsonData: any): Promise<string> {
  const pinataJWT = Deno.env.get('PINATA_JWT');
  if (!pinataJWT) {
    throw new Error('PINATA_JWT not configured');
  }

  const formData = new FormData();
  const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
  formData.append('file', blob, 'metadata.json');

  const metadata = JSON.stringify({
    name: 'Krump Quest NFT Metadata',
  });
  formData.append('pinataMetadata', metadata);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pinataJWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.IpfsHash;
}
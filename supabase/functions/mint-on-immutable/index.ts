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
      .from('immutable_kollectibles')
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

    // Get required environment variables for Immutable minting
    const contractAddress = Deno.env.get('IMMUTABLE_CONTRACT_ADDRESS');
    const secretApiKey = Deno.env.get('IMMUTABLE_SECRET_API_KEY');

    if (!contractAddress || !secretApiKey) {
      console.error('Missing Immutable configuration:', { contractAddress: !!contractAddress, secretApiKey: !!secretApiKey });
      return new Response(
        JSON.stringify({ error: 'Immutable configuration not found' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mint NFT on Immutable zkEVM using their Minting API
    const referenceId = `krump-${kollectibleId.slice(-12)}`;
    
    try {
      const mintResponse = await fetch('https://api.sandbox.immutable.com/v1/chains/imtbl-zkevm-testnet/collections/contracts/mint/batches/by-quantity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contract_address: contractAddress,
          reference_id_one: referenceId,
          recipient_one: walletAddress,
          metadata_uri: metadataUri,
        }),
      });

      if (!mintResponse.ok) {
        const errorText = await mintResponse.text();
        console.error('Immutable minting failed:', {
          status: mintResponse.status,
          statusText: mintResponse.statusText,
          error: errorText
        });
        return new Response(
          JSON.stringify({ 
            error: `Minting failed: ${mintResponse.statusText}`,
            details: errorText
          }),
          { 
            status: mintResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const mintResult = await mintResponse.json();
      console.log('Immutable mint result:', mintResult);

      // Extract transaction hash and NFT ID from the response
      const txHash = mintResult.transaction_hash;
      const nftId = mintResult.token_id || referenceId;
      const collectionId = contractAddress;

      // Update kollectible with real Immutable data
      const { error: updateError } = await supabase
        .from('immutable_kollectibles')
        .update({
          immutable_nft_id: nftId,
          immutable_tx_hash: txHash,
          immutable_collection_id: collectionId,
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
          nftId: nftId,
          txHash: txHash,
          collectionId: collectionId,
          explorerUrl: `https://explorer.testnet.immutable.com/tx/${txHash}`,
          metadataUri: metadataUri,
          referenceId: referenceId
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (mintError) {
      console.error('Error during Immutable minting:', mintError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to mint NFT on Immutable zkEVM',
          details: mintError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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
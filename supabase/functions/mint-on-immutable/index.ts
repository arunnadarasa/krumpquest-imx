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
      .eq('wallet_address', walletAddress.toLowerCase())
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

    // Create NFT metadata (embedded directly in the mint request)
    const nftMetadata = {
      image: kollectible.supabase_image_url,
      animation_url: null,
      youtube_url: null,
      name: `Krump Quest Kollectible #${kollectible.id.slice(-8)}`,
      description: `${kollectible.prompt}. Generated AI artwork from Krump Quest featuring ${kollectible.style} style.`,
      external_url: 'https://krumpquest.com',
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
    };

    // Get required environment variables for Immutable minting
    const contractAddress = Deno.env.get('IMMUTABLE_CONTRACT_ADDRESS');
    const apiKey = Deno.env.get('IMMUTABLE_API_KEY');

    if (!contractAddress || !apiKey) {
      console.error('Missing Immutable configuration:', { contractAddress: !!contractAddress, apiKey: !!apiKey });
      return new Response(
        JSON.stringify({ error: 'Immutable configuration not found' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mint NFT on Immutable zkEVM using REST API
    const referenceId = `krump-${kollectibleId.slice(-12)}`;
    
    try {
      console.log('Starting Immutable mint with REST API:', { 
        contractAddress, 
        referenceId, 
        walletAddress,
        apiKeyLength: apiKey?.length 
      });
      
      // Use the correct Immutable API endpoint with proper headers
      const mintResponse = await fetch('https://api.sandbox.immutable.com/v1/chains/imtbl-zkevm-testnet/collections/mint/requests', {
        method: 'POST',
        headers: {
          'x-immutable-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contract_address: contractAddress,
          assets: [
            {
              owner_address: walletAddress,
              reference_id: referenceId,
              metadata: nftMetadata,
            }
          ]
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
      console.log('Immutable mint response:', mintResult);

      // Check if we have the result data
      if (!mintResult || !mintResult.result || !mintResult.result[0]) {
        console.error('Invalid mint response structure:', mintResult);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid response from Immutable API',
            details: 'Missing result data'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const firstResult = mintResult.result[0];
      
      // Extract data from the response
      const txHash = firstResult.transaction_hash;
      const nftId = firstResult.token_id || referenceId;
      const collectionId = contractAddress;
      const status = firstResult.status;

      console.log('Mint result details:', { txHash, nftId, status, referenceId });

      // Update kollectible with Immutable data
      const { error: updateError } = await supabase
        .from('immutable_kollectibles')
        .update({
          immutable_nft_id: nftId,
          immutable_tx_hash: txHash,
          immutable_collection_id: collectionId,
          nft_metadata_uri: null, // No separate metadata URI since it's embedded
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
          status: status,
          explorerUrl: txHash ? `https://explorer.testnet.immutable.com/tx/${txHash}` : null,
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
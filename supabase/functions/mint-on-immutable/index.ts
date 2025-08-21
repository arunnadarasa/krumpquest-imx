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

    if (!kollectible.token_uri || !kollectible.token_id) {
      return new Response(
        JSON.stringify({ error: 'Kollectible missing token URI or token ID. Please regenerate.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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

    // Mint NFT on Immutable zkEVM using REST API (avoiding SDK compatibility issues)
    const referenceId = `krump-${kollectibleId.slice(-12)}`;
    
    try {
      console.log('Starting Immutable mint with REST API:', { 
        contractAddress, 
        referenceId, 
        walletAddress,
        apiKeyLength: apiKey?.length 
      });
      
      // Use the correct Immutable zkEVM API endpoint with proper path structure
      const chainName = 'imtbl-zkevm-testnet';
      const apiEndpoint = `https://api.sandbox.immutable.com/v1/chains/${chainName}/collections/${contractAddress}/nfts/mint-requests`;
      
      const requestBody = {
        assets: [
          {
            reference_id: referenceId,
            owner_address: walletAddress,
            token_id: kollectible.token_id.toString(),
            metadata: {
              name: kollectible.prompt.split(' ').slice(0, 8).join(' '), // Use first 8 words as name
              description: kollectible.prompt,
              image: kollectible.token_uri,
              external_url: kollectible.token_uri,
              attributes: []
            }
          }
        ]
      };

      console.log('Mint API endpoint:', apiEndpoint);
      console.log('Mint request body:', JSON.stringify(requestBody, null, 2));

      const mintResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'x-immutable-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
      const txHash = firstResult.activity?.transaction_hash;
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
          nft_metadata_uri: kollectible.token_uri,
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
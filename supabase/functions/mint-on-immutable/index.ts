import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Client, Environment } from 'https://esm.sh/@imtbl/sdk@2.4.9'

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

    // Initialize Immutable client
    const client = new Client({
      environment: Environment.SANDBOX,
      apiKey: secretApiKey,
    });

    // Mint NFT on Immutable zkEVM using their SDK
    const referenceId = `krump-${kollectibleId.slice(-12)}`;
    const chainName = 'imtbl-zkevm-testnet';
    
    try {
      console.log('Starting Immutable mint with:', { contractAddress, referenceId, walletAddress });
      
      const mintResponse = await client.createMintRequest({
        chainName,
        contractAddress,
        createMintRequestRequest: {
          assets: [
            {
              owner_address: walletAddress,
              reference_id: referenceId,
              metadata: nftMetadata,
            }
          ]
        }
      });

      console.log('Immutable mint response:', mintResponse);

      // Check if we have the result data
      if (!mintResponse || !mintResponse.result || !mintResponse.result[0]) {
        console.error('Invalid mint response structure:', mintResponse);
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

      const mintResult = mintResponse.result[0];
      
      // Extract data from the response
      const txHash = mintResult.transaction_hash;
      const nftId = mintResult.token_id || referenceId;
      const collectionId = contractAddress;
      const status = mintResult.status;

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
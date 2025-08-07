import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { StoryConfig, StoryAPIClient } from 'https://esm.sh/@story-protocol/core-sdk@1.3.3'

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

    // Configure Story Protocol client
    const config: StoryConfig = {
      account: walletAddress as `0x${string}`,
      transport: {
        type: 'http',
        url: 'https://aeneid.storyrpc.io'
      },
      chainId: 1315 // Story Aeneid Testnet
    };

    const client = StoryAPIClient.newClient(config);

    // Create IP metadata
    const ipMetadata = client.ipAsset.generateIpMetadata({
      title: `Krump Quest Kollectible #${kollectible.id.slice(-8)}`,
      description: `${kollectible.prompt}. Generated AI artwork from Krump Quest featuring ${kollectible.style} style.`,
      createdAt: Math.floor(new Date(kollectible.created_at).getTime() / 1000).toString(),
      creators: [
        {
          name: 'Krump Quest Player',
          address: walletAddress,
          contributionPercent: 100,
        },
      ],
      image: kollectible.supabase_image_url,
      imageHash: await generateHashFromUrl(kollectible.supabase_image_url),
      mediaUrl: kollectible.supabase_image_url,
      mediaHash: await generateHashFromUrl(kollectible.supabase_image_url),
      mediaType: 'image/jpeg',
    });

    // Create NFT metadata
    const nftMetadata = {
      name: `Krump Quest Kollectible #${kollectible.id.slice(-8)}`,
      description: `${kollectible.prompt}. This NFT represents ownership of the IP Asset generated in Krump Quest.`,
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
      ],
    };

    // Upload metadata to IPFS using Pinata
    const ipIpfsHash = await uploadJSONToIPFS(ipMetadata);
    const ipHash = await generateHashFromJSON(ipMetadata);
    const nftIpfsHash = await uploadJSONToIPFS(nftMetadata);
    const nftHash = await generateHashFromJSON(nftMetadata);

    // Create commercial remix terms
    const licenseTerms = {
      defaultMintingFee: BigInt(1000000000000000), // 0.001 ETH in wei
      commercialRevShare: 500, // 5%
      royaltyPolicy: '0x7D2d9c3D4B7B3F1234567890123456789012345A' // Placeholder, would need actual address
    };

    // Register IP Asset with Story Protocol
    const response = await client.ipAsset.mintAndRegisterIpAssetWithPilTerms({
      spgNftContract: '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc',
      licenseTermsData: [{ terms: licenseTerms }],
      ipMetadata: {
        ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
        ipMetadataHash: `0x${ipHash}`,
        nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
        nftMetadataHash: `0x${nftHash}`,
      },
    });

    // Update kollectible with Story Protocol data
    const { error: updateError } = await supabase
      .from('kollectibles')
      .update({
        story_ip_id: response.ipId,
        story_tx_hash: response.txHash,
        story_license_terms_ids: response.licenseTermsIds,
        ip_metadata_uri: `https://ipfs.io/ipfs/${ipIpfsHash}`,
        nft_metadata_uri: `https://ipfs.io/ipfs/${nftIpfsHash}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', kollectibleId);

    if (updateError) {
      console.error('Error updating kollectible:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ipId: response.ipId,
        txHash: response.txHash,
        licenseTermsIds: response.licenseTermsIds,
        explorerUrl: `https://aeneid.storyscan.io/ipa/${response.ipId}`,
        ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
        nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error minting on Story:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to mint on Story Protocol' }),
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
    name: 'Krump Quest Metadata',
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

// Helper function to generate SHA256 hash from JSON
async function generateHashFromJSON(jsonData: any): Promise<string> {
  const jsonString = JSON.stringify(jsonData);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to generate SHA256 hash from URL content
async function generateHashFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
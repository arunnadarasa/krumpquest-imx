import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl, prompt, style, wallet_address } = await req.json()

    if (!imageUrl || !prompt || !wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const pinataJWT = Deno.env.get('PINATA_JWT')
    if (!pinataJWT) {
      return new Response(
        JSON.stringify({ error: 'Pinata JWT not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Downloading image from:', imageUrl)

    // Download the image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`)
    }

    const imageBlob = await imageResponse.blob()
    console.log('Image downloaded, size:', imageBlob.size)

    // Create form data for Pinata upload
    const formData = new FormData()
    formData.append('file', imageBlob, `kollectible-${Date.now()}.png`)
    
    // Add metadata
    const metadata = JSON.stringify({
      name: `Krump Quest Kollectible - ${prompt.substring(0, 50)}`,
      keyvalues: {
        creator: wallet_address,
        prompt: prompt,
        style: style,
        game: 'Krump Quest',
        timestamp: new Date().toISOString()
      }
    })
    formData.append('pinataMetadata', metadata)

    // Upload to Pinata
    console.log('Uploading to Pinata...')
    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pinataJWT}`,
      },
      body: formData,
    })

    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text()
      console.error('Pinata upload error:', errorText)
      throw new Error(`Failed to upload to Pinata: ${pinataResponse.status}`)
    }

    const pinataData = await pinataResponse.json()
    console.log('Uploaded to Pinata:', pinataData)

    const ipfsHash = pinataData.IpfsHash
    const gatewayUrl = Deno.env.get('PINATA_GATEWAY') || 'https://gateway.pinata.cloud'
    const pinataUrl = `${gatewayUrl}/ipfs/${ipfsHash}`

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Saving kollectible to database...')
    const { data: kollectible, error: dbError } = await supabase
      .from('kollectibles')
      .insert({
        wallet_address: wallet_address.toLowerCase(),
        prompt,
        image_url: imageUrl,
        ipfs_hash: ipfsHash,
        pinata_url: pinataUrl,
        style
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error(`Failed to save kollectible: ${dbError.message}`)
    }

    console.log('Kollectible saved successfully:', kollectible)

    return new Response(
      JSON.stringify({ 
        kollectible,
        ipfsHash,
        pinataUrl,
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in upload-to-ipfs function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to upload to IPFS', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
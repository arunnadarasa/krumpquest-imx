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

    console.log('Processing image URL type:', imageUrl.startsWith('data:') ? 'base64 data URL' : 'regular URL')

    let imageBlob: Blob

    if (imageUrl.startsWith('data:')) {
      // Handle base64 data URL
      console.log('Converting base64 data URL to blob...')
      
      // Validate and extract base64 data
      const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!base64Match) {
        throw new Error('Invalid base64 data URL format')
      }
      
      const [, extension, base64Data] = base64Match
      console.log('Image format:', extension, 'Base64 length:', base64Data.length)
      
      // Clean and validate base64
      const cleanBase64 = base64Data.replace(/[^A-Za-z0-9+/=]/g, '')
      if (cleanBase64.length % 4 !== 0) {
        throw new Error('Invalid base64 string length')
      }
      
      // Convert base64 to blob using fetch (more reliable than atob)
      try {
        const response = await fetch(imageUrl)
        imageBlob = await response.blob()
        console.log('Base64 converted to blob, size:', imageBlob.size)
      } catch (error) {
        console.error('Failed to convert base64:', error)
        throw new Error('Failed to process base64 image data')
      }
    } else {
      // Handle regular URL
      console.log('Downloading image from URL:', imageUrl)
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`)
      }
      imageBlob = await imageResponse.blob()
      console.log('Image downloaded, size:', imageBlob.size)
    }

    if (imageBlob.size === 0) {
      throw new Error('Image blob is empty')
    }

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
        supabase_image_url: imageUrl.startsWith('data:') ? null : imageUrl, // Store original URL if not base64
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
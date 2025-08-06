import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { 
      prompt, 
      style, 
      wallet_address, 
      aspectRatio = '1:1',
      width = 512,
      height = 512,
      characterGender = 'neutral',
      subjectType = 'human',
      animalSpecies = ''
    } = await req.json()

    // Map dimensions to aspect ratio for Stability AI
    let stabilityAspectRatio = '1:1'
    if (width > height) {
      stabilityAspectRatio = '16:9'
    } else if (height > width) {
      stabilityAspectRatio = '9:16'
    }
    
    // Override with provided aspectRatio if valid
    if (['1:1', '16:9', '9:16', '21:9', '2:3', '3:2', '4:5', '5:4'].includes(aspectRatio)) {
      stabilityAspectRatio = aspectRatio
    }

    console.log('Using aspect ratio:', stabilityAspectRatio)

    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const apiKey = Deno.env.get('STABILITY_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Stability AI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fixed base Krump prompt
    const baseKrumpPrompt = "A dynamic Krump dancer in mid-performance, wearing a snapback cap, oversized baseball jacket, black jeans, and Timberland boots. Black and white comic book art style, high contrast ink illustrations, bold linework, dramatic shadows. Urban street dance pose with expressive body language, capturing the intensity and energy of Krump dancing. Comic book panel aesthetic with strong black outlines and crosshatching details."
    
    // Character modifications
    let characterPrompt = baseKrumpPrompt
    if (subjectType === 'animal' && animalSpecies) {
      characterPrompt = characterPrompt.replace('Krump dancer', `Krump-dancing ${animalSpecies}`)
    } else if (characterGender !== 'neutral') {
      characterPrompt = characterPrompt.replace('Krump dancer', `${characterGender} Krump dancer`)
    }
    
    // Style-specific enhancements
    const styleEnhancements = {
      comic_book: 'professional comic book illustration, masterful ink work, dramatic composition',
      urban_sketch: 'urban street sketch style, rough pencil strokes, gritty realism',
      street_art: 'street art aesthetic, spray paint effects, wall mural style',
      noir: 'film noir style, dramatic lighting, deep shadows and highlights',
      graphic_novel: 'graphic novel illustration, cinematic composition, detailed lineart',
      minimalist: 'minimalist black and white art, clean lines, focused composition'
    }
    
    // Negative prompt for quality control
    const negativePrompt = "color, photorealistic, blurry, low quality, anime style, cartoon style, 3D render, painting, watercolor, sketchy lines, weak contrast, multiple people, crowded scene"
    
    // Construct final prompt
    let enhancedPrompt = characterPrompt
    if (prompt && prompt.trim()) {
      enhancedPrompt += `, ${prompt.trim()}`
    }
    enhancedPrompt += `, ${styleEnhancements[style as keyof typeof styleEnhancements] || styleEnhancements.comic_book}`

    console.log('Generating artwork with Stability AI Core...')
    console.log('Enhanced prompt:', enhancedPrompt)
    console.log('Negative prompt:', negativePrompt)
    console.log('Aspect ratio:', stabilityAspectRatio)

    // Create FormData for Stability AI API
    const formData = new FormData()
    formData.append('prompt', enhancedPrompt)
    formData.append('negative_prompt', negativePrompt)
    formData.append('aspect_ratio', stabilityAspectRatio)
    formData.append('output_format', 'png')

    // Submit generation request to Stability AI Core
    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'image/*'
      },
      body: formData,
    })

    console.log('Stability AI response status:', response.status)
    console.log('Stability AI response headers:', Object.fromEntries(response.headers.entries()))

    // Handle response with explicit status checking
    if (response.status !== 200) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorText = await response.text()
        console.error('Stability AI error response:', errorText)
        errorMessage = `${response.status}: ${errorText}`
      } catch (e) {
        console.error('Failed to read error response:', e)
      }
      throw new Error(`Failed to generate image - ${errorMessage}`)
    }

    // Convert response to base64 using efficient chunk-based approach
    const imageBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(imageBuffer)
    console.log('Image buffer size:', uint8Array.length, 'bytes')
    
    // Convert to base64 in chunks to avoid stack overflow
    let base64 = ''
    const chunkSize = 8192
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize)
      base64 += btoa(String.fromCharCode.apply(null, Array.from(chunk)))
    }
    
    const imageUrl = `data:image/png;base64,${base64}`
    console.log('Image generated successfully with Stability AI Core, base64 length:', base64.length)

    return new Response(
      JSON.stringify({ 
        imageUrl,
        prompt: enhancedPrompt,
        style,
        aspectRatio: stabilityAspectRatio
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in generate-artwork function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate artwork', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
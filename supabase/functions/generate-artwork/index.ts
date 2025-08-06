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

    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const apiKey = Deno.env.get('STABLEHORDE_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
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

    console.log('Generating artwork with Stable Horde API...')
    console.log('Enhanced prompt:', enhancedPrompt)

    // Submit generation request to Stable Horde
    const submitResponse = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        params: {
          width: width,
          height: height,
          steps: 28, // Recommended 25-30
          cfg_scale: 8, // Recommended 7-9
          sampler_name: 'DPM++ 2M Karras', // Recommended sampler
        },
        nsfw: false,
        censor_nsfw: true,
        models: ['stable_diffusion'],
        r2: true, // Use R2 storage for faster access
      }),
    })

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text()
      console.error('Stable Horde submit error:', errorText)
      throw new Error(`Failed to submit generation request: ${submitResponse.status}`)
    }

    const submitData = await submitResponse.json()
    const requestId = submitData.id

    if (!requestId) {
      throw new Error('No request ID received from Stable Horde')
    }

    console.log('Generation request submitted, ID:', requestId)

    // Poll for completion
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max wait time
    let imageUrl = null

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      attempts++

      console.log(`Checking generation status (attempt ${attempts}/${maxAttempts})...`)

      const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/check/${requestId}`, {
        headers: {
          'apikey': apiKey,
        },
      })

      if (!statusResponse.ok) {
        console.error('Status check failed:', await statusResponse.text())
        continue
      }

      const statusData = await statusResponse.json()
      console.log('Status data:', statusData)

      if (statusData.done) {
        // Get the generated images
        const resultResponse = await fetch(`https://stablehorde.net/api/v2/generate/status/${requestId}`, {
          headers: {
            'apikey': apiKey,
          },
        })

        if (resultResponse.ok) {
          const resultData = await resultResponse.json()
          console.log('Result data:', resultData)

          if (resultData.generations && resultData.generations.length > 0) {
            imageUrl = resultData.generations[0].img
            break
          }
        }
      }

      if (statusData.faulted) {
        throw new Error('Generation request faulted')
      }
    }

    if (!imageUrl) {
      throw new Error('Image generation timed out or failed')
    }

    console.log('Image generated successfully:', imageUrl)

    return new Response(
      JSON.stringify({ 
        imageUrl,
        prompt: enhancedPrompt,
        style,
        requestId 
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
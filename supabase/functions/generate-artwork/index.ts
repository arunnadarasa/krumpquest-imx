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
    const { prompt, style, wallet_address } = await req.json()

    if (!prompt || !wallet_address) {
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

    // Style-specific prompt enhancements
    const stylePrompts = {
      anime: 'anime style, detailed, vibrant colors, high quality',
      cyberpunk: 'cyberpunk style, neon lights, futuristic, dark atmosphere',
      street_art: 'street art style, graffiti, urban, bold colors',
      neon: 'neon art style, glowing effects, electric colors, synthwave',
      pixel_art: '8-bit pixel art style, retro gaming, crisp pixels',
      graffiti: 'graffiti art style, spray paint, street culture, bold'
    }

    const enhancedPrompt = `${prompt}, ${stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.anime}`

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
          width: 512,
          height: 512,
          steps: 20,
          cfg_scale: 7,
          sampler_name: 'k_euler_a',
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
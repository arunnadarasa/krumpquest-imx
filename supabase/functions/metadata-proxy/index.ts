import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const tokenIdWithExt = pathParts[pathParts.length - 1]; // e.g., "1.json"
    
    if (!tokenIdWithExt || !tokenIdWithExt.endsWith('.json')) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format. Expected: {token_id}.json' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const tokenId = tokenIdWithExt.replace('.json', '');
    const tokenIdNum = parseInt(tokenId);

    if (isNaN(tokenIdNum)) {
      return new Response(
        JSON.stringify({ error: 'Invalid token ID format' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the token URI for this token ID
    const { data: kollectible, error } = await supabase
      .from('immutable_kollectibles')
      .select('token_uri')
      .eq('token_id', tokenIdNum)
      .single();

    if (error || !kollectible) {
      console.error('Token not found:', { tokenId: tokenIdNum, error });
      return new Response(
        JSON.stringify({ error: 'Token not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!kollectible.token_uri) {
      console.error('Token URI not set for token:', tokenIdNum);
      return new Response(
        JSON.stringify({ error: 'Token URI not available' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Fetch the metadata from the token URI
    const metadataResponse = await fetch(kollectible.token_uri);
    
    if (!metadataResponse.ok) {
      console.error('Failed to fetch metadata from token URI:', kollectible.token_uri);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve metadata' }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const metadata = await metadataResponse.json();

    // Return the metadata directly
    return new Response(
      JSON.stringify(metadata),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in metadata-proxy:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
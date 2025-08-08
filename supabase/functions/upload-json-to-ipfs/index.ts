export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Deno Edge Function to upload arbitrary JSON metadata to IPFS via Pinata
// Request body: { json: any }
// Response: { ipfsHash: string, uri: string }
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PINATA_JWT = Deno.env.get('PINATA_JWT');
    if (!PINATA_JWT) {
      return new Response(
        JSON.stringify({ error: 'Missing PINATA_JWT secret' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const json = body?.json;

    if (!json || (typeof json !== 'object')) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: expected { json: object }' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pinataContent: json }),
    });

    if (!pinataRes.ok) {
      const errText = await pinataRes.text();
      return new Response(
        JSON.stringify({ error: 'Pinata upload failed', details: errText }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const pinataData = await pinataRes.json();
    const ipfsHash: string = pinataData.IpfsHash || pinataData.Hash || pinataData.cid;
    const uri = `https://ipfs.io/ipfs/${ipfsHash}`;

    return new Response(
      JSON.stringify({ ipfsHash, uri }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

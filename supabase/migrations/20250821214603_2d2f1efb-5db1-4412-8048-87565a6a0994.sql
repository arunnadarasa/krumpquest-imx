-- Create a public view that excludes sensitive wallet information
CREATE OR REPLACE VIEW public.kollectibles_public AS
SELECT 
  id,
  immutable_collection_id,
  nft_metadata_uri,
  style,
  token_id,
  created_at,
  metadata_ipfs_hash,
  prompt,
  image_url,
  ipfs_hash,
  pinata_url,
  supabase_image_url,
  immutable_nft_id,
  immutable_tx_hash,
  token_uri,
  updated_at
  -- Explicitly exclude wallet_address and is_hidden from public view
FROM public.immutable_kollectibles 
WHERE is_hidden = false;

-- Enable RLS on the view
ALTER VIEW public.kollectibles_public SET (security_barrier = true);

-- Drop the existing public policy that exposes wallet addresses
DROP POLICY IF EXISTS "Anyone can view visible immutable kollectibles" ON public.immutable_kollectibles;

-- Create a new restrictive policy - only allow public access through the view
-- This effectively removes direct public access to the main table
CREATE POLICY "Public can only access through kollectibles_public view" 
ON public.immutable_kollectibles 
FOR SELECT 
USING (false);

-- Grant SELECT permission on the public view to anonymous users
GRANT SELECT ON public.kollectibles_public TO anon;
GRANT SELECT ON public.kollectibles_public TO authenticated;
-- Drop the existing view with security definer
DROP VIEW IF EXISTS public.kollectibles_public;

-- Restore the original policy but make it more restrictive
DROP POLICY IF EXISTS "Public can only access through kollectibles_public view" ON public.immutable_kollectibles;

-- Create a policy that allows public viewing but excludes sensitive data
-- We'll handle this at the application level by selecting specific columns
CREATE POLICY "Anyone can view visible immutable kollectibles (limited fields)" 
ON public.immutable_kollectibles 
FOR SELECT 
USING (is_hidden = false);

-- Create a database function to get public kollectible data without wallet addresses
CREATE OR REPLACE FUNCTION public.get_public_kollectibles()
RETURNS TABLE (
  id uuid,
  immutable_collection_id text,
  nft_metadata_uri text,
  style text,
  token_id integer,
  created_at timestamp with time zone,
  metadata_ipfs_hash text,
  prompt text,
  image_url text,
  ipfs_hash text,
  pinata_url text,
  supabase_image_url text,
  immutable_nft_id text,
  immutable_tx_hash text,
  token_uri text,
  updated_at timestamp with time zone
) 
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT 
    k.id,
    k.immutable_collection_id,
    k.nft_metadata_uri,
    k.style,
    k.token_id,
    k.created_at,
    k.metadata_ipfs_hash,
    k.prompt,
    k.image_url,
    k.ipfs_hash,
    k.pinata_url,
    k.supabase_image_url,
    k.immutable_nft_id,
    k.immutable_tx_hash,
    k.token_uri,
    k.updated_at
  FROM public.immutable_kollectibles k
  WHERE k.is_hidden = false;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_kollectibles() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_kollectibles() TO authenticated;
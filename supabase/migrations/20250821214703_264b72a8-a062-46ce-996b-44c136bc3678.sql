-- Fix the function search path security issue
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
SET search_path = 'public'
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
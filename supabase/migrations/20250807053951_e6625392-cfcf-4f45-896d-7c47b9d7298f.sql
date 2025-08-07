-- Add new fields to kollectibles table for Story Protocol integration
ALTER TABLE public.kollectibles 
ADD COLUMN supabase_image_url text,
ADD COLUMN story_ip_id text,
ADD COLUMN story_tx_hash text,
ADD COLUMN story_license_terms_ids text[],
ADD COLUMN nft_metadata_uri text,
ADD COLUMN ip_metadata_uri text;
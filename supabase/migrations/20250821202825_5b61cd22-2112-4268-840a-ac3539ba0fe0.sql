-- Add new columns to immutable_kollectibles table for IPFS metadata structure
ALTER TABLE public.immutable_kollectibles 
ADD COLUMN metadata_ipfs_hash TEXT,
ADD COLUMN token_uri TEXT,
ADD COLUMN token_id INTEGER;

-- Create a sequence for auto-incrementing token IDs
CREATE SEQUENCE IF NOT EXISTS public.immutable_token_id_seq START 1;

-- Add a function to get the next token ID
CREATE OR REPLACE FUNCTION public.get_next_token_id()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    next_id INTEGER;
BEGIN
    SELECT nextval('public.immutable_token_id_seq') INTO next_id;
    RETURN next_id;
END;
$$;
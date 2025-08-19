-- Create immutable_kollectibles table for Immutable zkEVM NFTs
CREATE TABLE public.immutable_kollectibles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT,
  ipfs_hash TEXT,
  pinata_url TEXT,
  supabase_image_url TEXT,
  immutable_nft_id TEXT,
  immutable_tx_hash TEXT,
  immutable_collection_id TEXT,
  nft_metadata_uri TEXT,
  style TEXT DEFAULT 'anime',
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.immutable_kollectibles ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (for gallery viewing)
CREATE POLICY "Anyone can view visible immutable kollectibles" 
ON public.immutable_kollectibles 
FOR SELECT 
USING (NOT is_hidden);

-- Create policies for wallet owner access
CREATE POLICY "Wallet owners can view their own immutable kollectibles" 
ON public.immutable_kollectibles 
FOR SELECT 
USING (true);

CREATE POLICY "Wallet owners can create their own immutable kollectibles" 
ON public.immutable_kollectibles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Wallet owners can update their own immutable kollectibles" 
ON public.immutable_kollectibles 
FOR UPDATE 
USING (true);

CREATE POLICY "Wallet owners can delete their own immutable kollectibles" 
ON public.immutable_kollectibles 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_immutable_kollectibles_updated_at
BEFORE UPDATE ON public.immutable_kollectibles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
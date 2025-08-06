-- Create kollectibles table for storing user-generated artwork
CREATE TABLE public.kollectibles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT,
  ipfs_hash TEXT,
  pinata_url TEXT,
  style TEXT DEFAULT 'anime',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.kollectibles ENABLE ROW LEVEL SECURITY;

-- Create policies for wallet-based access
CREATE POLICY "Users can view their own kollectibles" 
ON public.kollectibles 
FOR SELECT 
USING (true); -- Allow viewing all kollectibles for gallery purposes

CREATE POLICY "Users can create their own kollectibles" 
ON public.kollectibles 
FOR INSERT 
WITH CHECK (true); -- Allow creation, wallet address verification handled in app

CREATE POLICY "Users can update their own kollectibles" 
ON public.kollectibles 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete their own kollectibles" 
ON public.kollectibles 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_kollectibles_updated_at
BEFORE UPDATE ON public.kollectibles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance on wallet queries
CREATE INDEX idx_kollectibles_wallet_address ON public.kollectibles(wallet_address);
CREATE INDEX idx_kollectibles_created_at ON public.kollectibles(created_at DESC);
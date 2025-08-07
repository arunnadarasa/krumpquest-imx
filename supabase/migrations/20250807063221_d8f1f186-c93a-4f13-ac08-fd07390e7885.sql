-- Add is_hidden column to kollectibles table
ALTER TABLE public.kollectibles 
ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;
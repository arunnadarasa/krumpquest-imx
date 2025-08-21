-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.get_next_token_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_id INTEGER;
BEGIN
    SELECT nextval('public.immutable_token_id_seq') INTO next_id;
    RETURN next_id;
END;
$$;
-- Fix search_path for trigger function to prevent potential privilege escalation
ALTER FUNCTION public.update_updated_at() SET search_path = public;

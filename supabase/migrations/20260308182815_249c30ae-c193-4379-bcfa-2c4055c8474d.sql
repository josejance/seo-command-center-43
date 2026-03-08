
-- Recreate missing triggers (only the ones that don't exist)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_pieces_updated_at ON public.content_pieces;
CREATE TRIGGER update_content_pieces_updated_at
  BEFORE UPDATE ON public.content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

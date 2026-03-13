-- Migración 002: Trigger para poblar contexto_estudiantil al crear usuario
-- Ejecutar en Supabase SQL Editor

-- Función que se ejecuta automáticamente al crear un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_contexto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.contexto_estudiantil (user_id, situacion_academica, tipo_vivienda)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'situacion_academica',
    NEW.raw_user_meta_data ->> 'tipo_vivienda'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    situacion_academica = EXCLUDED.situacion_academica,
    tipo_vivienda       = EXCLUDED.tipo_vivienda;
  RETURN NEW;
END;
$$;

-- Trigger que dispara la función tras cada INSERT en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_contexto ON auth.users;
CREATE TRIGGER on_auth_user_created_contexto
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_contexto();

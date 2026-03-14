-- Tabla para resultados de exámenes médicos de usuarios
-- Migra el almacenamiento de localStorage a Supabase

CREATE TABLE IF NOT EXISTS examenes_resultados (
    id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     TEXT         NOT NULL,
    examen_id   TEXT         NOT NULL,
    valor       FLOAT        NOT NULL,
    fecha       DATE         NOT NULL,
    interpretacion TEXT      NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Índice para consultas por usuario
CREATE INDEX IF NOT EXISTS idx_examenes_resultados_user_id
    ON examenes_resultados (user_id, fecha DESC);

-- RLS: cada usuario solo accede a sus propios registros
ALTER TABLE examenes_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios leen sus propios exámenes"
    ON examenes_resultados FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Usuarios insertan sus propios exámenes"
    ON examenes_resultados FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Usuarios eliminan sus propios exámenes"
    ON examenes_resultados FOR DELETE
    USING (auth.uid()::text = user_id);

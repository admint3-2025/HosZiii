-- =====================================================
-- Migración: Integración con Telegram
-- Descripción: Guardar mapeo entre usuarios y chat_ids de Telegram
-- =====================================================

-- 1. Crear tabla para guardar chat_ids de Telegram por usuario
-- Diseño escalable: permite múltiples chat_ids por usuario (Opción 2)
CREATE TABLE IF NOT EXISTS user_telegram_chat_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  device_name TEXT DEFAULT 'Telegram Bot',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_telegram_chat_ids_user_id 
  ON user_telegram_chat_ids(user_id);

CREATE INDEX IF NOT EXISTS idx_user_telegram_chat_ids_chat_id 
  ON user_telegram_chat_ids(telegram_chat_id);

CREATE INDEX IF NOT EXISTS idx_user_telegram_chat_ids_is_active 
  ON user_telegram_chat_ids(is_active);

-- 2. Habilitar RLS
ALTER TABLE user_telegram_chat_ids ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS
-- Los usuarios solo ven sus propios registros
DO $$
BEGIN
  CREATE POLICY "Users can view own telegram chat ids"
    ON user_telegram_chat_ids FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Los usuarios pueden actualizar sus propios registros
DO $$
BEGIN
  CREATE POLICY "Users can update own telegram chat ids"
    ON user_telegram_chat_ids FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Los usuarios pueden insertar sus propios registros
DO $$
BEGIN
  CREATE POLICY "Users can insert their own telegram chat ids"
    ON user_telegram_chat_ids FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- El sistema (service_role) puede hacer cualquier cosa
DO $$
BEGIN
  CREATE POLICY "System can manage telegram chat ids"
    ON user_telegram_chat_ids FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Crear función para actualizar last_used_at
CREATE OR REPLACE FUNCTION update_telegram_last_used()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = NOW();
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger para actualizar last_used_at
DO $$
BEGIN
  CREATE TRIGGER trg_update_telegram_last_used
    BEFORE UPDATE ON user_telegram_chat_ids
    FOR EACH ROW
    EXECUTE FUNCTION update_telegram_last_used();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. Comentario de tabla
COMMENT ON TABLE user_telegram_chat_ids IS 'Mapeo entre usuarios y chat_ids de Telegram. Escalable para múltiples dispositivos (Opción 2)';
COMMENT ON COLUMN user_telegram_chat_ids.is_active IS 'Indica si el chat está activo. En Opción 1 solo permite 1 activo por usuario';
COMMENT ON COLUMN user_telegram_chat_ids.device_name IS 'Nombre del dispositivo/cliente (para Opción 2 con múltiples chats)';

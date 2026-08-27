-- Habilitar extensión de trigramas (necesaria para ILIKE '%keyword%' con índice)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices GIN de trigrama para búsqueda de productos en PDV
-- Convierten el full-table-scan en búsqueda indexada (~50x más rápida)
CREATE INDEX IF NOT EXISTS idx_productos_nombre_trgm
  ON productos USING GIN (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_trgm
  ON productos USING GIN (codigo gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras_trgm
  ON productos USING GIN ("codigoBarras" gin_trgm_ops);

-- Índice trigrama en nombre de contactos (búsqueda de clientes en PDV)
CREATE INDEX IF NOT EXISTS idx_contactos_nombre_trgm
  ON contactos USING GIN (nombre gin_trgm_ops);

USE pelisenpareja;
CREATE TABLE IF NOT EXISTS pp_catalog_items (
 region CHAR(2) NOT NULL, provider_id INT UNSIGNED NOT NULL, media_type VARCHAR(8) NOT NULL, tmdb_id INT UNSIGNED NOT NULL,
 popularity FLOAT NOT NULL DEFAULT 0, release_date DATE NULL, payload_json MEDIUMTEXT NOT NULL,
 last_seen_at DATETIME NOT NULL, active TINYINT NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(region,provider_id,media_type,tmdb_id), KEY idx_pp_catalog_feed(region,provider_id,media_type,active,popularity), KEY idx_pp_catalog_date(region,provider_id,media_type,active,release_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_catalog_sync (
 region CHAR(2) NOT NULL, provider_id INT UNSIGNED NOT NULL, media_type VARCHAR(8) NOT NULL,
 next_page SMALLINT UNSIGNED NOT NULL DEFAULT 1, total_pages INT UNSIGNED NOT NULL DEFAULT 0, truncated TINYINT NOT NULL DEFAULT 0,
 cycle_started_at DATETIME NULL, last_completed_at DATETIME NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(region,provider_id,media_type), KEY idx_pp_catalog_sync_progress(region,next_page,updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

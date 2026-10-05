USE pelisenpareja;
CREATE TABLE IF NOT EXISTS pp_similar (
 media_type VARCHAR(8) NOT NULL, tmdb_id INT UNSIGNED NOT NULL, similar_tmdb_id INT UNSIGNED NOT NULL,
 page SMALLINT UNSIGNED NOT NULL, item_order SMALLINT UNSIGNED NOT NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(media_type,tmdb_id,similar_tmdb_id), KEY idx_pp_similar_source_order(media_type,tmdb_id,page,item_order), KEY idx_pp_similar_target(media_type,similar_tmdb_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

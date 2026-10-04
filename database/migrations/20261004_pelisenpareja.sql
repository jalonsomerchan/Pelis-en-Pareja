CREATE DATABASE IF NOT EXISTS pelisenpareja CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pelisenpareja;
CREATE TABLE IF NOT EXISTS pp_users (
 uid VARCHAR(128) NOT NULL PRIMARY KEY, email VARCHAR(254) NOT NULL DEFAULT '', display_name VARCHAR(120) NOT NULL DEFAULT '', photo_url VARCHAR(2048) NOT NULL DEFAULT '',
 telegram_chat_id VARCHAR(32) NULL, telegram_username VARCHAR(64) NULL, telegram_enabled TINYINT NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_groups (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, owner_uid VARCHAR(128) NOT NULL, invite_code CHAR(12) NOT NULL,
 region CHAR(2) NOT NULL DEFAULT 'ES', media_type VARCHAR(8) NOT NULL DEFAULT 'movie', providers_json TEXT NOT NULL, excluded_genres_json TEXT NOT NULL, excluded_countries_json TEXT NOT NULL,
 filter_version INT UNSIGNED NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_pp_code(invite_code), CONSTRAINT fk_pp_owner FOREIGN KEY(owner_uid) REFERENCES pp_users(uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_members (
 group_id BIGINT UNSIGNED NOT NULL, uid VARCHAR(128) NOT NULL, joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(group_id,uid), KEY idx_pp_member(uid),
 CONSTRAINT fk_pp_member_group FOREIGN KEY(group_id) REFERENCES pp_groups(id) ON DELETE CASCADE,
 CONSTRAINT fk_pp_member_user FOREIGN KEY(uid) REFERENCES pp_users(uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_invites (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, group_id BIGINT UNSIGNED NOT NULL, email VARCHAR(254) NOT NULL, token_hash CHAR(64) NOT NULL,
 status VARCHAR(12) NOT NULL DEFAULT 'pending', email_sent TINYINT NOT NULL DEFAULT 0, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_pp_invite(group_id,email), UNIQUE KEY uq_pp_invite_token(token_hash), KEY idx_pp_invite_email(email,status),
 CONSTRAINT fk_pp_invite_group FOREIGN KEY(group_id) REFERENCES pp_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_titles (
 media_type VARCHAR(8) NOT NULL, tmdb_id INT UNSIGNED NOT NULL, payload_json MEDIUMTEXT NOT NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(media_type,tmdb_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_votes (
 group_id BIGINT UNSIGNED NOT NULL, uid VARCHAR(128) NOT NULL, media_type VARCHAR(8) NOT NULL, tmdb_id INT UNSIGNED NOT NULL, decision VARCHAR(8) NOT NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(group_id,uid,media_type,tmdb_id), KEY idx_pp_vote_title(group_id,media_type,tmdb_id),
 CONSTRAINT fk_pp_vote_group FOREIGN KEY(group_id) REFERENCES pp_groups(id) ON DELETE CASCADE,
 CONSTRAINT fk_pp_vote_user FOREIGN KEY(uid) REFERENCES pp_users(uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_seen (
 group_id BIGINT UNSIGNED NOT NULL, media_type VARCHAR(8) NOT NULL, tmdb_id INT UNSIGNED NOT NULL, marked_by VARCHAR(128) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(group_id,media_type,tmdb_id), CONSTRAINT fk_pp_seen_group FOREIGN KEY(group_id) REFERENCES pp_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_matches (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, group_id BIGINT UNSIGNED NOT NULL, media_type VARCHAR(8) NOT NULL, tmdb_id INT UNSIGNED NOT NULL,
 active TINYINT NOT NULL DEFAULT 1, generation INT NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_pp_match(group_id,media_type,tmdb_id), KEY idx_pp_match_active(group_id,active),
 CONSTRAINT fk_pp_match_group FOREIGN KEY(group_id) REFERENCES pp_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_notifications (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, group_id BIGINT UNSIGNED NOT NULL, match_id BIGINT UNSIGNED NOT NULL, generation INT NOT NULL, uid VARCHAR(128) NOT NULL,
 message VARCHAR(500) NOT NULL, read_at DATETIME NULL, telegram_state VARCHAR(12) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0,
 next_attempt_at DATETIME NULL, locked_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_pp_notification(match_id,generation,uid), KEY idx_pp_notification_user(uid,read_at), KEY idx_pp_outbox(telegram_state,next_attempt_at),
 CONSTRAINT fk_pp_notification_group FOREIGN KEY(group_id) REFERENCES pp_groups(id) ON DELETE CASCADE,
 CONSTRAINT fk_pp_notification_match FOREIGN KEY(match_id) REFERENCES pp_matches(id) ON DELETE CASCADE,
 CONSTRAINT fk_pp_notification_user FOREIGN KEY(uid) REFERENCES pp_users(uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_telegram_tokens (
 token_hash CHAR(64) NOT NULL PRIMARY KEY, uid VARCHAR(128) NOT NULL, expires_at DATETIME NOT NULL, used_at DATETIME NULL,
 KEY idx_pp_link_uid(uid), CONSTRAINT fk_pp_link_user FOREIGN KEY(uid) REFERENCES pp_users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_cache (
 cache_key CHAR(64) NOT NULL PRIMARY KEY, payload_json MEDIUMTEXT NOT NULL, expires_at DATETIME NOT NULL, KEY idx_pp_cache_expiry(expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS pp_offers (
 group_id BIGINT UNSIGNED NOT NULL, uid VARCHAR(128) NOT NULL, media_type VARCHAR(8) NOT NULL, tmdb_id INT UNSIGNED NOT NULL, filter_version INT NOT NULL, offered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(group_id,uid,media_type,tmdb_id),
 CONSTRAINT fk_pp_offer_group FOREIGN KEY(group_id) REFERENCES pp_groups(id) ON DELETE CASCADE,
 CONSTRAINT fk_pp_offer_user FOREIGN KEY(uid) REFERENCES pp_users(uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

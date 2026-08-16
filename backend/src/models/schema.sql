-- ExpireEase PostgreSQL Schema
-- Owner: Arham Shah (Backend/Database & Integration Lead)

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    phone_number    VARCHAR(20) UNIQUE,
    auth_provider   VARCHAR(20) NOT NULL DEFAULT 'email', -- 'email' | 'google' | 'phone'
    display_name    VARCHAR(100),
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    normalised_name VARCHAR(255) NOT NULL, -- lowercased/trimmed, used for de-dup
    barcode         VARCHAR(64),
    mfg_date        DATE,
    exp_date        DATE NOT NULL,
    quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit            VARCHAR(20) DEFAULT 'unit',
    entry_method    VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'manual' | 'ocr' | 'barcode'
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'used' | 'wasted'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_mfg_before_exp CHECK (mfg_date IS NULL OR mfg_date < exp_date)
);
CREATE INDEX IF NOT EXISTS idx_items_user_status ON items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_items_exp_date ON items(exp_date);

CREATE TABLE IF NOT EXISTS history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    item_name       VARCHAR(255) NOT NULL, -- snapshot, survives item edits
    action          VARCHAR(20) NOT NULL, -- 'used' | 'consumed'
    quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS waste_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    item_name       VARCHAR(255) NOT NULL,
    quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
    reason          VARCHAR(20) NOT NULL DEFAULT 'expired', -- 'expired' | 'manual_discard'
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waste_log_user ON waste_log(user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS shopping_lists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_type       VARCHAR(20) NOT NULL DEFAULT 'ration', -- 'ration' | 'household'
    name            VARCHAR(255) NOT NULL,
    normalised_name VARCHAR(255) NOT NULL,
    quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
    source          VARCHAR(20) NOT NULL DEFAULT 'custom', -- 'history' | 'custom'
    is_checked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, list_type, normalised_name)
);

CREATE TABLE IF NOT EXISTS custom_pool_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    normalised_name VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, normalised_name)
);

CREATE TABLE IF NOT EXISTS alerts_sent (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    alert_band      VARCHAR(30) NOT NULL, -- e.g. 'green' | 'yellow' | ... | 'blinking_red' | 'expired'
    channel         VARCHAR(20) NOT NULL DEFAULT 'whatsapp', -- 'whatsapp' | 'in_app'
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (item_id, alert_band) -- enforces send-once per band per item
);

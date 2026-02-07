BEGIN;

CREATE TABLE IF NOT EXISTS cost_centers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    area VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(140) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    parent_category_id INTEGER NULL REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_entries (
    id BIGSERIAL PRIMARY KEY,
    cost_center_id INTEGER NOT NULL REFERENCES cost_centers(id) ON DELETE RESTRICT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    reference_date DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'BRL',
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_entries (
    id BIGSERIAL PRIMARY KEY,
    cost_center_id INTEGER NULL REFERENCES cost_centers(id) ON DELETE RESTRICT,
    project_id INTEGER NULL REFERENCES projects(id) ON DELETE RESTRICT,
    month_date DATE NOT NULL,
    planned_amount NUMERIC(14, 2) NOT NULL CHECK (planned_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT budget_scope_ck CHECK (cost_center_id IS NOT NULL OR project_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_cost_entries_reference_date ON cost_entries(reference_date);
CREATE INDEX IF NOT EXISTS idx_cost_entries_cost_center ON cost_entries(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_project ON cost_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_category ON cost_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_entries_month_date ON budget_entries(month_date);

COMMIT;


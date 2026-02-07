BEGIN;

TRUNCATE TABLE budget_entries RESTART IDENTITY CASCADE;
TRUNCATE TABLE cost_entries RESTART IDENTITY CASCADE;
TRUNCATE TABLE categories RESTART IDENTITY CASCADE;
TRUNCATE TABLE projects RESTART IDENTITY CASCADE;
TRUNCATE TABLE cost_centers RESTART IDENTITY CASCADE;

INSERT INTO cost_centers (code, name, area) VALUES
('CC-OPS', 'Operacoes', 'Operacoes'),
('CC-TI', 'Tecnologia', 'Tecnologia'),
('CC-MKT', 'Marketing', 'Comercial'),
('CC-RH', 'Recursos Humanos', 'Corporativo'),
('CC-ADM', 'Administrativo', 'Corporativo');

INSERT INTO projects (code, name, status, start_date) VALUES
('PRJ-ERP', 'Programa ERP Corporativo', 'active', '2025-01-01'),
('PRJ-AI', 'Automacao Financeira com IA', 'active', '2025-02-01'),
('PRJ-EXP', 'Expansao Comercial Regional', 'active', '2025-03-01'),
('PRJ-COMPLIANCE', 'Programa de Compliance', 'active', '2025-01-01');

INSERT INTO categories (code, name, parent_category_id) VALUES
('CAT-PEOPLE', 'Pessoas', NULL),
('CAT-SERVICES', 'Servicos', NULL),
('CAT-INFRA', 'Infraestrutura', NULL),
('CAT-SALARY', 'Folha Salarial', (SELECT id FROM categories WHERE code = 'CAT-PEOPLE')),
('CAT-SOFTWARE', 'Licencas e Software', (SELECT id FROM categories WHERE code = 'CAT-SERVICES')),
('CAT-LOG', 'Logistica', (SELECT id FROM categories WHERE code = 'CAT-INFRA')),
('CAT-ENERGY', 'Energia', (SELECT id FROM categories WHERE code = 'CAT-INFRA')),
('CAT-TRAVEL', 'Viagens', (SELECT id FROM categories WHERE code = 'CAT-SERVICES'));

WITH months AS (
    SELECT generate_series('2025-01-01'::date, '2026-01-01'::date, interval '1 month')::date AS month_ref
),
leaf_categories AS (
    SELECT id, code, name
    FROM categories
    WHERE code IN ('CAT-SALARY', 'CAT-SOFTWARE', 'CAT-LOG', 'CAT-ENERGY', 'CAT-TRAVEL')
)
INSERT INTO cost_entries (
    cost_center_id,
    project_id,
    category_id,
    reference_date,
    amount,
    currency,
    description
)
SELECT
    cc.id,
    CASE
        WHEN cc.code IN ('CC-OPS', 'CC-TI') THEN (SELECT id FROM projects WHERE code = 'PRJ-ERP')
        WHEN cc.code = 'CC-MKT' THEN (SELECT id FROM projects WHERE code = 'PRJ-EXP')
        WHEN cc.code = 'CC-RH' THEN (SELECT id FROM projects WHERE code = 'PRJ-COMPLIANCE')
        ELSE (SELECT id FROM projects WHERE code = 'PRJ-AI')
    END AS project_id,
    cat.id,
    (m.month_ref + interval '14 day')::date AS reference_date,
    ROUND(
        (
            CASE cc.code
                WHEN 'CC-OPS' THEN 90000
                WHEN 'CC-TI' THEN 65000
                WHEN 'CC-MKT' THEN 52000
                WHEN 'CC-RH' THEN 43000
                ELSE 30000
            END
            +
            CASE cat.code
                WHEN 'CAT-SALARY' THEN 38000
                WHEN 'CAT-SOFTWARE' THEN 28000
                WHEN 'CAT-LOG' THEN 23000
                WHEN 'CAT-ENERGY' THEN 17000
                ELSE 12000
            END
        )
        * (1 + ((EXTRACT(MONTH FROM m.month_ref)::int - 1) * 0.018))
        * (1 + (((cc.id * 10) + cat.id) % 4) * 0.03)
        * CASE
            WHEN cc.code = 'CC-OPS' AND m.month_ref >= '2025-09-01'::date THEN 1.18
            ELSE 1
        END
        * CASE
            WHEN cc.code = 'CC-MKT' AND cat.code = 'CAT-TRAVEL' AND m.month_ref = '2025-11-01'::date THEN 1.75
            ELSE 1
        END,
        2
    )::numeric(14, 2) AS amount,
    'BRL',
    CONCAT('Lancamento mensal de ', cat.name, ' - ', cc.name, ' - ', to_char(m.month_ref, 'YYYY-MM'))
FROM months m
CROSS JOIN cost_centers cc
CROSS JOIN leaf_categories cat;

WITH months AS (
    SELECT generate_series('2025-01-01'::date, '2026-01-01'::date, interval '1 month')::date AS month_ref
)
INSERT INTO budget_entries (cost_center_id, month_date, planned_amount)
SELECT
    cc.id,
    m.month_ref,
    ROUND(
        (
            CASE cc.code
                WHEN 'CC-OPS' THEN 540000
                WHEN 'CC-TI' THEN 420000
                WHEN 'CC-MKT' THEN 340000
                WHEN 'CC-RH' THEN 290000
                ELSE 240000
            END
        ) * (1 + ((EXTRACT(MONTH FROM m.month_ref)::int - 1) * 0.01)),
        2
    )::numeric(14, 2)
FROM months m
CROSS JOIN cost_centers cc;

COMMIT;


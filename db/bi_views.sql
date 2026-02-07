BEGIN;

CREATE OR REPLACE VIEW vw_costs_monthly AS
SELECT
    date_trunc('month', ce.reference_date)::date AS month_ref,
    cc.name AS cost_center,
    p.name AS project,
    c.name AS category,
    SUM(ce.amount)::numeric(14, 2) AS total_amount
FROM cost_entries ce
JOIN cost_centers cc ON cc.id = ce.cost_center_id
JOIN projects p ON p.id = ce.project_id
JOIN categories c ON c.id = ce.category_id
GROUP BY 1, 2, 3, 4;

CREATE OR REPLACE VIEW vw_waste_signals AS
WITH ranked AS (
    SELECT
        cc.name AS cost_center,
        c.name AS category,
        date_trunc('month', ce.reference_date)::date AS month_ref,
        SUM(ce.amount)::numeric(14, 2) AS total_amount
    FROM cost_entries ce
    JOIN cost_centers cc ON cc.id = ce.cost_center_id
    JOIN categories c ON c.id = ce.category_id
    GROUP BY 1, 2, 3
),
baseline AS (
    SELECT
        cost_center,
        category,
        AVG(total_amount) AS avg_amount
    FROM ranked
    GROUP BY 1, 2
)
SELECT
    r.month_ref,
    r.cost_center,
    r.category,
    r.total_amount,
    b.avg_amount::numeric(14, 2) AS baseline_avg,
    (r.total_amount - b.avg_amount)::numeric(14, 2) AS delta_from_baseline
FROM ranked r
JOIN baseline b ON b.cost_center = r.cost_center AND b.category = r.category;

COMMIT;


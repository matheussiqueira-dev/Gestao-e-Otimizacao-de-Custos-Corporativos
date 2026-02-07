-- SQL base para cards de BI no Superset

-- Custo total e media mensal
SELECT
    SUM(total_amount) AS total_cost,
    AVG(total_amount) AS avg_monthly_cost
FROM (
    SELECT month_ref, SUM(total_amount) AS total_amount
    FROM vw_costs_monthly
    GROUP BY month_ref
) t;

-- Top desperdicios no periodo
SELECT
    month_ref,
    cost_center,
    category,
    total_amount,
    baseline_avg,
    delta_from_baseline
FROM vw_waste_signals
WHERE delta_from_baseline > 0
ORDER BY delta_from_baseline DESC
LIMIT 20;


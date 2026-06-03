-- V36: Performance indexes for statistics and debt queries
-- Three targeted indexes covering the most common query patterns added in the
-- statistics and unpaid debt services. None of these columns had indexes before.

-- Used by StatisticsService.getStatusOverview() countSettledDebts() /
-- sumSettledDebts() and any query filtering on debt_settled_at
CREATE INDEX idx_commandes_debt_settled
    ON commandes (debt_settled_at);

-- Used by StatisticsService status-count queries and UnpaidService
-- filtering delivered orders by client. Composite covers both columns
-- in the WHERE clause without a full table scan.
CREATE INDEX idx_commandes_client_status
    ON commandes (client_id, status);

-- Used by PaiementRepository.sumCollectedBetween / countOrdersWithPaymentBetween
-- and the groupBy-date revenue query. Composite allows index-only scans for
-- the commande_id + date_paiement predicates.
CREATE INDEX idx_paiements_commande_date
    ON paiements (commande_id, date_paiement);

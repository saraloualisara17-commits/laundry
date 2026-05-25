package com.wash.laundry_app.alerts;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OperationalAlertRepository extends JpaRepository<OperationalAlert, Long> {

    List<OperationalAlert> findByResolvedFalseOrderByCreatedAtDesc();

    /** Prevent duplicate alerts: check if an open alert of the same type already exists for this order. */
    boolean existsByAlertTypeAndCommande_IdAndResolvedFalse(String alertType, Long commandeId);

    /** Check for open alert of a type for a client (e.g. unpaid debt reminder). */
    boolean existsByAlertTypeAndClient_IdAndResolvedFalse(String alertType, Long clientId);

    @Query("SELECT a FROM OperationalAlert a WHERE a.resolved = false " +
           "ORDER BY CASE a.severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END, a.createdAt DESC")
    List<OperationalAlert> findAllOpenOrderedBySeverity();

    @Query("SELECT COUNT(a) FROM OperationalAlert a WHERE a.resolved = false AND a.severity = :severity")
    long countOpenBySeverity(@Param("severity") String severity);
}

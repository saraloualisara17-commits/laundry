package com.wash.laundry_app.calllogs;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CallLogRepository extends JpaRepository<CallLog, Long> {

    @Query("SELECT cl FROM CallLog cl " +
           "LEFT JOIN FETCH cl.staff " +
           "LEFT JOIN FETCH cl.client " +
           "LEFT JOIN FETCH cl.order " +
           "ORDER BY cl.calledAt DESC")
    Page<CallLog> findAllWithDetails(Pageable pageable);

    @Query("SELECT cl FROM CallLog cl " +
           "LEFT JOIN FETCH cl.staff " +
           "LEFT JOIN FETCH cl.client " +
           "LEFT JOIN FETCH cl.order " +
           "WHERE cl.staff.id = :staffId " +
           "ORDER BY cl.calledAt DESC")
    Page<CallLog> findByStaffId(@Param("staffId") Long staffId, Pageable pageable);

    @Query("SELECT cl FROM CallLog cl " +
           "LEFT JOIN FETCH cl.staff " +
           "LEFT JOIN FETCH cl.client " +
           "LEFT JOIN FETCH cl.order " +
           "WHERE cl.client.id = :clientId " +
           "ORDER BY cl.calledAt DESC")
    Page<CallLog> findByClientId(@Param("clientId") Long clientId, Pageable pageable);
}

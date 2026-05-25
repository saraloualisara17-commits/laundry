package com.wash.laundry_app.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT a FROM AuditLog a LEFT JOIN FETCH a.user WHERE a.entityType = :entityType AND a.entityId = :entityId ORDER BY a.timestamp DESC")
    List<AuditLog> findByEntityTypeAndEntityIdOrderByTimestampDesc(@Param("entityType") String entityType,
                                                                    @Param("entityId") Long entityId);

    @Query(value = "SELECT a FROM AuditLog a LEFT JOIN FETCH a.user ORDER BY a.timestamp DESC",
           countQuery = "SELECT COUNT(a) FROM AuditLog a")
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);

    @Query(value = "SELECT a FROM AuditLog a LEFT JOIN FETCH a.user WHERE a.entityType = :entityType AND a.entityId = :entityId ORDER BY a.timestamp DESC",
           countQuery = "SELECT COUNT(a) FROM AuditLog a WHERE a.entityType = :entityType AND a.entityId = :entityId")
    Page<AuditLog> findByEntityTypeAndEntityId(@Param("entityType") String entityType,
                                               @Param("entityId") Long entityId,
                                               Pageable pageable);

    @Modifying
    @Query("DELETE FROM AuditLog a WHERE a.timestamp < :before")
    int deleteOlderThan(@Param("before") LocalDateTime before);
}

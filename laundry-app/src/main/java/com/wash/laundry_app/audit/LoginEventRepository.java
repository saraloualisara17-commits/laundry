package com.wash.laundry_app.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface LoginEventRepository extends JpaRepository<LoginEvent, Long> {

    /** Count recent failed attempts from a given IP — used for brute-force detection. */
    @Query("SELECT COUNT(e) FROM LoginEvent e " +
           "WHERE e.ipAddress = :ip AND e.success = false AND e.createdAt >= :since")
    long countRecentFailuresByIp(@Param("ip") String ip, @Param("since") LocalDateTime since);

    /** Count recent failed attempts for a specific email — per-account lockout. */
    @Query("SELECT COUNT(e) FROM LoginEvent e " +
           "WHERE e.email = :email AND e.success = false AND e.createdAt >= :since")
    long countRecentFailuresByEmail(@Param("email") String email, @Param("since") LocalDateTime since);

    /** Cleanup: delete events older than the retention window. */
    @Modifying
    @Query("DELETE FROM LoginEvent e WHERE e.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}

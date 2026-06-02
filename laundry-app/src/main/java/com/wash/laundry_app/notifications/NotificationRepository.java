package com.wash.laundry_app.notifications;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

    long countByRecipientIdAndReadFalse(Long recipientId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipient.id = :recipientId AND n.read = false")
    void markAllAsRead(@Param("recipientId") Long recipientId);

    /**
     * Deduplication guard: returns true if a notification for the same recipient,
     * type, and referenceId was already created within the last {@code windowMinutes} minutes.
     */
    @Query("""
        SELECT COUNT(n) > 0
        FROM Notification n
        WHERE n.recipient.id = :recipientId
          AND n.type = :type
          AND n.referenceId = :referenceId
          AND n.createdAt >= :since
        """)
    boolean existsRecentNotification(
        @Param("recipientId") Long recipientId,
        @Param("type") String type,
        @Param("referenceId") String referenceId,
        @Param("since") LocalDateTime since
    );
}

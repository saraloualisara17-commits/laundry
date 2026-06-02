package com.wash.laundry_app.notifications;

import com.wash.laundry_app.users.Role;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    /** Suppress duplicate notifications for the same (recipient, type, referenceId) within this window. */
    private static final int DEDUP_WINDOW_MINUTES = 5;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PushNotificationService pushNotificationService;

    @Transactional
    public Notification createNotification(User recipient, String title, String message, String type, String referenceId) {
        // Suppress duplicate notifications created within the dedup window
        if (referenceId != null && notificationRepository.existsRecentNotification(
                recipient.getId(), type, referenceId,
                LocalDateTime.now().minusMinutes(DEDUP_WINDOW_MINUTES))) {
            log.debug("Suppressed duplicate notification type={} referenceId={} for user {}", type, referenceId, recipient.getEmail());
            return null;
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .read(false)
                .build();
        Notification saved = notificationRepository.save(notification);

        // WebSocket broadcast
        pushWebSocketNotification(saved);

        // Push notification (Expo) — runs asynchronously; never blocks this thread
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("type", type);
        data.put("referenceId", referenceId);
        pushNotificationService.sendPushNotification(recipient, title, message, data);

        return saved;
    }

    private void pushWebSocketNotification(Notification notification) {
        if (notification.getRecipient() == null) return;
        
        NotificationDTO dto = NotificationDTO.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .referenceId(notification.getReferenceId())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
        
        // Send to /user/{userId}/queue/notifications
        messagingTemplate.convertAndSendToUser(
            notification.getRecipient().getId().toString(), 
            "/queue/notifications", 
            dto
        );
    }

    @Async
    @Transactional
    public void notifyRole(Role role, String title, String message, String type, String referenceId) {
        List<User> users = userRepository.findByRole(role);
        for (User user : users) {
            createNotification(user, title, message, type, referenceId);
        }
    }

    private static final int NOTIFICATION_PAGE_SIZE = 50;

    @Transactional(readOnly = true)
    public List<Notification> getNotificationsForUser(Long userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                userId, PageRequest.of(0, NOTIFICATION_PAGE_SIZE));
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByRecipientIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getRecipient() != null && !n.getRecipient().getId().equals(userId)) {
                throw new com.wash.laundry_app.command.ForbiddenOperationException("Vous n'êtes pas autorisé à modifier cette notification.");
            }
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }
}

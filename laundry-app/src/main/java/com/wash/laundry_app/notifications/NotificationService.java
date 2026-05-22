package com.wash.laundry_app.notifications;

import com.wash.laundry_app.users.Role;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PushNotificationService pushNotificationService;

    @Transactional
    public Notification createNotification(User recipient, String title, String message, String type, String referenceId) {
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
        
        // Push notification (Expo)
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

    @Transactional
    public void notifyRole(Role role, String title, String message, String type, String referenceId) {
        List<User> users = userRepository.findByRole(role);
        for (User user : users) {
            createNotification(user, title, message, type, referenceId);
        }
    }

    @Transactional(readOnly = true)
    public List<Notification> getNotificationsForUser(Long userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
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

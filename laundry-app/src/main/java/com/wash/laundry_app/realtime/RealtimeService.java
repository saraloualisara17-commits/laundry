package com.wash.laundry_app.realtime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@AllArgsConstructor
public class RealtimeService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcastOrderEvent(String type, Long orderId, Object data) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", orderId);
        payload.put("payload", data);

        RealtimeEvent event = RealtimeEvent.builder()
                .type(type)
                .data(payload)
                .timestamp(System.currentTimeMillis())
                .build();
        
        messagingTemplate.convertAndSend("/topic/orders", event);
    }

    public void sendToUser(Long userId, String type, Object data) {
        RealtimeEvent event = RealtimeEvent.builder()
                .type(type)
                .data(data)
                .timestamp(System.currentTimeMillis())
                .build();
        
        messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/events", event);
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RealtimeEvent {
        private String type;
        private Object data;
        private long timestamp;
    }
}

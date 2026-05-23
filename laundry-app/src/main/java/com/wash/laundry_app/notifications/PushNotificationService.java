package com.wash.laundry_app.notifications;

import com.wash.laundry_app.users.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    public void sendPushNotification(User user, String title, String body, Map<String, Object> data) {
        String expoToken = user.getExpoPushToken();
        if (expoToken == null || expoToken.isEmpty()) {
            log.debug("User {} has no expo push token, skipping push", user.getEmail());
            return;
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("to", expoToken);
            payload.put("title", title);
            payload.put("body", body);
            payload.put("sound", "default");
            
            if (data != null) {
                payload.put("data", data);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);
            
            log.info("Push notification sent to user {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send push notification to user {}", user.getEmail(), e);
        }
    }
}

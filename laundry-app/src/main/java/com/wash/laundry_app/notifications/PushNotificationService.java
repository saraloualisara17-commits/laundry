package com.wash.laundry_app.notifications;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Sends a push notification to a single user asynchronously.
     * Runs on the async task executor so it never blocks the AFTER_COMMIT listener thread.
     * Invalid/expired tokens are cleared from the user record to prevent future attempts.
     */
    @Async
    public void sendPushNotification(User user, String title, String body, Map<String, Object> data) {
        String expoToken = user.getExpoPushToken();
        if (expoToken == null || expoToken.isBlank()) {
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
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            // Required by Expo Push API to receive structured error responses
            headers.set("Accept-Encoding", "gzip, deflate");

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                handleExpoResponse(user, response.getBody());
            } else {
                log.warn("Expo push returned non-2xx status {} for user {}", response.getStatusCode(), user.getEmail());
            }
        } catch (Exception e) {
            log.error("Failed to send push notification to user {}: {}", user.getEmail(), e.getMessage());
        }
    }

    /**
     * Parses the Expo push receipt. If the token is invalid or not registered,
     * clears it from the user record so we stop wasting calls.
     */
    private void handleExpoResponse(User user, String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode dataNode = root.path("data");

            String status = dataNode.path("status").asText();
            String errorCode = dataNode.path("details").path("error").asText();

            if ("error".equals(status)) {
                log.warn("Expo push error for user {}: {} — {}", user.getEmail(), status, errorCode);

                if ("DeviceNotRegistered".equals(errorCode) || "InvalidCredentials".equals(errorCode)) {
                    log.info("Clearing invalid push token for user {}", user.getEmail());
                    userRepository.findById(user.getId()).ifPresent(u -> {
                        u.setExpoPushToken(null);
                        userRepository.save(u);
                    });
                }
            } else {
                log.debug("Push notification delivered to user {}", user.getEmail());
            }
        } catch (Exception e) {
            log.debug("Could not parse Expo push receipt for user {}: {}", user.getEmail(), e.getMessage());
        }
    }
}

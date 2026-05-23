package com.wash.laundry_app.users;

import com.wash.laundry_app.users.services.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@AllArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserDto> createUser(
            @Valid @RequestBody UserRegisterRequest request,
            UriComponentsBuilder uriBuilder) {
        return userService.createUser(request, uriBuilder);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDto> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getSingleUser(id));
    }

    @GetMapping("/active")
    public ResponseEntity<List<UserDto>> getActiveUsers() {
        return ResponseEntity.ok(userService.getAllActiveUsers());
    }

    @GetMapping("/inactive")
    public ResponseEntity<List<UserDto>> getInactiveUsers() {
        return ResponseEntity.ok(userService.getAllInActiveUsers());
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<Void> activateUser(@PathVariable Long id) {
        userService.activateUser(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<Void> changePassword(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        userService.changePassword(id, request.get("password"));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/push-token")
    public ResponseEntity<Void> registerPushToken(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        userService.registerPushToken(id, request.get("token"));
        return ResponseEntity.noContent().build();
    }
}

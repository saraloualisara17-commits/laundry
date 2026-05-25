package com.wash.laundry_app.users.services;

import com.wash.laundry_app.users.*;
import com.wash.laundry_app.audit.AuditService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@Service
@AllArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final com.wash.laundry_app.auth.AuthService authService;
    private final AuditService auditService;

    public User getByEmail(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new InvalidCredentialsException("Utilisateur non trouvé"));
    }

    public User getByIdEntity(Long id) {
        return userRepository.findById(id).orElseThrow(UserNotFoundException::new);
    }

    @Transactional
    public ResponseEntity<UserDto> createUser(UserRegisterRequest request, UriComponentsBuilder uriBuilder) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new InvalidCredentialsException("Cet email est déjà utilisé.");
        }
        var user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole(request.getRole());
        userRepository.save(user);
        auditService.log("USER_CREATED", "USER", user.getId(),
                null, "Email: " + user.getEmail() + " | Role: " + user.getRole(), null);
        var userDto = userMapper.toDto(user);
        var uri = uriBuilder.path("/api/users/{id}").buildAndExpand(userDto.getId()).toUri();
        return ResponseEntity.created(uri).body(userDto);
    }

    @Transactional
    public UserDto updateUser(Long id, UpdateUserRequest request) {
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        String previous = "Name: " + user.getName() + " | Phone: " + user.getPhone();
        userMapper.updateUser(request, user);
        userRepository.save(user);
        auditService.log("USER_UPDATED", "USER", id, previous,
                "Name: " + user.getName() + " | Phone: " + user.getPhone(), null);
        return userMapper.toDto(user);
    }

    public UserDto getSingleUser(Long id) {
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        return userMapper.toDto(user);
    }

    @Transactional(readOnly = true)
    public List<UserDto> getAllActiveUsers() {
        var currentUser = authService.currentUser();
        var users = userRepository.findAllActive();

        if (currentUser != null && currentUser.getRole() == Role.EMPLOYE) {
            return users.stream()
                    .filter(u -> u.getRole() == Role.ADMIN || u.getRole() == Role.LIVREUR)
                    .map(userMapper::toDto)
                    .toList();
        }

        return users.stream().map(userMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<UserDto> getAllInActiveUsers() {
        return userRepository.findAllInActive().stream().map(userMapper::toDto).toList();
    }

    @Transactional
    public void deactivateUser(Long id) {
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        if (user.getRole() == Role.ADMIN) {
            throw new RuntimeException("Impossible de désactiver un compte administrateur.");
        }
        user.setIsActive(false);
        userRepository.save(user);
        auditService.log("USER_DEACTIVATED", "USER", id,
                "active", "inactive", "Email: " + user.getEmail());
    }

    @Transactional
    public void activateUser(Long id) {
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        if (user.getRole() == Role.ADMIN) {
            throw new RuntimeException("L'administrateur est déjà actif.");
        }
        user.setIsActive(true);
        userRepository.save(user);
        auditService.log("USER_ACTIVATED", "USER", id,
                "inactive", "active", "Email: " + user.getEmail());
    }

    @Transactional
    public void deleteUser(Long id) {
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        if (user.getRole() == Role.ADMIN || user.getIsActive()) {
            throw new RuntimeException("Impossible de supprimer un compte administrateur ou un utilisateur actif.");
        }
        auditService.log("USER_DELETED", "USER", id,
                "Email: " + user.getEmail() + " | Role: " + user.getRole(), null, null);
        userRepository.delete(user);
    }

    @Transactional
    public void changePassword(Long id, String newPassword) {
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        auditService.log("USER_PASSWORD_CHANGED", "USER", id,
                null, null, "Email: " + user.getEmail());
    }

    @Transactional
    public void registerPushToken(Long id, String token) {
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        user.setExpoPushToken(token);
        userRepository.save(user);
    }
}

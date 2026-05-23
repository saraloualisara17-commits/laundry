package com.wash.laundry_app.users;


import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class SecurityCompatibilityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User admin;
    private User employe;
    private User livreur;

    @BeforeEach
    void setup() {
        admin = new User();
        admin.setEmail("admin-sec@test.com");
        admin.setPassword(passwordEncoder.encode("password"));
        admin.setRole(Role.ADMIN);
        admin.setIsActive(true);
        admin.setName("Admin Sec");
        admin.setPhone("0600000003");
        userRepository.save(admin);

        employe = new User();
        employe.setEmail("employe-sec@test.com");
        employe.setPassword(passwordEncoder.encode("password"));
        employe.setRole(Role.EMPLOYE);
        employe.setIsActive(true);
        employe.setName("Employe Sec");
        employe.setPhone("0600000004");
        userRepository.save(employe);

        livreur = new User();
        livreur.setEmail("livreur-sec@test.com");
        livreur.setPassword(passwordEncoder.encode("password"));
        livreur.setRole(Role.LIVREUR);
        livreur.setIsActive(true);
        livreur.setName("Livreur Sec");
        livreur.setPhone("0600000005");
        userRepository.save(livreur);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor mockUser(User user) {
        return authentication(new UsernamePasswordAuthenticationToken(
                user.getId(), null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))));
    }

    @Test
    void testAdminAccess() throws Exception {
        // Admin should access /admin/active-users
        mockMvc.perform(get("/api/admin/active-users")
                .with(mockUser(admin)))
                .andExpect(status().isOk());

        // Employe should be forbidden from /admin/active-users
        mockMvc.perform(get("/api/admin/active-users")
                .with(mockUser(employe)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testEmployeAccess() throws Exception {
        // Employe should access /employe/commandes
        mockMvc.perform(get("/employe/commandes")
                .with(mockUser(employe)))
                .andExpect(status().isOk());
    }

    @Test
    void testLivreurAccess() throws Exception {
        // Livreur should access /livreur/commandes/ready
        mockMvc.perform(get("/api/livreur/commandes/ready")
                .with(mockUser(livreur)))
                .andExpect(status().isOk());

        // Employe should be forbidden
        mockMvc.perform(get("/api/livreur/commandes/ready")
                .with(mockUser(employe)))
                .andExpect(status().isForbidden());
    }
}

package com.wash.laundry_app.command;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wash.laundry_app.users.Role;
import com.wash.laundry_app.users.User;
import com.wash.laundry_app.users.UserRepository;
import com.wash.laundry_app.clients.Client;
import com.wash.laundry_app.clients.ClientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;

import java.math.BigDecimal;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class OrderWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CommandeRepository commandeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private User admin;
    private User livreur;
    private Client client;
    private Commande commande;

    @BeforeEach
    void setup() {
        admin = new User();
        admin.setEmail("admin@test.com");
        admin.setPassword(passwordEncoder.encode("password"));
        admin.setRole(Role.ADMIN);
        admin.setIsActive(true);
        admin.setName("Admin Test");
        admin.setPhone("0600000000");
        userRepository.save(admin);

        livreur = new User();
        livreur.setEmail("livreur@test.com");
        livreur.setPassword(passwordEncoder.encode("password"));
        livreur.setRole(Role.LIVREUR);
        livreur.setIsActive(true);
        livreur.setName("Livreur Test");
        livreur.setPhone("0600000001");
        userRepository.save(livreur);

        client = new Client();
        client.setName("Client Test");
        client.setCreatedBy(livreur);
        clientRepository.save(client);

        commande = new Commande();
        commande.setClient(client);
        commande.setStatus(CommandeStatus.PENDING_PICKUP);
        commande.setMontantTotal(new BigDecimal("100.00"));
        commandeRepository.save(commande);
    }

    private SecurityMockMvcRequestPostProcessors.OAuth2LoginRequestPostProcessor mockAuth(User user) {
        // Not using OAuth2, just a custom Authentication
        return null;
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor mockUser(User user) {
        return authentication(new UsernamePasswordAuthenticationToken(
                user.getId(), null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))));
    }

    @Test
    void testValidStatusTransition() throws Exception {
        UpdateCommandeStatusRequest request = new UpdateCommandeStatusRequest();
        request.setStatus(CommandeStatus.PICKED_UP);

        mockMvc.perform(patch("/api/commandes/" + commande.getId() + "/status")
                .with(mockUser(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PICKED_UP"));

        Commande updated = commandeRepository.findById(commande.getId()).orElseThrow();
        assertEquals(CommandeStatus.PICKED_UP, updated.getStatus());
    }

    @Test
    void testInvalidStatusTransitionRejected() throws Exception {
        // PENDING_PICKUP cannot jump straight to DELIVERED
        UpdateCommandeStatusRequest request = new UpdateCommandeStatusRequest();
        request.setStatus(CommandeStatus.DELIVERED);

        mockMvc.perform(patch("/api/commandes/" + commande.getId() + "/status")
                .with(mockUser(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void testCancellationFlow() throws Exception {
        mockMvc.perform(put("/api/commandes/" + commande.getId() + "/cancel")
                .with(mockUser(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        Commande updated = commandeRepository.findById(commande.getId()).orElseThrow();
        assertEquals(CommandeStatus.CANCELLED, updated.getStatus());
    }

    @Test
    void testWorkflowAuthorizationRules() throws Exception {
        // Delivery driver tries to update status of an order they don't own
        UpdateCommandeStatusRequest request = new UpdateCommandeStatusRequest();
        request.setStatus(CommandeStatus.PICKED_UP);

        mockMvc.perform(patch("/api/commandes/" + commande.getId() + "/status")
                .with(mockUser(livreur))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}

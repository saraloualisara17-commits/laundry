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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class PaymentIntegrationTest {

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
    private Commande commande;

    @BeforeEach
    void setup() {
        admin = new User();
        admin.setEmail("admin-pay@test.com");
        admin.setPassword(passwordEncoder.encode("password"));
        admin.setRole(Role.ADMIN);
        admin.setIsActive(true);
        admin.setName("Admin Pay");
        admin.setPhone("0600000002");
        userRepository.save(admin);

        Client client = new Client();
        client.setName("Client Pay");
        client.setCreatedBy(admin); // Admin works
        clientRepository.save(client);

        commande = new Commande();
        commande.setClient(client);
        commande.setStatus(CommandeStatus.PICKED_UP);
        commande.setMontantTotal(new BigDecimal("100.00"));
        commande.setMontantPaye(BigDecimal.ZERO);
        commandeRepository.save(commande);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor mockUser(User user) {
        return authentication(new UsernamePasswordAuthenticationToken(
                user.getId(), null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))));
    }

    @Test
    void testPartialPaymentRecording() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest();
        request.setMontant(new BigDecimal("40.00"));
        request.setModePaiement(ModePaiement.ESPECES);
        request.setNote("Partial payment");

        mockMvc.perform(post("/api/commandes/" + commande.getId() + "/payments")
                .with(mockUser(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        Commande updated = commandeRepository.findById(commande.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("40.00").compareTo(updated.getMontantPaye()));
        // unpaid balance = 60
    }

    @Test
    void testFullPaymentRecording() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest();
        request.setMontant(new BigDecimal("100.00"));
        request.setModePaiement(ModePaiement.CARTE);

        mockMvc.perform(post("/api/commandes/" + commande.getId() + "/payments")
                .with(mockUser(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        Commande updated = commandeRepository.findById(commande.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("100.00").compareTo(updated.getMontantPaye()));
    }

    @Test
    void testOverpaymentRejected() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest();
        request.setMontant(new BigDecimal("150.00")); // exceeds 100.00
        request.setModePaiement(ModePaiement.ESPECES);

        mockMvc.perform(post("/api/commandes/" + commande.getId() + "/payments")
                .with(mockUser(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}

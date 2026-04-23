package com.wash.laundry_app.users.lvreur;

import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.clients.*;
import com.wash.laundry_app.command.CommandeRepository;
import com.wash.laundry_app.command.ForbiddenOperationException;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@AllArgsConstructor
public class LivreurService {

    private final ClientRepository clientRepository;
    private final ClientMapper clientMapper;
    private final AuthService authService;
    private final CommandeRepository commandeRepository;

    // Find pending client
    @Transactional(readOnly = true)
    public Optional<ClientDto> getMyPendingClient() {
        var user = authService.currentUser();
        return clientRepository.findPendingClientByLivreur(user.getId())
                .map(clientMapper::toDto);
    }

    // Create new client
    @Transactional
    public ClientDto createClient(ClientRegisterRequest request) {
        var user = authService.currentUser();

        if (request.getPhones() != null && !request.getPhones().isEmpty()) {
            String firstPhone = request.getPhones().get(0).getPhoneNumber();
            if (clientRepository.existsByPhone(firstPhone)) {
                throw new ClientExistException("Un client avec ce numéro existe déjà: " + firstPhone);
            }
        }

        Optional<Client> pendingClient = clientRepository.findPendingClientByLivreur(user.getId());

        if (pendingClient.isPresent()) {
            throw new PendingClientExistsException(
                    "Vous avez déjà un client en attente: " + pendingClient.get().getName() +
                            ". Créez une commande pour ce client avant d'en ajouter un nouveau."
            );
        }

        Client newClient = clientMapper.toEntity(request);
        newClient.setCreatedByLivreur(user);

        // Bi-directional mapping logic
        if (newClient.getPhones() != null) {
            newClient.getPhones().forEach(phone -> phone.setClient(newClient));
        }
        if (newClient.getAddresses() != null) {
            newClient.getAddresses().forEach(address -> address.setClient(newClient));
        }

        Client savedClient = clientRepository.save(newClient);

        return clientMapper.toDto(savedClient);
    }

    // Search by phone
    @Transactional(readOnly = true)
    public Optional<ClientDto> findByPhone(String phone) {
        return clientRepository.findByPhone(phone)
                .map(clientMapper::toDto);
    }

    // Delete client (only if no orders)
    @Transactional
    public void deletePendingClient(Long clientId) {
        var user = authService.currentUser();
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ClientNotFoundException("Client non trouvé"));

        // Check ownership
        if (!client.getCreatedByLivreur().getId().equals(user.getId())) {
            throw new ForbiddenOperationException("Vous ne pouvez pas supprimer ce client");
        }

        // Check if has orders
        if (commandeRepository.existsByClientId(clientId)) {
            throw new ForbiddenOperationException("Ce client a déjà des commandes");
        }

        clientRepository.delete(client);
    }
}
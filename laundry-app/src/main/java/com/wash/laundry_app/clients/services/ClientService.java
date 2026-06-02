package com.wash.laundry_app.clients.services;

import com.wash.laundry_app.clients.*;
import com.wash.laundry_app.command.CommandeDTO;
import com.wash.laundry_app.command.CommandeMapper;
import com.wash.laundry_app.command.CommandeRepository;
import com.wash.laundry_app.command.ForbiddenOperationException;
import com.wash.laundry_app.auth.AuthService;
import com.wash.laundry_app.audit.AuditService;
import com.wash.laundry_app.users.admin.ClientStatisticsDto;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final ClientMapper clientMapper;
    private final CommandeRepository commandeRepository;
    private final CommandeMapper commandeMapper;
    private final AuthService authService;
    private final AuditService auditService;

    @Transactional
    public ClientDto createClient(ClientRegisterRequest request) {
        var user = authService.currentUser();
        var client = clientMapper.toEntity(request);
        
        client.setCreatedBy(user);
        
        // Link phones and addresses
        if (client.getPhones() != null) {
            client.getPhones().forEach(phone -> phone.setClient(client));
        }
        if (client.getAddresses() != null) {
            client.getAddresses().forEach(address -> address.setClient(client));
        }
        
        clientRepository.save(client);
        return clientMapper.toDto(client);
    }

    @Transactional
    public ClientDto updateClient(Long id, ClientRegisterRequest request) {
        var client = clientRepository.findById(id).orElseThrow(() -> new ClientNotFoundException("Client non trouvé"));
        String previous = "Name: " + client.getName() + " | Email: " + client.getEmail();
        clientMapper.updateEntity(request, client);

        // Re-link phones and addresses if they were updated/replaced
        if (client.getPhones() != null) {
            client.getPhones().forEach(phone -> phone.setClient(client));
        }
        if (client.getAddresses() != null) {
            client.getAddresses().forEach(address -> address.setClient(client));
        }

        clientRepository.save(client);
        auditService.log("CLIENT_UPDATED", "CLIENT", id, previous,
                "Name: " + client.getName() + " | Email: " + client.getEmail(), null);
        return clientMapper.toDto(client);
    }

    @Transactional(readOnly = true)
    public ClientDto getClientById(Long id) {
        Client client = clientRepository.findById(id).orElseThrow(() -> new ClientNotFoundException("Client non trouvé"));
        return clientMapper.toDto(client);
    }

    @Transactional(readOnly = true)
    public List<ClientDto> getClientsFiltered(String search) {
        String searchParam = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        List<Client> list = clientRepository.findBySearchTerm(searchParam);
        Map<Long, Object[]> statsMap = buildClientStatsMap(list);
        return list.stream().map(client -> {
            ClientDto dto = clientMapper.toDto(client);
            applyClientStats(statsMap, client.getId(), dto);
            return dto;
        }).toList();
    }

    private Map<Long, Object[]> buildClientStatsMap(List<Client> clients) {
        if (clients.isEmpty()) return java.util.Collections.emptyMap();
        List<Long> ids = clients.stream().map(Client::getId).toList();
        return commandeRepository.findOrderStatsByClientIds(ids)
                .stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> row));
    }

    private void applyClientStats(Map<Long, Object[]> statsMap, Long clientId, ClientDto dto) {
        Object[] row = statsMap.get(clientId);
        if (row != null) {
            dto.setTotalCommandes(((Number) row[1]).longValue());
            if (row[2] instanceof java.sql.Timestamp ts) {
                dto.setLastOrderDate(ts.toLocalDateTime());
            } else if (row[2] instanceof java.time.LocalDateTime ldt) {
                dto.setLastOrderDate(ldt);
            }
        } else {
            dto.setTotalCommandes(0L);
        }
    }

    @Transactional(readOnly = true)
    public ClientStatisticsDto getClientStatistics() {
        long totalClients = clientRepository.countAll();

        java.time.LocalDateTime startOfMonth = java.time.YearMonth.now().atDay(1).atStartOfDay();
        java.time.LocalDateTime startOfNextMonth = java.time.YearMonth.now().plusMonths(1).atDay(1).atStartOfDay();

        long nouveauxCeMois = clientRepository.countCreatedBetween(startOfMonth, startOfNextMonth);
        long commandesCeMois = commandeRepository.countCommandesInPeriod(startOfMonth, startOfNextMonth);

        double pourcentageNouveaux = totalClients == 0 ? 0 : (double) nouveauxCeMois / totalClients * 100;

        return ClientStatisticsDto.builder()
                .totalClients(totalClients)
                .commandesCeMois(commandesCeMois)
                .nouveauxCeMois(nouveauxCeMois)
                .pourcentageNouveaux(pourcentageNouveaux)
                .build();
    }

    @Transactional(readOnly = true)
    public List<CommandeDTO> getClientCommandes(Long clientId) {
        return commandeRepository.findByClientId(clientId).stream().map(commandeMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Optional<ClientDto> findByPhone(String phone) {
        return clientRepository.findByPhone(phone)
                .map(clientMapper::toDto);
    }
}

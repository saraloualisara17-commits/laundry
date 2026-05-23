package com.wash.laundry_app.unpaid;

import com.wash.laundry_app.clients.ClientPhone;
import com.wash.laundry_app.clients.ClientPhoneRepository;
import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.command.CommandeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UnpaidService {

    private final CommandeRepository commandeRepository;
    private final ClientPhoneRepository clientPhoneRepository;

    @Transactional(readOnly = true)
    public UnpaidOverviewDto getOverview() {
        List<Commande> unpaidOrders = commandeRepository.findAllWithUnpaidBalance();
        
        long totalOrders = unpaidOrders.size();
        BigDecimal totalAmount = unpaidOrders.stream()
                .map(Commande::getMontantTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        BigDecimal totalPaid = unpaidOrders.stream()
                .map(c -> c.getMontantPaye() != null ? c.getMontantPaye() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        BigDecimal totalRemaining = totalAmount.subtract(totalPaid);
        long clientsWithDebt = commandeRepository.countClientsWithDebt();

        return UnpaidOverviewDto.builder()
                .totalOrders(totalOrders)
                .totalAmount(totalAmount)
                .totalPaid(totalPaid)
                .totalRemaining(totalRemaining)
                .clientsWithDebt(clientsWithDebt)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ClientDebtDto> getClientDebtList() {
        List<Object[]> summary = commandeRepository.findClientDebtSummary();
        return summary.stream().map(row -> {
            Long clientId = (Long) row[0];
            String name = (String) row[1];
            Long orderCount = (Long) row[2];
            BigDecimal totalAmount = (BigDecimal) row[3];
            BigDecimal totalPaid = (BigDecimal) row[4];
            BigDecimal totalRemaining = (BigDecimal) row[5];

            String phone = clientPhoneRepository.findFirstByClientId(clientId)
                    .map(ClientPhone::getPhoneNumber)
                    .orElse(null);

            return ClientDebtDto.builder()
                    .clientId(clientId)
                    .clientName(name)
                    .clientPhone(phone)
                    .orderCount(orderCount)
                    .totalAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO)
                    .totalPaid(totalPaid != null ? totalPaid : BigDecimal.ZERO)
                    .totalRemaining(totalRemaining != null ? totalRemaining : BigDecimal.ZERO)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ClientDebtDto getClientDebtDetail(Long clientId) {
        List<Commande> orders = commandeRepository.findUnpaidByClient(clientId);
        if (orders.isEmpty()) {
            return null; // or throw exception
        }

        Commande firstOrder = orders.get(0);
        String name = firstOrder.getClient() != null ? firstOrder.getClient().getName() : "Inconnu";
        String phone = clientPhoneRepository.findFirstByClientId(clientId)
                .map(ClientPhone::getPhoneNumber)
                .orElse(null);

        long orderCount = orders.size();
        BigDecimal totalAmount = orders.stream()
                .map(Commande::getMontantTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid = orders.stream()
                .map(c -> c.getMontantPaye() != null ? c.getMontantPaye() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRemaining = totalAmount.subtract(totalPaid);

        List<UnpaidOrderDto> orderDtos = orders.stream()
                .map(this::mapToUnpaidOrderDto)
                .collect(Collectors.toList());

        return ClientDebtDto.builder()
                .clientId(clientId)
                .clientName(name)
                .clientPhone(phone)
                .orderCount(orderCount)
                .totalAmount(totalAmount)
                .totalPaid(totalPaid)
                .totalRemaining(totalRemaining)
                .orders(orderDtos)
                .build();
    }

    @Transactional(readOnly = true)
    public List<UnpaidOrderDto> getAllUnpaidOrders(Long clientId) {
        List<Commande> orders;
        if (clientId != null) {
            orders = commandeRepository.findUnpaidByClient(clientId);
        } else {
            orders = commandeRepository.findAllWithUnpaidBalance();
        }
        return orders.stream()
                .map(this::mapToUnpaidOrderDto)
                .collect(Collectors.toList());
    }

    private UnpaidOrderDto mapToUnpaidOrderDto(Commande c) {
        BigDecimal total = c.getMontantTotal() != null ? c.getMontantTotal() : BigDecimal.ZERO;
        BigDecimal paid = c.getMontantPaye() != null ? c.getMontantPaye() : BigDecimal.ZERO;
        BigDecimal remaining = total.subtract(paid);
        
        int itemCount = c.getCommandeTapis() != null ? c.getCommandeTapis().size() : 0;
        String livreurName = c.getLivreur() != null ? c.getLivreur().getName() : null;

        return UnpaidOrderDto.builder()
                .orderId(c.getId())
                .reference(c.getNumeroCommande())
                .status(c.getStatus() != null ? c.getStatus().name() : null)
                .montantTotal(total)
                .montantPaye(paid)
                .montantRestant(remaining)
                .dateCreation(c.getDateCreation())
                .itemCount(itemCount)
                .livreurName(livreurName)
                .build();
    }
}

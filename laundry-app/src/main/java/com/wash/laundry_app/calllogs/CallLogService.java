package com.wash.laundry_app.calllogs;

import com.wash.laundry_app.clients.Client;
import com.wash.laundry_app.clients.ClientRepository;
import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.command.CommandeRepository;
import com.wash.laundry_app.users.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CallLogService {

    private final CallLogRepository callLogRepository;
    private final ClientRepository clientRepository;
    private final CommandeRepository commandeRepository;

    private static final int PAGE_SIZE = 30;

    @Transactional
    public CallLogDTO logCall(User staff, Long clientId, Long orderId, String phoneNumber, String callType) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found: " + clientId));

        Commande order = null;
        if (orderId != null) {
            order = commandeRepository.findById(orderId).orElse(null);
        }

        CallLog log = CallLog.builder()
                .staff(staff)
                .client(client)
                .order(order)
                .phoneNumber(phoneNumber)
                .callType(CallLog.CallType.valueOf(callType.toUpperCase()))
                .build();

        return toDto(callLogRepository.save(log));
    }

    @Transactional(readOnly = true)
    public Page<CallLogDTO> getAllLogs(int page) {
        return callLogRepository.findAllWithDetails(PageRequest.of(page, PAGE_SIZE))
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<CallLogDTO> getLogsByClient(Long clientId, int page) {
        return callLogRepository.findByClientId(clientId, PageRequest.of(page, PAGE_SIZE))
                .map(this::toDto);
    }

    private CallLogDTO toDto(CallLog cl) {
        return CallLogDTO.builder()
                .id(cl.getId())
                .staff(CallLogDTO.StaffInfo.builder()
                        .id(cl.getStaff().getId())
                        .name(cl.getStaff().getName())
                        .role(cl.getStaff().getRole().name())
                        .build())
                .client(CallLogDTO.ClientInfo.builder()
                        .id(cl.getClient().getId())
                        .name(cl.getClient().getName())
                        .build())
                .orderId(cl.getOrder() != null ? cl.getOrder().getId() : null)
                .orderStatus(cl.getOrder() != null ? cl.getOrder().getStatus().name() : null)
                .orderTotal(cl.getOrder() != null ? cl.getOrder().getMontantTotal() : null)
                .phoneNumber(cl.getPhoneNumber())
                .callType(cl.getCallType().name())
                .calledAt(cl.getCalledAt())
                .build();
    }
}

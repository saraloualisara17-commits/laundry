package com.wash.laundry_app.clients;

import com.wash.laundry_app.clients.services.ClientService;
import com.wash.laundry_app.command.CommandeDTO;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
@AllArgsConstructor
public class ClientController {

    private final ClientService clientService;

    @PostMapping
    public ResponseEntity<ClientDto> createClient(@Valid @RequestBody ClientRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clientService.createClient(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClientDto> updateClient(
            @PathVariable Long id,
            @Valid @RequestBody ClientRegisterRequest request) {
        return ResponseEntity.ok(clientService.updateClient(id, request));
    }

    @GetMapping
    public ResponseEntity<List<ClientDto>> getClients(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(clientService.getClientsFiltered(search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientDto> getClient(@PathVariable Long id) {
        return ResponseEntity.ok(clientService.getClientById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<ClientDto> searchByPhone(@RequestParam String phone) {
        return clientService.findByPhone(phone)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/commandes")
    public ResponseEntity<List<CommandeDTO>> getClientCommandes(@PathVariable Long id) {
        return ResponseEntity.ok(clientService.getClientCommandes(id));
    }
}

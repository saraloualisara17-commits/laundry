package com.wash.laundry_app.clients;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClientPhoneRepository extends JpaRepository<ClientPhone, Long> {
    java.util.Optional<ClientPhone> findFirstByClientId(Long clientId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM ClientPhone p WHERE p.client.id IN :clientIds ORDER BY p.id ASC")
    java.util.List<ClientPhone> findAllByClientIdIn(
        @org.springframework.data.repository.query.Param("clientIds") java.util.List<Long> clientIds);
}

package com.wash.laundry_app.command.attempts;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderAttemptRepository extends JpaRepository<OrderAttempt, Long> {
    List<OrderAttempt> findByCommandeIdOrderByAttemptedAtDesc(Long commandeId);
}

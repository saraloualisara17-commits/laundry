package com.wash.laundry_app.command;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommandeTapisRepository extends JpaRepository<CommandeTapis, Long> {

    List<CommandeTapis> findByCommandeId(Long commandeId);

    long countByCommandeId(Long commandeId);
}

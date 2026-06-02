package com.wash.laundry_app.clients;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {

    @Query("SELECT c FROM Client c JOIN c.phones p WHERE p.phoneNumber = :phone")
    Optional<Client> findByPhone(@Param("phone") String phone);

    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Client c JOIN c.phones p WHERE p.phoneNumber = :phone")
    boolean existsByPhone(@Param("phone") String phone);

    List<Client> findByNameContainingIgnoreCase(String name);

    @Query("SELECT COUNT(c) FROM Client c WHERE c.createdAt >= :date")
    long countCreatedAfter(@Param("date") java.time.LocalDateTime date);

    @Query("SELECT COUNT(c) FROM Client c")
    long countAll();

    @Query("SELECT COUNT(c) FROM Client c WHERE c.createdAt >= :start AND c.createdAt < :end")
    long countCreatedBetween(@Param("start") java.time.LocalDateTime start,
                             @Param("end") java.time.LocalDateTime end);

    /** Filtered list for the client search endpoint — DB-side search, never loads all clients. */
    @Query("SELECT c FROM Client c WHERE :search IS NULL " +
           "OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR CAST(c.id AS string) LIKE CONCAT('%', :search, '%')")
    List<Client> findBySearchTerm(@Param("search") String search);
}

package com.wash.laundry_app.command;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Repository for CommandeImage — needed so we can archive images during
 * item updates without triggering cascade deletes.
 */
public interface CommandeImageRepository extends JpaRepository<CommandeImage, Long> {

    @Modifying
    @Query("UPDATE CommandeImage img SET img.isArchived = true, img.commandeTapis = null " +
           "WHERE img.commandeTapis.id = :tapisId AND img.isArchived = false")
    void archiveByCommandeTapisId(@Param("tapisId") Long tapisId);
}

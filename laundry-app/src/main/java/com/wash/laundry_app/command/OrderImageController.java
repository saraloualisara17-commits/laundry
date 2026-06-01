package com.wash.laundry_app.command;

import com.wash.laundry_app.command.services.CommandeQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/images")
@RequiredArgsConstructor
public class OrderImageController {

    private final CommandeQueryService commandeQueryService;

    @GetMapping
    public ResponseEntity<Page<OrderImageDTO>> getImages(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateDebut,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFin,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(
                commandeQueryService.getFilteredImages(status, search, dateDebut, dateFin, page, size)
        );
    }
}

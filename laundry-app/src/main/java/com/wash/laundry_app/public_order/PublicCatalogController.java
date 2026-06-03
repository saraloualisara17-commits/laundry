package com.wash.laundry_app.public_order;

import com.wash.laundry_app.catalog.ProductCatalogService;
import com.wash.laundry_app.catalog.dto.CategoryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/catalog")
@RequiredArgsConstructor
public class PublicCatalogController {

    private final ProductCatalogService catalogService;

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryDto>> getActiveCategories() {
        List<CategoryDto> all = catalogService.getAllCategories();
        List<CategoryDto> active = all.stream()
                .filter(c -> Boolean.TRUE.equals(c.getIsActive()))
                .toList();
        return ResponseEntity.ok(active);
    }
}

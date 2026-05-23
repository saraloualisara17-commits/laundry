package com.wash.laundry_app.catalog;

import com.wash.laundry_app.catalog.dto.*;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/catalog")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin') or hasRole('employe') or hasRole('livreur')")
public class ProductCatalogController {

    private final ProductCatalogService catalogService;

    @Data
    @Builder
    @AllArgsConstructor
    public static class ApiResponse<T> {
        private boolean success;
        private T data;
        private String message;
    }

    // --- Categories ---

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<CategoryDto>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.<List<CategoryDto>>builder()
                .success(true)
                .data(catalogService.getAllCategories())
                .message("")
                .build());
    }

    @GetMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<CategoryDto>> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<CategoryDto>builder()
                .success(true)
                .data(catalogService.getCategoryById(id))
                .message("")
                .build());
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<CategoryDto>> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.<CategoryDto>builder()
                .success(true)
                .data(catalogService.createCategory(request))
                .message("Catégorie créée avec succès")
                .build());
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<CategoryDto>> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.<CategoryDto>builder()
                .success(true)
                .data(catalogService.updateCategory(id, request))
                .message("Catégorie mise à jour")
                .build());
    }

    @PatchMapping("/categories/{id}/toggle")
    public ResponseEntity<ApiResponse<CategoryDto>> toggleCategory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<CategoryDto>builder()
                .success(true)
                .data(catalogService.toggleCategory(id))
                .message("Statut de la catégorie mis à jour")
                .build());
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        catalogService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .data(null)
                .message("Catégorie supprimée")
                .build());
    }

    // --- Products ---

    @GetMapping("/categories/{id}/products")
    public ResponseEntity<ApiResponse<List<ProductDto>>> getProductsByCategory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<List<ProductDto>>builder()
                .success(true)
                .data(catalogService.getProductsByCategory(id))
                .message("")
                .build());
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<ProductDto>>> getAllProducts() {
        return ResponseEntity.ok(ApiResponse.<List<ProductDto>>builder()
                .success(true)
                .data(catalogService.getAllProducts())
                .message("")
                .build());
    }

    @PostMapping("/categories/{id}/products")
    public ResponseEntity<ApiResponse<ProductDto>> createProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(ApiResponse.<ProductDto>builder()
                .success(true)
                .data(catalogService.createProduct(id, request))
                .message("Produit créé avec succès")
                .build());
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<ApiResponse<ProductDto>> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(ApiResponse.<ProductDto>builder()
                .success(true)
                .data(catalogService.updateProduct(id, request))
                .message("Produit mis à jour")
                .build());
    }

    @PatchMapping("/products/{id}/toggle")
    public ResponseEntity<ApiResponse<ProductDto>> toggleProduct(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<ProductDto>builder()
                .success(true)
                .data(catalogService.toggleProduct(id))
                .message("Statut du produit mis à jour")
                .build());
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        catalogService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .data(null)
                .message("Produit supprimé")
                .build());
    }
}

package com.wash.laundry_app.catalog;

import com.wash.laundry_app.audit.AuditService;
import com.wash.laundry_app.catalog.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductCatalogService {

    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<CategoryDto> getAllCategories() {
        return categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::mapToCategoryDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CategoryDto getCategoryById(Long id) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
        return mapToCategoryDto(category);
    }

    @Transactional
    public CategoryDto createCategory(CategoryRequest request) {
        ProductCategory category = new ProductCategory();
        if (request.getSortOrder() == null) {
            Integer maxSort = categoryRepository.findAll().stream()
                    .map(ProductCategory::getSortOrder)
                    .max(Integer::compare)
                    .orElse(0);
            category.setSortOrder(maxSort + 1);
        }
        updateCategoryFields(category, request);
        CategoryDto result = mapToCategoryDto(categoryRepository.save(category));
        auditService.log("CATALOG_CATEGORY_CREATED", "PRODUCT_CATEGORY", category.getId(),
                null, "Name: " + category.getNom(), null);
        return result;
    }

    @Transactional
    public CategoryDto updateCategory(Long id, CategoryRequest request) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
        String previous = "Name: " + category.getNom() + " | Active: " + category.getIsActive();
        updateCategoryFields(category, request);
        CategoryDto result = mapToCategoryDto(categoryRepository.save(category));
        auditService.log("CATALOG_CATEGORY_UPDATED", "PRODUCT_CATEGORY", id,
                previous, "Name: " + category.getNom(), null);
        return result;
    }

    @Transactional
    public CategoryDto toggleCategory(Long id) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
        boolean wasActive = Boolean.TRUE.equals(category.getIsActive());
        category.setIsActive(!wasActive);
        CategoryDto result = mapToCategoryDto(categoryRepository.save(category));
        auditService.log("CATALOG_CATEGORY_TOGGLED", "PRODUCT_CATEGORY", id,
                String.valueOf(wasActive), String.valueOf(!wasActive), "Name: " + category.getNom());
        return result;
    }

    @Transactional
    public void deleteCategory(Long id) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));

        if (!category.getProducts().isEmpty()) {
            throw new RuntimeException("Impossible de supprimer: cette catégorie contient des produits");
        }

        auditService.log("CATALOG_CATEGORY_DELETED", "PRODUCT_CATEGORY", id,
                "Name: " + category.getNom(), null, null);
        categoryRepository.delete(category);
    }

    @Transactional(readOnly = true)
    public List<ProductDto> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryIdOrderBySortOrderAsc(categoryId).stream()
                .map(this::mapToProductDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductDto> getAllProducts() {
        return productRepository.findAll().stream()
                .map(this::mapToProductDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductDto createProduct(Long categoryId, ProductRequest request) {
        ProductCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));

        Product product = new Product();
        product.setCategory(category);
        if (request.getSortOrder() == null) {
            Integer maxSort = productRepository.findByCategoryIdOrderBySortOrderAsc(categoryId).stream()
                    .map(Product::getSortOrder)
                    .max(Integer::compare)
                    .orElse(0);
            product.setSortOrder(maxSort + 1);
        }
        updateProductFields(product, request);
        ProductDto result = mapToProductDto(productRepository.save(product));
        auditService.log("CATALOG_PRODUCT_CREATED", "PRODUCT", product.getId(),
                null, "Name: " + product.getNom() + " | Category: " + category.getNom(), null);
        return result;
    }

    @Transactional
    public ProductDto updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit non trouvé"));
        String previous = "Name: " + product.getNom() + " | Price: " + product.getPrixUnitaire();
        updateProductFields(product, request);
        ProductDto result = mapToProductDto(productRepository.save(product));
        auditService.log("CATALOG_PRODUCT_UPDATED", "PRODUCT", id,
                previous, "Name: " + product.getNom() + " | Price: " + product.getPrixUnitaire(), null);
        return result;
    }

    @Transactional
    public ProductDto toggleProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit non trouvé"));
        boolean wasActive = Boolean.TRUE.equals(product.getIsActive());
        product.setIsActive(!wasActive);
        ProductDto result = mapToProductDto(productRepository.save(product));
        auditService.log("CATALOG_PRODUCT_TOGGLED", "PRODUCT", id,
                String.valueOf(wasActive), String.valueOf(!wasActive), "Name: " + product.getNom());
        return result;
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit non trouvé"));
        auditService.log("CATALOG_PRODUCT_DELETED", "PRODUCT", id,
                "Name: " + product.getNom() + " | Category: " + product.getCategory().getNom(), null, null);
        productRepository.delete(product);
    }

    private void updateCategoryFields(ProductCategory category, CategoryRequest request) {
        category.setNom(request.getNom());
        category.setNomAr(request.getNomAr());
        category.setNomFr(request.getNomFr());
        category.setIcon(request.getIcon() != null ? request.getIcon() : "package");
        category.setImageUrl(request.getImageUrl());
        category.setDescription(request.getDescription());
        if (request.getSortOrder() != null) {
            category.setSortOrder(request.getSortOrder());
        }
    }

    private void updateProductFields(Product product, ProductRequest request) {
        product.setNom(request.getNom());
        product.setImageUrl(request.getImageUrl());
        product.setDescription(request.getDescription());
        product.setPricingMethod(request.getPricingMethod());
        product.setPrixUnitaire(request.getPrixUnitaire());
        product.setUniteLabel(request.getUniteLabel());
        product.setProcessingDays(request.getProcessingDays() != null ? request.getProcessingDays() : 2);
        product.setRequiresDimensions(request.getRequiresDimensions() != null ? request.getRequiresDimensions() : false);
        if (request.getSortOrder() != null) {
            product.setSortOrder(request.getSortOrder());
        }
    }

    private static String normalizeImageUrl(String url) {
        if (url != null && !url.startsWith("/uploads/") && !url.startsWith("http")) {
            return "/uploads/" + url;
        }
        return url;
    }

    private CategoryDto mapToCategoryDto(ProductCategory category) {
        return CategoryDto.builder()
                .id(category.getId())
                .nom(category.getNom())
                .nomAr(category.getNomAr())
                .nomFr(category.getNomFr())
                .icon(category.getIcon())
                .imageUrl(normalizeImageUrl(category.getImageUrl()))
                .description(category.getDescription())
                .isActive(category.getIsActive())
                .sortOrder(category.getSortOrder())
                .productCount((long) category.getProducts().size())
                .products(category.getProducts().stream()
                        .map(this::mapToProductDto)
                        .collect(Collectors.toList()))
                .build();
    }

    private ProductDto mapToProductDto(Product product) {
        return ProductDto.builder()
                .id(product.getId())
                .categoryId(product.getCategory().getId())
                .categoryNom(product.getCategory().getNom())
                .nom(product.getNom())
                .imageUrl(normalizeImageUrl(product.getImageUrl()))
                .description(product.getDescription())
                .pricingMethod(product.getPricingMethod())
                .prixUnitaire(product.getPrixUnitaire())
                .uniteLabel(product.getUniteLabel())
                .processingDays(product.getProcessingDays())
                .requiresDimensions(product.getRequiresDimensions())
                .isActive(product.getIsActive())
                .sortOrder(product.getSortOrder())
                .build();
    }
}

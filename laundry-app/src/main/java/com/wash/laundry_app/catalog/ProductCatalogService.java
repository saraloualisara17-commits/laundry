package com.wash.laundry_app.catalog;

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
        return mapToCategoryDto(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDto updateCategory(Long id, CategoryRequest request) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
        updateCategoryFields(category, request);
        return mapToCategoryDto(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDto toggleCategory(Long id) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
        category.setIsActive(!category.getIsActive());
        return mapToCategoryDto(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(Long id) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie non trouvée"));
        
        if (!category.getProducts().isEmpty()) {
            throw new RuntimeException("Impossible de supprimer: cette catégorie contient des produits");
        }
        
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
        return mapToProductDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit non trouvé"));
        updateProductFields(product, request);
        return mapToProductDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto toggleProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit non trouvé"));
        product.setIsActive(!product.getIsActive());
        return mapToProductDto(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit non trouvé"));
        
        // TODO: Check if product is used in any order item
        // Currently there is no direct link between products and order items in the schema provided.
        // For now, we allow deletion if no link exists, or implement name-based check if required.
        
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

    private CategoryDto mapToCategoryDto(ProductCategory category) {
        return CategoryDto.builder()
                .id(category.getId())
                .nom(category.getNom())
                .nomAr(category.getNomAr())
                .nomFr(category.getNomFr())
                .icon(category.getIcon())
                .imageUrl(category.getImageUrl())
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
                .imageUrl(product.getImageUrl())
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

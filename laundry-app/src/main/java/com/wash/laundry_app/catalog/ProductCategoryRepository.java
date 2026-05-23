package com.wash.laundry_app.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {
    List<ProductCategory> findAllByOrderBySortOrderAsc();
    List<ProductCategory> findAllByIsActiveTrueOrderBySortOrderAsc();
}

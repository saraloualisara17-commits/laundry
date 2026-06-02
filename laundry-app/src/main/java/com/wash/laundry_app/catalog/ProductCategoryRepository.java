package com.wash.laundry_app.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {
    List<ProductCategory> findAllByOrderBySortOrderAsc();
    List<ProductCategory> findAllByIsActiveTrueOrderBySortOrderAsc();

    @Query("SELECT MAX(c.sortOrder) FROM ProductCategory c")
    Optional<Integer> findMaxSortOrder();
}

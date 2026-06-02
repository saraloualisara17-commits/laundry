package com.wash.laundry_app.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByCategoryIdOrderBySortOrderAsc(Long categoryId);
    List<Product> findByCategoryIdAndIsActiveTrueOrderBySortOrderAsc(Long categoryId);

    @Query("SELECT MAX(p.sortOrder) FROM Product p WHERE p.category.id = :categoryId")
    Optional<Integer> findMaxSortOrderByCategoryId(@Param("categoryId") Long categoryId);
}

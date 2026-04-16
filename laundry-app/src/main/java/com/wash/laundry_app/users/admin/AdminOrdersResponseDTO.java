package com.wash.laundry_app.users.admin;

import com.wash.laundry_app.command.CommandeDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOrdersResponseDTO {

    // The paginated list of orders for the current page
    private List<CommandeDTO> content;

    // Pagination metadata
    private long totalElements;
    private int totalPages;
    private int currentPage;
    private int pageSize;
    private boolean first;
    private boolean last;

    // Summary stats computed over the ENTIRE filtered result set (not just this page)
    private double totalValue;
    private long totalVolumes;
}

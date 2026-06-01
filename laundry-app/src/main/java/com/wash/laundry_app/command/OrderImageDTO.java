package com.wash.laundry_app.command;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderImageDTO {

    /** One entry per order that has at least one non-archived image. */
    private Long orderId;
    private String orderStatus;
    private String clientName;
    private String clientPhone;
    private LocalDateTime dateCreation;
    private List<ImageItem> images;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageItem {
        private Long id;
        private String imageUrl;
        private String photoType;
    }
}

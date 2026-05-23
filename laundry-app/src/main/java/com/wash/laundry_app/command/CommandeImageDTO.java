package com.wash.laundry_app.command;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommandeImageDTO {
    private String imageUrl;
    private String photoType;
}

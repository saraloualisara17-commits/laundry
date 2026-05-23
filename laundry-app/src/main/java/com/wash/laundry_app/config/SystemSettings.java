package com.wash.laundry_app.config;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSettings {
    @Id
    private Long id;

    private String appName;

    private String logoUrl;

    private String businessPhone;

    private LocalDateTime updatedAt;
}

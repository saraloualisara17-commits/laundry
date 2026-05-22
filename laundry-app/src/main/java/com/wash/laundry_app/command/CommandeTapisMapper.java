package com.wash.laundry_app.command;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.math.BigDecimal;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CommandeTapisMapper {

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productNom", source = "product.nom")
    @Mapping(target = "productPricingMethod", source = "product.pricingMethod")
    @Mapping(target = "surface", expression = "java(calculateSurface(commandeTapis))")
    @Mapping(target = "images", expression = "java(mapImages(commandeTapis.getImages()))")
    CommandeTapisDTO toDto(CommandeTapis commandeTapis);

    default BigDecimal calculateSurface(CommandeTapis item) {
        if (item.getLargeur() != null && item.getHauteur() != null) {
            return item.getLargeur().multiply(item.getHauteur());
        }
        return null;
    }

    default java.util.List<CommandeImageDTO> mapImages(java.util.List<CommandeImage> images) {
        if (images == null) return null;
        return images.stream().map(img -> CommandeImageDTO.builder()
                .imageUrl(img.getImageUrl())
                .photoType(img.getPhotoType() != null ? img.getPhotoType().name() : null)
                .build()).toList();
    }
}

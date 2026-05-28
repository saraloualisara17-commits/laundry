package com.wash.laundry_app.command;

import com.wash.laundry_app.clients.ClientMapper;
import com.wash.laundry_app.command.attempts.OrderAttempt;
import com.wash.laundry_app.command.attempts.OrderAttemptDto;
import com.wash.laundry_app.users.UserMapper;
import com.wash.laundry_app.users.admin.CommandSummaryDto;
import com.wash.laundry_app.users.employe.CommandDetails;
import com.wash.laundry_app.users.employe.CommandDtoEmploye;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", uses = {ClientMapper.class, UserMapper.class, CommandeTapisMapper.class}, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CommandeMapper {

    @Mapping(target = "resteAPayer", expression = "java(com.wash.laundry_app.command.PaymentGuard.remainingBalance(commande.getMontantTotal(), commande.getMontantPaye()))")
    @Mapping(target = "montantRestant", expression = "java(com.wash.laundry_app.command.PaymentGuard.remainingBalance(commande.getMontantTotal(), commande.getMontantPaye()))")
    @Mapping(target = "images", expression = "java(mapImages(commande.getImages()))")
    @Mapping(target = "deliveryAddress", expression = "java(commande.getDeliveryAddress() != null ? commande.getDeliveryAddress() : (commande.getClient() != null && commande.getClient().getAddresses() != null && !commande.getClient().getAddresses().isEmpty() ? commande.getClient().getAddresses().get(0).getAddress() : null))")
    @Mapping(target = "deliveryLatitude", expression = "java(commande.getDeliveryLatitude() != null ? commande.getDeliveryLatitude() : (commande.getClient() != null && commande.getClient().getAddresses() != null && !commande.getClient().getAddresses().isEmpty() ? commande.getClient().getAddresses().get(0).getLatitude() : null))")
    @Mapping(target = "deliveryLongitude", expression = "java(commande.getDeliveryLongitude() != null ? commande.getDeliveryLongitude() : (commande.getClient() != null && commande.getClient().getAddresses() != null && !commande.getClient().getAddresses().isEmpty() ? commande.getClient().getAddresses().get(0).getLongitude() : null))")
    @Mapping(target = "clientLatitude", expression = "java(commande.getDeliveryLatitude() != null ? commande.getDeliveryLatitude().toString() : (commande.getClient() != null && commande.getClient().getAddresses() != null && !commande.getClient().getAddresses().isEmpty() ? (commande.getClient().getAddresses().get(0).getLatitude() != null ? commande.getClient().getAddresses().get(0).getLatitude().toString() : null) : null))")
    @Mapping(target = "clientLongitude", expression = "java(commande.getDeliveryLongitude() != null ? commande.getDeliveryLongitude().toString() : (commande.getClient() != null && commande.getClient().getAddresses() != null && !commande.getClient().getAddresses().isEmpty() ? (commande.getClient().getAddresses().get(0).getLongitude() != null ? commande.getClient().getAddresses().get(0).getLongitude().toString() : null) : null))")
    @Mapping(target = "clientAddress", expression = "java(commande.getDeliveryAddress() != null ? commande.getDeliveryAddress() : (commande.getClient() != null && commande.getClient().getAddresses() != null && !commande.getClient().getAddresses().isEmpty() ? commande.getClient().getAddresses().get(0).getAddress() : null))")
    @Mapping(target = "itemCount", expression = "java(commande.getCommandeTapis() != null ? commande.getCommandeTapis().size() : 0)")
    CommandeDTO toDto(Commande commande);

    CommandDtoEmploye todto(Commande commande);

    @Mapping(target = "images", expression = "java(mapImages(commande.getImages()))")
    @Mapping(target = "attempts", expression = "java(mapAttempts(commande.getAttempts()))")
    CommandDetails Todto (Commande commande);

    @Mapping(target = "clientNom", expression = "java(commande.getClient() != null ? commande.getClient().getName() : null)")
    CommandSummaryDto TodTo (Commande commande);

    default java.util.List<CommandeImageDTO> mapImages(java.util.List<CommandeImage> images) {
        if (images == null) return null;
        return images.stream().map(img -> {
            String url = img.getImageUrl();
            if (url != null && !url.startsWith("/uploads/") && !url.startsWith("http")) {
                url = "/uploads/" + url;
            }
            return CommandeImageDTO.builder()
                    .imageUrl(url)
                    .photoType(img.getPhotoType() != null ? img.getPhotoType().name() : null)
                    .build();
        }).toList();
    }

    default java.util.List<OrderAttemptDto> mapAttempts(java.util.List<OrderAttempt> attempts) {
        if (attempts == null || attempts.isEmpty()) return new java.util.ArrayList<>();
        return attempts.stream().map(a -> {
            OrderAttemptDto dto = new OrderAttemptDto();
            dto.setId(a.getId());
            dto.setAttemptType(a.getAttemptType());
            dto.setReason(a.getReason());
            dto.setReasonLabel(OrderAttempt.getReasonLabel(a.getReason(), "FR"));
            dto.setReasonLabelAr(OrderAttempt.getReasonLabel(a.getReason(), "AR"));
            dto.setNotes(a.getNotes());
            dto.setDriverName(a.getDriver() != null ? a.getDriver().getName() : null);
            dto.setAttemptedAt(a.getAttemptedAt());
            dto.setRescheduledTo(a.getRescheduledTo());
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }

}

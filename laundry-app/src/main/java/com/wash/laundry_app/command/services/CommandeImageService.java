package com.wash.laundry_app.command.services;

import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.command.CommandeImage;
import com.wash.laundry_app.command.CommandeNotFoundException;
import com.wash.laundry_app.command.CommandeRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@AllArgsConstructor
public class CommandeImageService {

    private final CommandeRepository commandeRepository;

    @Transactional
    public void addOrderImages(Long id, List<String> imageUrls, String photoType) {
        Commande commande = commandeRepository.findById(id).orElseThrow(CommandeNotFoundException::new);
        CommandeImage.PhotoType type;
        if (photoType == null || photoType.isBlank()) {
            type = statusToPhotoType(commande.getStatus().name());
        } else {
            try { type = CommandeImage.PhotoType.valueOf(photoType.toLowerCase()); }
            catch (Exception e) { type = statusToPhotoType(commande.getStatus().name()); }
        }
        for (String url : imageUrls) {
            commande.getImages().add(CommandeImage.builder()
                    .imageUrl(url).commande(commande).photoType(type).build());
        }
        commandeRepository.save(commande);
    }

    private CommandeImage.PhotoType statusToPhotoType(String status) {
        return switch (status) {
            case "PENDING_PICKUP"      -> CommandeImage.PhotoType.pending_pickup;
            case "PICKED_UP"           -> CommandeImage.PhotoType.picked_up;
            case "IN_PROCESS"          -> CommandeImage.PhotoType.in_process;
            case "READY_FOR_DELIVERY"  -> CommandeImage.PhotoType.ready_for_delivery;
            case "DELIVERED"           -> CommandeImage.PhotoType.delivered;
            case "PICKUP_FAILED"       -> CommandeImage.PhotoType.pickup_failed;
            case "DELIVERY_FAILED"     -> CommandeImage.PhotoType.delivery_failed;
            case "CANCELLED"           -> CommandeImage.PhotoType.cancelled;
            default                    -> CommandeImage.PhotoType.reception;
        };
    }
}

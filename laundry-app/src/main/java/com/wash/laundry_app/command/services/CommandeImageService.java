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
        try { type = CommandeImage.PhotoType.valueOf(photoType.toLowerCase()); }
        catch (Exception e) { type = CommandeImage.PhotoType.reception; }
        for (String url : imageUrls) {
            commande.getImages().add(CommandeImage.builder()
                    .imageUrl(url).commande(commande).photoType(type).build());
        }
        commandeRepository.save(commande);
    }
}

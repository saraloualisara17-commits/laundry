package com.wash.laundry_app.command.services;

import com.wash.laundry_app.catalog.Product;
import com.wash.laundry_app.catalog.ProductRepository;
import com.wash.laundry_app.command.*;
import com.wash.laundry_app.users.User;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class CommandeHelperService {

    private final ProductRepository productRepository;
    private final HistoriqueStatutRepository historiqueStatutRepository;
    private final CommandeTapisRepository commandeTapisRepository;

    public void recordAudit(Commande commande, String oldStatus, String newStatus,
                             User user, String commentaire) {
        HistoriqueStatut h = new HistoriqueStatut();
        h.setCommande(commande);
        h.setAncienStatut(oldStatus);
        h.setNouveauStatut(newStatus);
        h.setUser(user);
        h.setCommentaire(commentaire);
        historiqueStatutRepository.save(h);
    }

    public CommandeTapis buildTapisItem(Commande commande, CreateCommandeRequest.TapisItem req, int tagIndex) {
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Produit introuvable: " + req.getProductId()));

        CommandeTapis item = new CommandeTapis();
        item.setCommande(commande);
        item.setProduct(product);
        item.setQuantite(req.getQuantite());
        item.setPrixUnitaire(product.getPrixUnitaire());
        item.setLargeur(req.getLargeur());
        item.setHauteur(req.getHauteur());
        item.setLongueur(req.getLongueur());
        item.setPoids(req.getPoids());
        item.setTagNumero(req.getTagNumero() != null ? req.getTagNumero() : "TAG-00" + tagIndex);
        item.setNotes(req.getNotes());
        item.setCouleur(req.getCouleur());

        BigDecimal remise = req.getRemiseMontant() != null ? req.getRemiseMontant() : BigDecimal.ZERO;
        item.setRemiseMontant(remise);
        item.setRemiseRaison(req.getRemiseRaison());

        BigDecimal calculated = switch (product.getPricingMethod()) {
            case PER_M2 -> (req.getLargeur() != null && req.getHauteur() != null)
                    ? req.getLargeur().multiply(req.getHauteur()).multiply(product.getPrixUnitaire())
                    : BigDecimal.ZERO;
            case PER_UNIT -> product.getPrixUnitaire().multiply(new BigDecimal(req.getQuantite()));
            case PER_KG -> (req.getPoids() != null)
                    ? req.getPoids().multiply(product.getPrixUnitaire()) : BigDecimal.ZERO;
            case PER_LINEAR_M -> (req.getLongueur() != null)
                    ? req.getLongueur().multiply(product.getPrixUnitaire()) : BigDecimal.ZERO;
            case CUSTOM -> req.getManualPrice() != null ? req.getManualPrice() : BigDecimal.ZERO;
        };

        item.setPrixCalcule(calculated);
        BigDecimal finalPrice = calculated.subtract(remise);
        item.setPrixFinal(finalPrice);
        item.setSousTotal(finalPrice);
        return item;
    }

    public void attachItemImages(CommandeTapis item, List<String> urls) {
        if (urls == null || urls.isEmpty()) return;
        if (item.getImages() == null) item.setImages(new ArrayList<>());
        for (String url : urls) {
            item.getImages().add(CommandeImage.builder()
                    .imageUrl(url).commandeTapis(item)
                    .photoType(CommandeImage.PhotoType.reception).build());
        }
        commandeTapisRepository.save(item);
    }

    public void attachOrderImages(Commande commande, List<String> urls) {
        if (urls == null || urls.isEmpty()) return;
        if (commande.getImages() == null) commande.setImages(new ArrayList<>());
        for (String url : urls) {
            commande.getImages().add(CommandeImage.builder()
                    .imageUrl(url).commande(commande)
                    .photoType(CommandeImage.PhotoType.reception).build());
        }
    }
}

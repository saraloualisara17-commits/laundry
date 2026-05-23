package com.wash.laundry_app.receipt;

import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.command.CommandeNotFoundException;
import com.wash.laundry_app.command.CommandeRepository;
import com.wash.laundry_app.command.CommandeStatus;
import com.wash.laundry_app.command.Paiement;
import com.wash.laundry_app.command.PaiementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@RestController
@RequestMapping("/api/commandes/{id}/receipt")
@RequiredArgsConstructor
public class ReceiptController {

    private final CommandeRepository commandeRepository;
    private final PdfService pdfService;
    private final PaiementRepository paiementRepository;

    @Transactional(readOnly = true)
    @GetMapping("/order/pdf")
    public ResponseEntity<byte[]> getOrderReceiptPdf(@PathVariable Long id) {
        Commande commande = commandeRepository.findForReceiptById(id).orElseThrow(CommandeNotFoundException::new);
        byte[] pdf = pdfService.generatePdf(commande, "ORDER");
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=commande-" + commande.getNumeroCommande() + ".pdf")
                .body(pdf);
    }

    @Transactional(readOnly = true)
    @GetMapping("/delivery/pdf")
    public ResponseEntity<byte[]> getDeliveryNotePdf(@PathVariable Long id) {
        Commande commande = commandeRepository.findForReceiptById(id).orElseThrow(CommandeNotFoundException::new);
        if (commande.getStatus() != CommandeStatus.DELIVERED) {
            return ResponseEntity.badRequest().build();
        }
        
        byte[] pdf = pdfService.generatePdf(commande, "DELIVERY");
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=livraison-" + commande.getNumeroCommande() + ".pdf")
                .body(pdf);
    }

    @Transactional(readOnly = true)
    @GetMapping("/order/whatsapp")
    public ResponseEntity<?> getOrderWhatsAppMeta(@PathVariable Long id) {
        Commande commande = commandeRepository.findForReceiptById(id).orElseThrow(CommandeNotFoundException::new);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", Map.of(
                "phone", pdfService.getClientWhatsAppPhone(commande) != null ? pdfService.getClientWhatsAppPhone(commande) : "",
                "message", pdfService.generateWhatsAppMessage(commande, "ORDER"),
                "pdfUrl", "/api/commandes/" + id + "/receipt/order/pdf"
            )
        ));
    }

    @Transactional(readOnly = true)
    @GetMapping("/delivery/whatsapp")
    public ResponseEntity<?> getDeliveryWhatsAppMeta(@PathVariable Long id) {
        Commande commande = commandeRepository.findForReceiptById(id).orElseThrow(CommandeNotFoundException::new);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", Map.of(
                "phone", pdfService.getClientWhatsAppPhone(commande) != null ? pdfService.getClientWhatsAppPhone(commande) : "",
                "message", pdfService.generateWhatsAppMessage(commande, "DELIVERY"),
                "pdfUrl", "/api/commandes/" + id + "/receipt/delivery/pdf"
            )
        ));
    }

    @Transactional(readOnly = true)
    @GetMapping("/order/thermal")
    public ResponseEntity<String> getOrderReceiptThermal(@PathVariable Long id) {
        Commande commande = commandeRepository.findForReceiptById(id).orElseThrow(CommandeNotFoundException::new);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/plain; charset=UTF-8")
                .body(pdfService.buildThermalReceiptText(commande, "ORDER"));
    }

    @Transactional(readOnly = true)
    @GetMapping("/delivery/thermal")
    public ResponseEntity<String> getDeliveryNoteThermal(@PathVariable Long id) {
        Commande commande = commandeRepository.findForReceiptById(id).orElseThrow(CommandeNotFoundException::new);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/plain; charset=UTF-8")
                .body(pdfService.buildThermalReceiptText(commande, "DELIVERY"));
    }

    @Transactional(readOnly = true)
    @GetMapping("/payments/{paymentId}/pdf")
    public ResponseEntity<byte[]> getPaymentReceiptPdf(@PathVariable Long id, @PathVariable Long paymentId) {
        Commande commande = commandeRepository.findForReceiptById(id).orElseThrow(CommandeNotFoundException::new);
        Paiement paiement = commande.getPaiements().stream()
                .filter(p -> p.getId().equals(paymentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Paiement introuvable"));
        byte[] pdf = pdfService.generatePaymentReceiptPdf(paiement);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=paiement-" + paymentId + ".pdf")
                .body(pdf);
    }

}

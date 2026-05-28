package com.wash.laundry_app.receipt;

import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.command.CommandeNotFoundException;
import com.wash.laundry_app.command.CommandeRepository;
import com.wash.laundry_app.command.CommandeStatus;
import com.wash.laundry_app.command.Paiement;
import com.wash.laundry_app.command.PaiementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/commandes/{id}/receipt")
@RequiredArgsConstructor
public class ReceiptController {

    private final CommandeRepository commandeRepository;
    private final PdfService pdfService;
    private final PaiementRepository paiementRepository;

    private String currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "anonymous";
    }

    // Receipt loading — 6 separate queries, one bag per query.
    // Hibernate throws MultipleBagFetchException if two or more @OneToMany List<>
    // collections are JOIN FETCHed in the same JPQL query.
    // Affected bags: Commande.commandeTapis, Commande.paiements, Commande.attempts,
    //                Client.phones, Client.addresses  — each needs its own query.
    // All 6 queries run inside the same @Transactional(readOnly=true) session on
    // the calling controller method, so lazy proxies remain valid throughout.
    private Commande loadForReceipt(Long id) {
        // Q1: scalars + ManyToOne (Commande→client, livreur, deliveryDriver) — no bags
        Commande commande = commandeRepository.findForReceiptById(id)
                .orElseThrow(CommandeNotFoundException::new);

        // Q2: Client.phones bag
        commandeRepository.findWithClientPhonesById(id)
                .ifPresent(c -> commande.getClient().setPhones(c.getClient().getPhones()));

        // Q3: Client.addresses bag
        commandeRepository.findWithClientAddressesById(id)
                .ifPresent(c -> commande.getClient().setAddresses(c.getClient().getAddresses()));

        // Q4: Commande.commandeTapis bag + product
        commandeRepository.findWithItemsById(id)
                .ifPresent(c -> commande.setCommandeTapis(c.getCommandeTapis()));

        // Q5: Commande.paiements bag
        commandeRepository.findWithPaiementsById(id)
                .ifPresent(c -> commande.setPaiements(c.getPaiements()));

        // Q6: Commande.attempts bag + attempt.driver
        commandeRepository.findWithAttemptsById(id)
                .ifPresent(c -> commande.setAttempts(c.getAttempts()));

        log.debug("[receipt] loadForReceipt complete — orderId={} phones={} addresses={} items={} payments={} attempts={}",
                id,
                commande.getClient().getPhones().size(),
                commande.getClient().getAddresses().size(),
                commande.getCommandeTapis().size(),
                commande.getPaiements().size(),
                commande.getAttempts().size());

        return commande;
    }

    @Transactional(readOnly = true)
    @GetMapping("/order/pdf")
    public ResponseEntity<byte[]> getOrderReceiptPdf(
            @PathVariable Long id,
            @RequestParam(value = "lang", defaultValue = "fr") String lang) {
        log.info("[receipt] ORDER PDF requested — orderId={} lang={} user={}", id, lang, currentUser());
        long t0 = System.currentTimeMillis();
        Commande commande = loadForReceipt(id);
        log.info("[receipt] ORDER PDF load complete — orderId={} status={} items={} payments={}",
                id, commande.getStatus(),
                commande.getCommandeTapis() != null ? commande.getCommandeTapis().size() : 0,
                commande.getPaiements() != null ? commande.getPaiements().size() : 0);
        byte[] pdf = pdfService.generatePdf(commande, "ORDER", lang);
        log.info("[receipt] ORDER PDF generated — orderId={} bytes={} durationMs={}",
                id, pdf.length, System.currentTimeMillis() - t0);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=commande-" + commande.getNumeroCommande() + ".pdf")
                .body(pdf);
    }

    @Transactional(readOnly = true)
    @GetMapping("/delivery/pdf")
    public ResponseEntity<byte[]> getDeliveryNotePdf(
            @PathVariable Long id,
            @RequestParam(value = "lang", defaultValue = "fr") String lang) {
        log.info("[receipt] DELIVERY PDF requested — orderId={} lang={} user={}", id, lang, currentUser());
        long t0 = System.currentTimeMillis();
        Commande commande = loadForReceipt(id);
        if (commande.getStatus() != CommandeStatus.DELIVERED) {
            log.warn("[receipt] DELIVERY PDF rejected — orderId={} currentStatus={} (must be DELIVERED)",
                    id, commande.getStatus());
            return ResponseEntity.badRequest().build();
        }
        byte[] pdf = pdfService.generatePdf(commande, "DELIVERY", lang);
        log.info("[receipt] DELIVERY PDF generated — orderId={} bytes={} durationMs={}",
                id, pdf.length, System.currentTimeMillis() - t0);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=livraison-" + commande.getNumeroCommande() + ".pdf")
                .body(pdf);
    }

    @Transactional(readOnly = true)
    @GetMapping("/order/whatsapp")
    public ResponseEntity<?> getOrderWhatsAppMeta(@PathVariable Long id) {
        Commande commande = loadForReceipt(id);
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
        Commande commande = loadForReceipt(id);
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
        Commande commande = loadForReceipt(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/plain; charset=UTF-8")
                .body(pdfService.buildThermalReceiptText(commande, "ORDER"));
    }

    @Transactional(readOnly = true)
    @GetMapping("/delivery/thermal")
    public ResponseEntity<String> getDeliveryNoteThermal(@PathVariable Long id) {
        Commande commande = loadForReceipt(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/plain; charset=UTF-8")
                .body(pdfService.buildThermalReceiptText(commande, "DELIVERY"));
    }

    @Transactional(readOnly = true)
    @GetMapping("/payments/{paymentId}/pdf")
    public ResponseEntity<byte[]> getPaymentReceiptPdf(@PathVariable Long id, @PathVariable Long paymentId) {
        Commande commande = loadForReceipt(id);
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

package com.wash.laundry_app.receipt;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.itextpdf.html2pdf.ConverterProperties;
import com.itextpdf.html2pdf.HtmlConverter;
import com.itextpdf.layout.font.FontProvider;
import com.wash.laundry_app.clients.Client;
import com.wash.laundry_app.command.Commande;
import com.wash.laundry_app.command.CommandeStatus;
import com.wash.laundry_app.command.CommandeTapis;
import com.wash.laundry_app.command.Paiement;
import com.wash.laundry_app.command.attempts.AttemptType;
import com.wash.laundry_app.command.attempts.OrderAttempt;
import com.wash.laundry_app.config.SystemSettings;
import com.wash.laundry_app.config.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfService {

    private final SystemSettingsService settingsService;

    @Value("${app.business.address:Casablanca, Maroc}")
    private String businessAddress;

    // Resolved upload directory — same value as file.upload-dir so the logo path
    // stays consistent with where FileStorageService writes files.
    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    // Frontend URL used in QR codes.  Override via APP_FRONTEND_URL env var in prod.
    @Value("${app.frontend.url:${webSiteUrl:http://localhost:3000}}")
    private String frontendUrl;

    private String logoToBase64ImgTag(String logoFileName) {
        if (logoFileName == null || logoFileName.isEmpty()) {
            log.debug("[pdf] No logo configured — skipping logo embed");
            return "";
        }
        try {
            // Resolve against the configured upload dir (same as file.upload-dir).
            // This works both locally (./uploads) and on Railway (/app/uploads).
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path logoPath   = uploadPath.resolve(logoFileName).normalize();

            // Prevent path traversal outside upload dir
            if (!logoPath.startsWith(uploadPath)) {
                log.warn("[pdf] Logo path traversal attempt blocked: {}", logoFileName);
                return "";
            }

            if (!Files.exists(logoPath)) {
                log.warn("[pdf] Logo file not found: {} (resolved: {}). " +
                         "If running on Railway, the ephemeral filesystem may have been reset.",
                         logoFileName, logoPath);
                return "";
            }

            byte[] bytes = Files.readAllBytes(logoPath);
            String ext  = logoFileName.toLowerCase();
            String mime = ext.endsWith(".png") ? "image/png"
                        : ext.endsWith(".webp") ? "image/webp"
                        : "image/jpeg";
            String b64 = Base64.getEncoder().encodeToString(bytes);
            log.debug("[pdf] Logo loaded OK — file={} bytes={} mime={}", logoFileName, bytes.length, mime);
            return "<img src='data:" + mime + ";base64," + b64 + "' style='height:70px; object-fit:contain;'/>";
        } catch (Exception e) {
            log.error("[pdf] Failed to load logo '{}': {}", logoFileName, e.getMessage(), e);
            return "";
        }
    }

    private String generateQrCodeBase64(String content) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, 200, 200);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);
            String b64 = Base64.getEncoder().encodeToString(baos.toByteArray());
            log.debug("[pdf] QR code generated OK — content={} bytes={}", content, baos.size());
            return b64;
        } catch (Exception e) {
            log.error("[pdf] QR code generation failed: {}", e.getMessage(), e);
            return "";
        }
    }

    // Shared ConverterProperties with standard fonts registered.
    // iTextPDF's default ConverterProperties has no FontProvider, so it falls
    // back to built-in Type1 fonts (Helvetica/Courier/Times) which have no Arabic
    // glyphs — Arabic text renders as empty boxes. Registering the standard font
    // set gives iText access to all fonts it ships with, which covers Latin and
    // basic Unicode. For full Arabic shaping you'd need an Arabic TTF registered
    // here (e.g. Cairo, Amiri); for now this at minimum prevents iText crashes.
    private ConverterProperties buildConverterProperties() {
        ConverterProperties props = new ConverterProperties();
        try {
            FontProvider fontProvider = new FontProvider();
            fontProvider.addStandardPdfFonts();  // Helvetica, Times, Courier
            fontProvider.addSystemFonts();        // OS fonts — includes Arial on most servers
            props.setFontProvider(fontProvider);
            log.debug("[pdf] FontProvider configured with standard + system fonts");
        } catch (Exception e) {
            log.warn("[pdf] Could not configure FontProvider ({}), using iText default. Arabic may not render.", e.getMessage());
        }
        return props;
    }

    public byte[] generatePdf(Commande commande, String receiptType) {
        log.info("[pdf] Generating {} PDF — orderId={} orderNum={}",
                receiptType, commande.getId(), commande.getNumeroCommande());
        long t0 = System.currentTimeMillis();
        try {
            String html = buildReceiptHtml(commande, receiptType);
            log.debug("[pdf] HTML built — length={} chars", html.length());

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ConverterProperties props = buildConverterProperties();
            HtmlConverter.convertToPdf(html, baos, props);

            byte[] result = baos.toByteArray();
            log.info("[pdf] {} PDF ready — orderId={} bytes={} durationMs={}",
                    receiptType, commande.getId(), result.length, System.currentTimeMillis() - t0);

            if (result.length == 0) {
                throw new RuntimeException("iText returned empty PDF byte array");
            }
            return result;
        } catch (Exception e) {
            log.error("[pdf] {} PDF generation FAILED — orderId={} error={}",
                    receiptType, commande.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    private String buildReceiptHtml(Commande commande, String receiptType) {
        SystemSettings settings = settingsService.getSettings();
        String businessName = settings.getAppName() != null ? settings.getAppName() : "Laundry";
        String businessPhone = settings.getBusinessPhone() != null ? settings.getBusinessPhone() : "";
        String logoUrl = settings.getLogoUrl() != null ? settings.getLogoUrl() : "";

        Client client = commande.getClient();
        List<CommandeTapis> items = commande.getCommandeTapis();
        List<Paiement> payments = commande.getPaiements();

        BigDecimal montantTotal = commande.getMontantTotal();
        BigDecimal montantPaye = commande.getMontantPaye() != null ? commande.getMontantPaye() : BigDecimal.ZERO;
        BigDecimal montantRestant = montantTotal.subtract(montantPaye);

        String qrContent = frontendUrl + "/order/" + commande.getId();
        String qrBase64 = generateQrCodeBase64(qrContent);

        String dateCreation = commande.getDateCreation()
                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html dir='ltr'><head><meta charset='UTF-8'/><style>");
        html.append("* { margin: 0; padding: 0; box-sizing: border-box; }");
        html.append("body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: white; padding: 20px; max-width: 600px; margin: 0 auto; }");
        html.append(".logo-top { text-align: center; padding-bottom: 16px; margin-bottom: 4px; }");
        html.append(".header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #0D7377; margin-bottom: 20px; }");
        html.append(".business-info { flex: 1; }");
        html.append(".business-name { font-size: 22px; font-weight: 800; color: #0D7377; margin-bottom: 4px; }");
        html.append(".business-detail { font-size: 12px; color: #666; margin-top: 2px; }");
        html.append(".header-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }");
        html.append(".qr-code { width: 80px; height: 80px; }");
        html.append(".receipt-number { font-size: 11px; color: #999; margin-top: 4px; }");
        html.append(".section-header { display: flex; justify-content: space-between; align-items: center; background: #f0fafa; border-left: 4px solid #0D7377; padding: 8px 12px; margin: 16px 0 10px; }");
        html.append(".section-label-fr { font-size: 13px; font-weight: 700; color: #0D7377; }");
        html.append(".section-label-ar { font-size: 13px; font-weight: 700; color: #0D7377; direction: rtl; }");
        html.append(".client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px; }");
        html.append(".info-row { display: flex; flex-direction: column; gap: 2px; }");
        html.append(".info-label { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }");
        html.append(".info-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }");
        html.append(".order-meta { background: #f9f9f9; border-radius: 8px; padding: 12px; margin-bottom: 16px; }");
        html.append(".order-ref { font-size: 16px; font-weight: 800; color: #0D7377; margin-bottom: 6px; }");
        html.append(".meta-row { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-top: 4px; }");
        html.append(".items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }");
        html.append(".items-table th { background: #0D7377; color: white; padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: left; }");
        html.append(".items-table td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }");
        html.append(".items-table tr:nth-child(even) td { background: #fafafa; }");
        html.append(".item-name { font-weight: 600; color: #1a1a1a; }");
        html.append(".item-detail { font-size: 11px; color: #888; margin-top: 2px; }");
        html.append(".item-tag { display: inline-block; background: #e6f4f4; color: #0D7377; border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 700; margin-bottom: 3px; }");
        html.append(".discount-text { color: #EF4444; font-size: 11px; }");
        html.append(".price-cell { font-weight: 700; color: #0D7377; text-align: right; white-space: nowrap; }");
        html.append(".totals-section { margin-left: auto; width: 280px; margin-bottom: 16px; }");
        html.append(".total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f0f0f0; }");
        html.append(".total-row.grand { border-bottom: 2px solid #0D7377; border-top: 2px solid #0D7377; padding: 10px 0; font-size: 16px; font-weight: 800; color: #0D7377; margin-top: 4px; }");
        html.append(".total-row.paid { color: #10B981; font-weight: 700; }");
        html.append(".total-row.remaining { color: #EF4444; font-weight: 700; font-size: 15px; }");
        html.append(".total-label-ar { direction: rtl; font-size: 11px; color: #999; }");
        html.append(".payment-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f0faf5; border-radius: 8px; margin-bottom: 6px; border-left: 3px solid #10B981; }");
        html.append(".payment-amount { font-weight: 700; color: #10B981; }");
        html.append(".payment-note { font-size: 11px; color: #666; }");
        html.append(".payment-date { font-size: 11px; color: #999; }");
        html.append(".unpaid-alert { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 14px; margin-bottom: 16px; text-align: center; }");
        html.append(".unpaid-alert-title { font-size: 15px; font-weight: 800; color: #EF4444; margin-bottom: 4px; }");
        html.append(".unpaid-alert-ar { font-size: 13px; color: #EF4444; direction: rtl; margin-top: 4px; }");
        html.append(".unpaid-amount { font-size: 22px; font-weight: 800; color: #EF4444; margin-top: 6px; }");
        html.append(".paid-badge { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 14px; text-align: center; margin-bottom: 16px; }");
        html.append(".paid-badge-text { font-size: 16px; font-weight: 800; color: #10B981; }");
        html.append(".paid-badge-ar { font-size: 14px; color: #10B981; direction: rtl; margin-top: 4px; }");
        html.append(".pickup-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }");
        html.append(".pickup-label { font-size: 12px; color: #3B82F6; font-weight: 700; }");
        html.append(".pickup-label-ar { font-size: 12px; color: #3B82F6; font-weight: 700; direction: rtl; }");
        html.append(".pickup-date { font-size: 14px; font-weight: 800; color: #1D4ED8; margin-top: 2px; }");
        html.append(".footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e0e0e0; text-align: center; }");
        html.append(".footer-text { font-size: 12px; color: #999; margin-bottom: 4px; }");
        html.append(".footer-text-ar { font-size: 12px; color: #999; direction: rtl; margin-bottom: 4px; }");
        html.append(".footer-brand { font-size: 13px; font-weight: 700; color: #0D7377; margin-top: 8px; }");
        html.append(".status-banner { padding: 14px 16px; border-radius: 8px; margin-bottom: 16px; text-align: center; }");
        html.append(".status-banner.cancelled { background: #FEF2F2; border: 2px solid #EF4444; }");
        html.append(".status-banner.failed { background: #FFF7ED; border: 2px solid #F97316; }");
        html.append(".status-banner-title { font-size: 16px; font-weight: 800; margin-bottom: 4px; }");
        html.append(".status-banner.cancelled .status-banner-title { color: #EF4444; }");
        html.append(".status-banner.failed .status-banner-title { color: #EA580C; }");
        html.append(".status-banner-ar { font-size: 13px; direction: rtl; margin-top: 4px; }");
        html.append(".status-banner.cancelled .status-banner-ar { color: #EF4444; }");
        html.append(".status-banner.failed .status-banner-ar { color: #EA580C; }");
        html.append(".attempt-row { background: #FFF7ED; border-left: 3px solid #F97316; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; }");
        html.append(".attempt-type-label { font-size: 11px; font-weight: 700; color: #EA580C; text-transform: uppercase; letter-spacing: 0.5px; }");
        html.append(".attempt-reason { font-size: 13px; font-weight: 600; color: #1a1a1a; margin-top: 3px; }");
        html.append(".attempt-meta { font-size: 11px; color: #888; margin-top: 4px; }");
        html.append(".signature-section { display: flex; gap: 20px; margin-bottom: 16px; margin-top: 16px; }");
        html.append(".signature-box { flex: 1; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; }");
        html.append(".signature-label { font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 36px; }");
        html.append(".signature-line { border-top: 1px solid #ccc; margin-top: 4px; padding-top: 4px; font-size: 10px; color: #bbb; text-align: center; }");
        html.append("</style></head><body>");

        String logoImgTag = logoToBase64ImgTag(logoUrl);
        String phoneDetail = (businessPhone != null && !businessPhone.isEmpty())
                ? "<div class='business-detail'>📞 " + businessPhone + "</div>" : "";
        String qrTag = qrBase64.isEmpty() ? "" : "<img src='data:image/png;base64," + qrBase64 + "' class='qr-code'/>";

        html.append("<div class='logo-top'>").append(logoImgTag).append("</div>");
        html.append("<div class='header'>")
            .append("<div class='business-info'>")
            .append("<div class='business-name'>").append(businessName).append("</div>")
            .append(phoneDetail)
            .append("<div class='business-detail'>📍 ").append(businessAddress).append("</div>")
            .append("</div>")
            .append("<div class='header-right'>").append(qrTag)
            .append("<div class='receipt-number'>#").append(commande.getNumeroCommande()).append("</div>")
            .append("</div>")
            .append("</div>");

        CommandeStatus currentStatus = commande.getStatus();
        if (currentStatus == CommandeStatus.CANCELLED) {
            html.append("<div class='status-banner cancelled'><div class='status-banner-title'>❌ COMMANDE ANNULÉE</div><div class='status-banner-ar'>تم إلغاء هذا الطلب</div></div>");
        } else if (currentStatus == CommandeStatus.PICKUP_FAILED) {
            html.append("<div class='status-banner failed'><div class='status-banner-title'>⚠️ ÉCHEC DE COLLECTE</div><div class='status-banner-ar'>فشل عملية الاستلام</div></div>");
        } else if (currentStatus == CommandeStatus.DELIVERY_FAILED) {
            html.append("<div class='status-banner failed'><div class='status-banner-title'>⚠️ ÉCHEC DE LIVRAISON</div><div class='status-banner-ar'>فشل عملية التسليم</div></div>");
        }

        html.append(String.format(
            "<div class='order-meta'><div class='order-ref'>%s</div><div class='meta-row'><span>Date / التاريخ: <strong>%s</strong></span>" +
            "<span>Mode / النوع: <strong>%s</strong></span></div>" +
            "<div class='meta-row'><span>Statut / الحالة: <strong>%s</strong></span></div></div>",
            commande.getNumeroCommande(), dateCreation,
            commande.getMode() != null ? (commande.getMode().equals("immediate") ? "Au local / في المحل" : "Téléphonique / هاتفي") : "—",
            translateStatus(commande.getStatus().name())
        ));

        if (commande.getScheduledPickupDate() != null) {
            String pickupDate = commande.getScheduledPickupDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            html.append(String.format(
                "<div class='pickup-box'><div><div class='pickup-label'>📅 Date de collecte prévue</div><div class='pickup-label-ar'>موعد الاستلام المحدد</div><div class='pickup-date'>%s</div></div>" +
                "<div style='text-align:right'><div class='pickup-label'>Livreur assigné</div><div class='pickup-label-ar'>السائق المعين</div><div class='pickup-date'>%s</div></div></div>",
                pickupDate, commande.getLivreur() != null ? commande.getLivreur().getName() : "—"
            ));
        }

        html.append("<div class='section-header'><span class='section-label-fr'>👤 Informations Client</span><span class='section-label-ar'>معلومات العميل</span></div>" +
                "<div class='client-grid'><div class='info-row'><span class='info-label'>Nom / الاسم</span><span class='info-value'>").append(client.getName()).append("</span></div>")
                .append("<div class='info-row'><span class='info-label'>Téléphone / الهاتف</span><span class='info-value'>")
                .append(!client.getPhones().isEmpty() ? client.getPhones().get(0).getPhoneNumber() : "—").append("</span></div>")
                .append("<div class='info-row' style='grid-column: span 2'><span class='info-label'>Adresse / العنوان</span><span class='info-value'>")
                .append(!client.getAddresses().isEmpty() ? client.getAddresses().get(0).getAddress() : "Pas d'adresse / لا يوجد عنوان").append("</span></div></div>");

        html.append("<div class='section-header'><span class='section-label-fr'>📦 Articles</span><span class='section-label-ar'>المنتجات</span></div><table class='items-table'><thead><tr><th>Article / المنتج</th><th>Détails / التفاصيل</th><th style='text-align:right'>Prix / السعر</th></tr></thead><tbody>");

        for (int i = 0; i < items.size(); i++) {
            CommandeTapis item = items.get(i);
            String tagNum = item.getTagNumero() != null ? item.getTagNumero() : "TAG-00" + (i + 1);
            String details = "";
            if (item.getLargeur() != null && item.getHauteur() != null) {
                details = item.getLargeur() + "m × " + item.getHauteur() + "m = " + item.getLargeur().multiply(item.getHauteur()).setScale(2, RoundingMode.HALF_UP) + "m²";
            } else if (item.getQuantite() != null && item.getQuantite() > 1) {
                details = item.getQuantite() + " pièces";
            }
            if (item.getCouleur() != null && !item.getCouleur().isEmpty()) {
                details += (details.isEmpty() ? "" : " · ") + item.getCouleur();
            }
            String discountHtml = "";
            if (item.getRemiseMontant() != null && item.getRemiseMontant().compareTo(BigDecimal.ZERO) > 0) {
                discountHtml = "<div class='discount-text'>Remise / خصم: -" + item.getRemiseMontant() + " DH" + (item.getRemiseRaison() != null ? " (" + item.getRemiseRaison() + ")" : "") + "</div>";
            }
            html.append(String.format("<tr><td><div class='item-name'>%s</div>%s</td><td class='item-detail'>%s</td><td class='price-cell'>%s DH</td></tr>",
                    item.getProduct() != null ? item.getProduct().getNom() : "—", discountHtml, details, item.getSousTotal().setScale(2, RoundingMode.HALF_UP)));
        }
        html.append("</tbody></table>");

        BigDecimal totalDiscount = items.stream().map(i -> i.getRemiseMontant() != null ? i.getRemiseMontant() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        html.append("<div class='totals-section'>");
        if (totalDiscount.compareTo(BigDecimal.ZERO) > 0) {
            html.append(String.format("<div class='total-row'><span>Sous-total / المجموع الفرعي</span><span>%s DH</span></div><div class='total-row discount-text'><span>Remise totale / إجمالي الخصم</span><span>-%s DH</span></div>",
                    montantTotal.add(totalDiscount).setScale(2, RoundingMode.HALF_UP), totalDiscount.setScale(2, RoundingMode.HALF_UP)));
        }
        html.append(String.format("<div class='total-row grand'><span>TOTAL / الإجمالي</span><span>%s DH</span></div>", montantTotal.setScale(2, RoundingMode.HALF_UP)));

        if (montantPaye.compareTo(BigDecimal.ZERO) > 0) {
            if (montantRestant.compareTo(BigDecimal.ZERO) <= 0) {
                html.append(String.format(
                    "<div class='total-row paid'><span>Payé / المدفوع</span><span>%s DH</span></div>",
                    montantPaye.setScale(2, RoundingMode.HALF_UP)));
            } else {
                html.append(String.format(
                    "<div class='total-row paid'><span>Payé / المدفوع</span><span>%s DH</span></div>" +
                    "<div class='total-row remaining'><span>Reste à payer / المتبقي</span><span>%s DH</span></div>",
                    montantPaye.setScale(2, RoundingMode.HALF_UP), montantRestant.setScale(2, RoundingMode.HALF_UP)));
            }
        }
        html.append("</div>");

        if (payments != null && !payments.isEmpty()) {
            html.append("<div class='section-header'><span class='section-label-fr'>💰 Historique des paiements</span><span class='section-label-ar'>سجل المدفوعات</span></div><div class='payment-history'>");
            for (Paiement p : payments) {
                String payDate = p.getDatePaiement().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
                html.append(String.format("<div class='payment-row'><div><div class='payment-amount'>+%s DH</div><div class='payment-note'>%s</div></div><div class='payment-date'>%s</div></div>",
                        p.getMontant().setScale(2, RoundingMode.HALF_UP), p.getNote() != null && !p.getNote().isEmpty() ? p.getNote() : "Paiement", payDate));
            }
            html.append("</div>");
            if (montantRestant.compareTo(BigDecimal.ZERO) > 0) {
                html.append(String.format("<div class='unpaid-alert'><div class='unpaid-alert-title'>⚠️ Solde restant à payer</div><div class='unpaid-alert-ar'>المبلغ المتبقي للدفع</div><div class='unpaid-amount'>%s DH</div></div>",
                        montantRestant.setScale(2, RoundingMode.HALF_UP)));
            } else {
                html.append("<div class='paid-badge'><div class='paid-badge-text'>✅ Entièrement payé</div><div class='paid-badge-ar'>تم الدفع بالكامل</div></div>");
            }
        } else if (montantRestant.compareTo(BigDecimal.ZERO) > 0 && montantPaye.compareTo(BigDecimal.ZERO) == 0) {
            html.append(String.format("<div class='unpaid-alert'><div class='unpaid-alert-title'>⚠️ Solde restant à payer</div><div class='unpaid-alert-ar'>المبلغ المتبقي للدفع</div><div class='unpaid-amount'>%s DH</div></div>",
                    montantRestant.setScale(2, RoundingMode.HALF_UP)));
        }

        List<OrderAttempt> attempts = commande.getAttempts();
        if (attempts != null && !attempts.isEmpty()) {
            html.append("<div class='section-header'><span class='section-label-fr'>⚠️ Historique des tentatives</span><span class='section-label-ar'>سجل المحاولات</span></div>");
            for (OrderAttempt attempt : attempts) {
                String attemptDate = attempt.getAttemptedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
                String typeLabel = attempt.getAttemptType() == AttemptType.PICKUP
                        ? "Collecte / استلام" : "Livraison / تسليم";
                String reasonFr = OrderAttempt.getReasonLabel(attempt.getReason(), "FR");
                String reasonAr = OrderAttempt.getReasonLabel(attempt.getReason(), "AR");
                String meta = attemptDate;
                if (attempt.getDriver() != null) meta += " · " + attempt.getDriver().getName();
                if (attempt.getNotes() != null && !attempt.getNotes().isEmpty()) meta += " · " + attempt.getNotes();
                if (attempt.getRescheduledTo() != null)
                    meta += " · Reporté: " + attempt.getRescheduledTo().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
                html.append(String.format(
                    "<div class='attempt-row'><div class='attempt-type-label'>%s</div><div class='attempt-reason'>%s · %s</div><div class='attempt-meta'>%s</div></div>",
                    typeLabel, reasonFr, reasonAr, meta));
            }
        }

        if (receiptType.equals("DELIVERY")) {
            html.append("<div class='signature-section'>" +
                "<div class='signature-box'><div class='signature-label'>Signature client / توقيع العميل</div><div class='signature-line'>Nom et signature</div></div>" +
                "<div class='signature-box'><div class='signature-label'>Signature livreur / توقيع السائق</div><div class='signature-line'>Nom et signature</div></div>" +
                "</div>");
        }

        html.append(String.format("<div class='footer'><div class='footer-text'>Merci pour votre confiance · شكراً لثقتكم</div><div class='footer-text'>Pour toute question: %s</div><div class='footer-text-ar'>للاستفسار يرجى التواصل معنا</div><div class='footer-brand'>%s</div></div>",
                businessPhone, businessName));
        html.append("</body></html>");
        return html.toString();
    }

    public byte[] generatePaymentReceiptPdf(Paiement paiement) {
        log.info("[pdf] Generating PAYMENT PDF — paiementId={} commandeId={}",
                paiement.getId(), paiement.getCommande() != null ? paiement.getCommande().getId() : "?");
        try {
            String html = buildPaymentReceiptHtml(paiement);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            HtmlConverter.convertToPdf(html, baos, buildConverterProperties());
            byte[] result = baos.toByteArray();
            log.info("[pdf] PAYMENT PDF ready — paiementId={} bytes={}", paiement.getId(), result.length);
            return result;
        } catch (Exception e) {
            log.error("[pdf] PAYMENT PDF generation FAILED — paiementId={} error={}",
                    paiement.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to generate payment receipt PDF: " + e.getMessage(), e);
        }
    }

    private String buildPaymentReceiptHtml(Paiement paiement) {
        SystemSettings settings = settingsService.getSettings();
        String businessName = settings.getAppName() != null ? settings.getAppName() : "Laundry";
        String businessPhone = settings.getBusinessPhone() != null ? settings.getBusinessPhone() : "";
        String logoUrl = settings.getLogoUrl() != null ? settings.getLogoUrl() : "";

        Commande commande = paiement.getCommande();
        Client client = commande.getClient();
        BigDecimal montantTotal = commande.getMontantTotal();
        BigDecimal montantPaye = commande.getMontantPaye() != null ? commande.getMontantPaye() : BigDecimal.ZERO;
        BigDecimal montantRestant = montantTotal.subtract(montantPaye);

        String payDate = paiement.getDatePaiement().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

        String logoImgTag = logoToBase64ImgTag(logoUrl);
        String phoneDetail = (businessPhone != null && !businessPhone.isEmpty())
                ? "<div class='business-detail'>📞 " + businessPhone + "</div>" : "";

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html dir='ltr'><head><meta charset='UTF-8'/><style>");
        html.append("* { margin: 0; padding: 0; box-sizing: border-box; }");
        html.append("body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: white; padding: 20px; max-width: 500px; margin: 0 auto; }");
        html.append(".logo-top { text-align: center; padding-bottom: 16px; }");
        html.append(".header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #0D7377; margin-bottom: 20px; }");
        html.append(".business-name { font-size: 20px; font-weight: 800; color: #0D7377; margin-bottom: 4px; }");
        html.append(".business-detail { font-size: 12px; color: #666; margin-top: 2px; }");
        html.append(".receipt-number { font-size: 11px; color: #999; }");
        html.append(".title-block { text-align: center; margin-bottom: 20px; }");
        html.append(".title { font-size: 18px; font-weight: 800; color: #0D7377; }");
        html.append(".title-ar { font-size: 15px; color: #0D7377; direction: rtl; margin-top: 4px; }");
        html.append(".info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }");
        html.append(".info-label { color: #999; font-weight: 600; }");
        html.append(".info-value { font-weight: 700; color: #1a1a1a; }");
        html.append(".amount-block { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0; }");
        html.append(".amount-label { font-size: 12px; color: #059669; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }");
        html.append(".amount-label-ar { font-size: 11px; color: #059669; direction: rtl; margin-top: 2px; }");
        html.append(".amount-value { font-size: 32px; font-weight: 800; color: #059669; margin: 8px 0; }");
        html.append(".remaining-block { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 16px; }");
        html.append(".remaining-label { font-size: 12px; color: #EF4444; font-weight: 700; }");
        html.append(".remaining-label-ar { font-size: 11px; color: #EF4444; direction: rtl; margin-top: 2px; }");
        html.append(".remaining-value { font-size: 22px; font-weight: 800; color: #EF4444; margin-top: 6px; }");
        html.append(".paid-badge { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 16px; }");
        html.append(".paid-badge-text { font-size: 15px; font-weight: 800; color: #10B981; }");
        html.append(".footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #999; }");
        html.append("</style></head><body>");

        html.append("<div class='logo-top'>").append(logoImgTag).append("</div>");
        html.append("<div class='header'>")
            .append("<div><div class='business-name'>").append(businessName).append("</div>")
            .append(phoneDetail).append("</div>")
            .append("<div class='receipt-number'>#").append(commande.getNumeroCommande()).append("</div>")
            .append("</div>");

        html.append("<div class='title-block'><div class='title'>Reçu de Paiement</div><div class='title-ar'>وصل دفع</div></div>");

        html.append("<div class='info-row'><span class='info-label'>Date / التاريخ</span><span class='info-value'>").append(payDate).append("</span></div>");
        html.append("<div class='info-row'><span class='info-label'>Client / العميل</span><span class='info-value'>").append(client.getName()).append("</span></div>");
        if (!client.getPhones().isEmpty()) {
            html.append("<div class='info-row'><span class='info-label'>Téléphone / الهاتف</span><span class='info-value'>").append(client.getPhones().get(0).getPhoneNumber()).append("</span></div>");
        }
        html.append("<div class='info-row'><span class='info-label'>Mode / الطريقة</span><span class='info-value'>")
            .append(paiement.getModePaiement() != null ? paiement.getModePaiement().name() : "ESPECES").append("</span></div>");
        if (paiement.getNote() != null && !paiement.getNote().isEmpty()) {
            html.append("<div class='info-row'><span class='info-label'>Note</span><span class='info-value'>").append(paiement.getNote()).append("</span></div>");
        }
        html.append("<div class='info-row'><span class='info-label'>Total commande / إجمالي الطلب</span><span class='info-value'>").append(montantTotal.setScale(2, RoundingMode.HALF_UP)).append(" DH</span></div>");

        html.append("<div class='amount-block'>")
            .append("<div class='amount-label'>Montant payé / المبلغ المدفوع</div>")
            .append("<div class='amount-value'>").append(paiement.getMontant().setScale(2, RoundingMode.HALF_UP)).append(" DH</div>")
            .append("</div>");

        if (montantRestant.compareTo(BigDecimal.ZERO) > 0) {
            html.append("<div class='remaining-block'>")
                .append("<div class='remaining-label'>Reste à payer</div>")
                .append("<div class='remaining-label-ar'>المبلغ المتبقي</div>")
                .append("<div class='remaining-value'>").append(montantRestant.setScale(2, RoundingMode.HALF_UP)).append(" DH</div>")
                .append("</div>");
        } else {
            html.append("<div class='paid-badge'><div class='paid-badge-text'>✅ Entièrement payé · تم الدفع بالكامل</div></div>");
        }

        html.append("<div class='footer'>Merci pour votre confiance · شكراً لثقتكم<br/>")
            .append(businessName);
        if (!businessPhone.isEmpty()) html.append(" · ").append(businessPhone);
        html.append("</div></body></html>");
        return html.toString();
    }

    public String generateWhatsAppMessage(Commande commande, String receiptType) {
        SystemSettings settings = settingsService.getSettings();
        String businessName = settings.getAppName() != null ? settings.getAppName() : "Laundry";
        String businessPhone = settings.getBusinessPhone() != null ? settings.getBusinessPhone() : "";

        Client client = commande.getClient();
        List<CommandeTapis> items = commande.getCommandeTapis();
        BigDecimal montantTotal = commande.getMontantTotal();
        BigDecimal montantPaye = commande.getMontantPaye() != null ? commande.getMontantPaye() : BigDecimal.ZERO;
        BigDecimal montantRestant = montantTotal.subtract(montantPaye);
        
        StringBuilder msg = new StringBuilder();
        if (receiptType.equals("ORDER")) {
            msg.append("🧺 *BON DE COMMANDE*\n").append("━━━━━━━━━━━━━━━━━━━━\n\n");
        } else {
            msg.append("🚚 *BON DE LIVRAISON*\n").append("━━━━━━━━━━━━━━━━━━━━\n\n");
        }
        
        msg.append("📋 *").append(commande.getNumeroCommande()).append("*\n");
        msg.append("📅 ").append(commande.getDateCreation().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n\n");
        msg.append("👤 *Client:* ").append(client.getName()).append("\n");
        
        if (!client.getPhones().isEmpty()) {
            msg.append("📞 ").append(client.getPhones().get(0).getPhoneNumber()).append("\n");
        }
        
        msg.append("\n📦 *Articles:*\n");
        for (int i = 0; i < items.size(); i++) {
            CommandeTapis item = items.get(i);
            String name = item.getProduct() != null ? item.getProduct().getNom() : "Article " + (i+1);
            String tagNum = item.getTagNumero() != null ? item.getTagNumero() : "TAG-00" + (i+1);
            msg.append("  ").append(tagNum).append(" · ").append(name);
            if (item.getLargeur() != null && item.getHauteur() != null) {
                msg.append(" (").append(item.getLargeur()).append("×").append(item.getHauteur()).append("m = ").append(item.getLargeur().multiply(item.getHauteur()).setScale(2, RoundingMode.HALF_UP)).append("m²)");
            } else if (item.getQuantite() != null && item.getQuantite() > 1) {
                msg.append(" × ").append(item.getQuantite());
            }
            msg.append(" → *").append(item.getSousTotal().setScale(2, RoundingMode.HALF_UP)).append(" DH*\n");
        }
        
        msg.append("\n💰 *TOTAL: ").append(montantTotal.setScale(2, RoundingMode.HALF_UP)).append(" DH*\n");
        if (montantPaye.compareTo(BigDecimal.ZERO) > 0) {
            msg.append("✅ Payé: ").append(montantPaye.setScale(2, RoundingMode.HALF_UP)).append(" DH\n");
            if (montantRestant.compareTo(BigDecimal.ZERO) > 0) {
                msg.append("⚠️ *Reste à payer: ").append(montantRestant.setScale(2, RoundingMode.HALF_UP)).append(" DH*\n");
                msg.append("\n_المبلغ المتبقي: ").append(montantRestant.setScale(2, RoundingMode.HALF_UP)).append(" درهم_\n");
            } else {
                msg.append("✅ *Entièrement payé · تم الدفع بالكامل*\n");
            }
        }
        msg.append("\n_").append(businessName).append("_\n").append("📞 ").append(businessPhone);
        return msg.toString();
    }

    private String translateStatus(String status) {
        return switch (status) {
            case "PENDING_PICKUP"      -> "En attente · قيد الانتظار";
            case "PICKED_UP"           -> "Récupéré · تم الاستلام";
            case "IN_PROCESS"          -> "En traitement · قيد المعالجة";
            case "READY_FOR_DELIVERY"  -> "Prêt · جاهز للتسليم";
            case "DELIVERED"           -> "Livré · تم التسليم";
            case "PICKUP_FAILED"       -> "Échec collecte · فشل الاستلام";
            case "DELIVERY_FAILED"     -> "Échec livraison · فشل التسليم";
            case "CANCELLED"           -> "Annulé · ملغي";
            default -> status;
        };
    }

    public String buildThermalReceiptText(Commande commande, String receiptType) {
        SystemSettings settings = settingsService.getSettings();
        String businessName = settings.getAppName() != null ? settings.getAppName() : "Laundry";
        String businessPhone = settings.getBusinessPhone() != null ? settings.getBusinessPhone() : "";

        Client client = commande.getClient();
        List<CommandeTapis> items = commande.getCommandeTapis();
        BigDecimal montantTotal = commande.getMontantTotal();
        BigDecimal montantPaye = commande.getMontantPaye() != null ? commande.getMontantPaye() : BigDecimal.ZERO;
        BigDecimal montantRestant = montantTotal.subtract(montantPaye);

        String dateStr = commande.getDateCreation()
                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String sep  = "--------------------------------";
        String dsep = "================================";

        StringBuilder sb = new StringBuilder();
        sb.append(centerText(businessName, 32)).append("\n");
        sb.append(centerText(businessPhone, 32)).append("\n");
        sb.append(centerText(businessAddress, 32)).append("\n");
        sb.append(dsep).append("\n");
        sb.append(centerText(receiptType.equals("DELIVERY") ? "BON DE LIVRAISON" : "BON DE COMMANDE", 32)).append("\n");
        sb.append(sep).append("\n");
        sb.append(centerText(commande.getNumeroCommande(), 32)).append("\n");
        sb.append(centerText(dateStr, 32)).append("\n");
        sb.append(sep).append("\n");
        sb.append("CLIENT: ").append(client.getName()).append("\n");
        if (!client.getPhones().isEmpty()) {
            sb.append("TEL:    ").append(client.getPhones().get(0).getPhoneNumber()).append("\n");
        }
        sb.append(sep).append("\n");
        sb.append("ARTICLES:\n");
        for (int i = 0; i < items.size(); i++) {
            CommandeTapis item = items.get(i);
            String tag  = item.getTagNumero() != null ? item.getTagNumero() : "TAG-" + (i + 1);
            String name = item.getProduct() != null ? item.getProduct().getNom() : "Article " + (i + 1);
            String price = item.getSousTotal().setScale(2, RoundingMode.HALF_UP).toPlainString() + " DH";
            sb.append(rightAlign(tag + " " + name, price, 32)).append("\n");
        }
        sb.append(sep).append("\n");
        sb.append(rightAlign("TOTAL:", montantTotal.setScale(2, RoundingMode.HALF_UP).toPlainString() + " DH", 32)).append("\n");
        if (receiptType.equals("DELIVERY")) {
            sb.append(rightAlign("PAYE:", montantPaye.setScale(2, RoundingMode.HALF_UP).toPlainString() + " DH", 32)).append("\n");
            sb.append(rightAlign("RESTE:", montantRestant.setScale(2, RoundingMode.HALF_UP).toPlainString() + " DH", 32)).append("\n");
            if (montantRestant.compareTo(BigDecimal.ZERO) <= 0) {
                sb.append(centerText("*** ENTIEREMENT PAYE ***", 32)).append("\n");
            }
        }
        sb.append(dsep).append("\n");
        sb.append(centerText("Merci pour votre confiance", 32)).append("\n");
        sb.append(centerText("Shukran li thiqatikum", 32)).append("\n");
        sb.append("\n\n\n");
        return sb.toString();
    }

    private String centerText(String text, int width) {
        if (text == null) text = "";
        if (text.length() >= width) return text.substring(0, width);
        int padding = (width - text.length()) / 2;
        return " ".repeat(padding) + text;
    }

    private String rightAlign(String left, String right, int width) {
        int total = left.length() + right.length();
        if (total >= width) return left + " " + right;
        return left + " ".repeat(width - total) + right;
    }

    public String getClientWhatsAppPhone(Commande commande) {
        Client client = commande.getClient();
        if (client.getPhones().isEmpty()) return null;
        String phone = client.getPhones().get(0).getPhoneNumber();
        if (phone.startsWith("0")) return "+212" + phone.substring(1);
        return phone;
    }
}

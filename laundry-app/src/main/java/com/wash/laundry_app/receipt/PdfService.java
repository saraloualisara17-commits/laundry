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

import com.ibm.icu.text.ArabicShaping;
import com.ibm.icu.text.ArabicShapingException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
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

    // ConverterProperties with Arabic TTF bundled from classpath resources.
    // Standard PDF fonts (Helvetica/Times/Courier) have no Arabic glyphs.
    // System fonts on Railway Linux also lack Arabic. The NotoSansArabic TTF
    // is bundled in src/main/resources/fonts/ and loaded here so Arabic text
    // renders correctly in both AR and FR receipts.
    private ConverterProperties buildConverterProperties() {
        ConverterProperties props = new ConverterProperties();
        try {
            FontProvider fontProvider = new FontProvider();
            fontProvider.addStandardPdfFonts();
            fontProvider.addSystemFonts();

            // Load bundled Arabic-capable font from classpath
            try (InputStream is = getClass().getResourceAsStream("/fonts/NotoSansArabic-Regular.ttf")) {
                if (is != null) {
                    byte[] fontBytes = is.readAllBytes();
                    fontProvider.addFont(fontBytes, "Identity-H");
                    log.debug("[pdf] NotoSansArabic font loaded from classpath ({} bytes)", fontBytes.length);
                } else {
                    log.warn("[pdf] NotoSansArabic-Regular.ttf not found in classpath /fonts/ — Arabic may not render");
                }
            }

            props.setFontProvider(fontProvider);
            log.debug("[pdf] FontProvider configured with standard + system + Arabic fonts");
        } catch (Exception e) {
            log.warn("[pdf] Could not configure FontProvider ({}), using iText default. Arabic may not render.", e.getMessage());
        }
        return props;
    }

    public byte[] generatePdf(Commande commande, String receiptType) {
        return generatePdf(commande, receiptType, "fr");
    }

    public byte[] generatePdf(Commande commande, String receiptType, String lang) {
        String resolvedLang = (lang != null && lang.equalsIgnoreCase("ar")) ? "ar" : "fr";
        log.info("[pdf] Generating {} PDF — orderId={} orderNum={} lang={}",
                receiptType, commande.getId(), commande.getNumeroCommande(), resolvedLang);
        long t0 = System.currentTimeMillis();
        try {
            String html = buildReceiptHtml(commande, receiptType, resolvedLang);
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

    /**
     * Shape Arabic letters for joining (logical order).
     *
     * iText html2pdf handles BiDi reordering itself when the HTML has dir="rtl"
     * and the font has the required OpenType GSUB/GPOS tables (NotoSansArabic has them).
     * We ONLY apply ArabicShaping to join the letters (isolated → initial/medial/final forms).
     * We do NOT call Bidi.writeReordered() — that would pre-reverse the string and then
     * iText would reverse it again, producing corrupted doubled-reversal output.
     *
     * For mixed strings (Arabic label + Latin/number value) we keep them in separate
     * HTML spans with explicit dir attributes so the browser/iText BiDi algorithm
     * handles each run independently. Never pre-process mixed strings as one unit.
     */
    private String shapeArabic(String text) {
        if (text == null || text.isEmpty()) return text;
        // Skip if no Arabic characters present
        boolean hasArabic = false;
        for (int i = 0; i < text.length(); i++) {
            int cp = text.codePointAt(i);
            if ((cp >= 0x0600 && cp <= 0x06FF) || (cp >= 0xFB50 && cp <= 0xFDFF) || (cp >= 0xFE70 && cp <= 0xFEFF)) {
                hasArabic = true;
                break;
            }
        }
        if (!hasArabic) return text;
        try {
            // LETTERS_SHAPE: join Arabic letters into contextual forms (initial/medial/final/isolated)
            // TEXT_DIRECTION_LOGICAL: input is in logical (storage) order — iText will do visual reorder via dir=rtl
            // LENGTH_FIXED_SPACES_NEAR: keep string length stable (no character insertion)
            ArabicShaping shaper = new ArabicShaping(
                    ArabicShaping.LETTERS_SHAPE |
                    ArabicShaping.TEXT_DIRECTION_LOGICAL |
                    ArabicShaping.LENGTH_FIXED_SPACES_NEAR
            );
            return shaper.shape(text);
        } catch (ArabicShapingException e) {
            log.warn("[pdf] Arabic shaping failed for '{}': {}", text, e.getMessage());
            return text;
        }
    }

    /**
     * Wrap an Arabic-only label and a LTR value (number, Latin text, date) into
     * separate spans so iText BiDi handles each run correctly.
     * Output: <span dir="rtl">label</span><span dir="ltr">value</span>
     */
    private String arLabelValue(String arLabel, String ltrValue) {
        return "<span dir='rtl'>" + arLabel + "</span>" +
               "<span dir='ltr' style='unicode-bidi:embed;'>" + ltrValue + "</span>";
    }

    private String buildReceiptHtml(Commande commande, String receiptType) {
        return buildReceiptHtml(commande, receiptType, "fr");
    }

    private String buildReceiptHtml(Commande commande, String receiptType, String lang) {
        boolean ar = "ar".equals(lang);

        SystemSettings settings = settingsService.getSettings();
        String businessName  = settings.getAppName()      != null ? settings.getAppName()      : "ASTRA PROPRE";
        String businessPhone = settings.getBusinessPhone() != null ? settings.getBusinessPhone() : "";
        String logoUrl       = settings.getLogoUrl()       != null ? settings.getLogoUrl()       : "";

        Client             client   = commande.getClient();
        List<CommandeTapis> items   = commande.getCommandeTapis();
        List<Paiement>      payments = commande.getPaiements();

        BigDecimal montantTotal   = commande.getMontantTotal();
        BigDecimal montantPaye    = commande.getMontantPaye() != null ? commande.getMontantPaye() : BigDecimal.ZERO;
        BigDecimal montantRestant = montantTotal.subtract(montantPaye);

        String qrBase64     = generateQrCodeBase64(frontendUrl + "/order/" + commande.getId());
        String dateCreation = commande.getDateCreation().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

        // ── labels (single language) ────────────────────────────────────────────
        String labelClient   = ar ? "معلومات العميل"    : "Informations Client";
        String labelNom      = ar ? "الاسم"              : "Nom";
        String labelTel      = ar ? "الهاتف"             : "Téléphone";
        String labelAdresse  = ar ? "العنوان"            : "Adresse";
        String labelArticles = ar ? "المنتجات"           : "Articles";
        String labelArticle  = ar ? "المنتج"             : "Article";
        String labelDetails  = ar ? "التفاصيل"           : "Détails";
        String labelPrix     = ar ? "السعر"              : "Prix";
        String labelDate     = ar ? "التاريخ"            : "Date";
        String labelMode     = ar ? "النوع"              : "Mode";
        String labelStatut   = ar ? "الحالة"             : "Statut";
        String labelSousTotal = ar ? "المجموع الفرعي"   : "Sous-total";
        String labelRemise   = ar ? "إجمالي الخصم"      : "Remise totale";
        String labelTotal    = ar ? "الإجمالي"           : "TOTAL";
        String labelPaye     = ar ? "المدفوع"            : "Payé";
        String labelReste    = ar ? "المتبقي للدفع"      : "Reste à payer";
        String labelPaiements = ar ? "سجل المدفوعات"    : "Historique des paiements";
        String labelTentatives = ar ? "سجل المحاولات"   : "Historique des tentatives";
        String labelPickupDate = ar ? "موعد الاستلام"   : "Date de collecte prévue";
        String labelLivreur  = ar ? "السائق"             : "Livreur assigné";
        String labelSigClient = ar ? "توقيع العميل"      : "Signature client";
        String labelSigLivr  = ar ? "توقيع السائق"       : "Signature livreur";
        String labelSignLine = ar ? "الاسم والتوقيع"     : "Nom et signature";
        String labelPaiement  = ar ? "دفعة"              : "Paiement";
        String labelEntPaye  = ar ? "تم الدفع بالكامل"  : "Entièrement payé";
        String labelSolde    = ar ? "المبلغ المتبقي للدفع" : "Solde restant à payer";
        String labelNoAddr   = ar ? "لا يوجد عنوان"     : "Pas d'adresse";
        String labelCancelled = ar ? "تم إلغاء هذا الطلب" : "COMMANDE ANNULÉE";
        String labelPickupFail = ar ? "فشل عملية الاستلام" : "ÉCHEC DE COLLECTE";
        String labelDelivFail  = ar ? "فشل عملية التسليم"  : "ÉCHEC DE LIVRAISON";
        String footerThanks  = ar ? "شكراً لثقتكم"       : "Merci pour votre confiance";
        String footerContact = ar ? "للاستفسار يرجى التواصل معنا" : "Pour toute question: " + businessPhone;

        String modeLabel;
        if (commande.getMode() == null) {
            modeLabel = "—";
        } else if (commande.getMode().equals("immediate")) {
            modeLabel = ar ? "في المحل" : "Au local";
        } else {
            modeLabel = ar ? "هاتفي" : "Téléphonique";
        }

        // Shape all Arabic strings so iText renders joined, right-to-left glyphs
        if (ar) {
            labelClient    = shapeArabic(labelClient);
            labelNom       = shapeArabic(labelNom);
            labelTel       = shapeArabic(labelTel);
            labelAdresse   = shapeArabic(labelAdresse);
            labelArticles  = shapeArabic(labelArticles);
            labelArticle   = shapeArabic(labelArticle);
            labelDetails   = shapeArabic(labelDetails);
            labelPrix      = shapeArabic(labelPrix);
            labelDate      = shapeArabic(labelDate);
            labelMode      = shapeArabic(labelMode);
            labelStatut    = shapeArabic(labelStatut);
            labelSousTotal = shapeArabic(labelSousTotal);
            labelRemise    = shapeArabic(labelRemise);
            labelTotal     = shapeArabic(labelTotal);
            labelPaye      = shapeArabic(labelPaye);
            labelReste     = shapeArabic(labelReste);
            labelPaiements = shapeArabic(labelPaiements);
            labelTentatives= shapeArabic(labelTentatives);
            labelPickupDate= shapeArabic(labelPickupDate);
            labelLivreur   = shapeArabic(labelLivreur);
            labelSigClient = shapeArabic(labelSigClient);
            labelSigLivr   = shapeArabic(labelSigLivr);
            labelSignLine  = shapeArabic(labelSignLine);
            labelPaiement  = shapeArabic(labelPaiement);
            labelEntPaye   = shapeArabic(labelEntPaye);
            labelSolde     = shapeArabic(labelSolde);
            labelNoAddr    = shapeArabic(labelNoAddr);
            labelCancelled = shapeArabic(labelCancelled);
            labelPickupFail= shapeArabic(labelPickupFail);
            labelDelivFail = shapeArabic(labelDelivFail);
            footerThanks   = shapeArabic(footerThanks);
            footerContact  = shapeArabic(footerContact);
            modeLabel      = shapeArabic(modeLabel);
            businessName   = shapeArabic(businessName);
        }

        // ── HTML/CSS ────────────────────────────────────────────────────────────
        // iText html2pdf has limited flex/grid support — use table-based layout
        // for anything that needs columns, and block elements everywhere else.
        String dir        = ar ? "rtl" : "ltr";
        String borderSide = ar ? "border-right" : "border-left";
        String thAlign    = ar ? "right" : "left";
        String priceAlign = ar ? "left"  : "right";

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html dir='").append(dir).append("'><head><meta charset='UTF-8'/><style>");
        String fontFamily = ar ? "'Noto Sans Arabic', Arial, sans-serif" : "Arial, sans-serif";
        html.append("* { margin:0; padding:0; box-sizing:border-box; }");
        html.append("body { font-family: ").append(fontFamily).append("; font-size:13px; color:#1a1a1a; background:white; padding:20px; max-width:600px; margin:0 auto; direction:").append(dir).append("; unicode-bidi:embed; }");
        html.append(".logo-top { text-align:center; padding-bottom:16px; margin-bottom:4px; }");
        // Header: use a table so iText reliably places QR on the opposite side
        html.append(".header-table { width:100%; border-collapse:collapse; padding-bottom:20px; border-bottom:2px solid #0D7377; margin-bottom:20px; }");
        html.append(".business-name { font-size:22px; font-weight:800; color:#0D7377; margin-bottom:4px; }");
        html.append(".business-detail { font-size:12px; color:#666; margin-top:2px; }");
        html.append(".qr-code { width:80px; height:80px; }");
        html.append(".receipt-number { font-size:11px; color:#999; margin-top:4px; text-align:center; }");
        html.append(".section-header { background:#f0fafa; ").append(borderSide).append(":4px solid #0D7377; padding:8px 12px; margin:16px 0 10px; font-size:13px; font-weight:700; color:#0D7377; }");
        // Client info: table-based layout (no CSS grid — iText support is partial)
        html.append(".client-table { width:100%; border-collapse:collapse; margin-bottom:12px; }");
        html.append(".client-table td { padding:4px 6px; vertical-align:top; width:50%; }");
        html.append(".info-label { font-size:10px; font-weight:700; color:#999; text-transform:uppercase; letter-spacing:0.5px; display:block; }");
        html.append(".info-value { font-size:13px; font-weight:600; color:#1a1a1a; display:block; margin-top:2px; }");
        html.append(".order-meta { background:#f9f9f9; border-radius:8px; padding:12px; margin-bottom:16px; }");
        html.append(".order-ref { font-size:16px; font-weight:800; color:#0D7377; margin-bottom:8px; }");
        // Meta rows: use table for reliable two-column layout in both directions
        html.append(".meta-table { width:100%; border-collapse:collapse; }");
        html.append(".meta-table td { font-size:12px; color:#666; padding:2px 0; width:50%; }");
        html.append(".items-table { width:100%; border-collapse:collapse; margin-bottom:16px; }");
        // text-align:start maps to right in RTL, left in LTR — direction-agnostic
        html.append(".items-table th { background:#0D7377; color:white; padding:8px 10px; font-size:11px; font-weight:700; text-align:start; }");
        html.append(".items-table td { padding:8px 10px; font-size:12px; border-bottom:1px solid #f0f0f0; vertical-align:top; text-align:start; }");
        html.append(".items-table tr:nth-child(even) td { background:#fafafa; }");
        html.append(".item-name { font-weight:600; color:#1a1a1a; }");
        html.append(".item-detail { font-size:11px; color:#888; margin-top:2px; }");
        html.append(".discount-text { color:#EF4444; font-size:11px; }");
        // Price is always LTR (numbers + DH) — explicit dir=ltr on the cell
        html.append(".price-cell { font-weight:700; color:#0D7377; text-align:end; white-space:nowrap; direction:ltr; unicode-bidi:embed; }");
        // Totals: label column starts on the natural start edge, value on end
        html.append(".totals-section { width:100%; margin-bottom:16px; }");
        html.append(".total-row-table { width:100%; border-collapse:collapse; }");
        html.append(".total-row-table td { padding:6px 8px; font-size:13px; border-bottom:1px solid #f0f0f0; }");
        html.append(".total-row-table .lbl { text-align:start; }");
        html.append(".total-row-table .val { text-align:end; font-weight:600; white-space:nowrap; direction:ltr; unicode-bidi:embed; }");
        html.append(".grand td { border-bottom:2px solid #0D7377; border-top:2px solid #0D7377; padding:10px 8px; font-size:16px; font-weight:800; color:#0D7377; }");
        html.append(".paid td { color:#10B981; font-weight:700; }");
        html.append(".remaining td { color:#EF4444; font-weight:700; font-size:15px; }");
        // Payment rows: table for reliable amount/date placement
        html.append(".payment-row-table { width:100%; border-collapse:collapse; background:#f0faf5; border-radius:8px; margin-bottom:6px; ").append(borderSide).append(":3px solid #10B981; padding:8px 12px; }");
        html.append(".payment-amount { font-weight:700; color:#10B981; font-size:13px; }");
        html.append(".payment-note { font-size:11px; color:#666; }");
        html.append(".payment-date { font-size:11px; color:#999; text-align:").append(priceAlign).append("; }");
        html.append(".unpaid-alert { background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:14px; margin-bottom:16px; text-align:center; }");
        html.append(".unpaid-title { font-size:15px; font-weight:800; color:#EF4444; margin-bottom:4px; }");
        html.append(".unpaid-amount { font-size:22px; font-weight:800; color:#EF4444; margin-top:6px; }");
        html.append(".paid-badge { background:#ECFDF5; border:1px solid #A7F3D0; border-radius:8px; padding:14px; text-align:center; margin-bottom:16px; }");
        html.append(".paid-badge-text { font-size:16px; font-weight:800; color:#10B981; }");
        // Pickup box: table-based
        html.append(".pickup-table { width:100%; border-collapse:collapse; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:8px; padding:12px; margin-bottom:16px; }");
        html.append(".pickup-label { font-size:12px; color:#3B82F6; font-weight:700; display:block; }");
        html.append(".pickup-date { font-size:14px; font-weight:800; color:#1D4ED8; margin-top:2px; display:block; }");
        html.append(".footer { margin-top:24px; padding-top:16px; border-top:1px solid #e0e0e0; text-align:center; }");
        html.append(".footer-text { font-size:12px; color:#999; margin-bottom:4px; }");
        html.append(".footer-brand { font-size:13px; font-weight:700; color:#0D7377; margin-top:8px; }");
        html.append(".status-banner { padding:14px 16px; border-radius:8px; margin-bottom:16px; text-align:center; }");
        html.append(".status-banner.cancelled { background:#FEF2F2; border:2px solid #EF4444; color:#EF4444; }");
        html.append(".status-banner.failed    { background:#FFF7ED; border:2px solid #F97316; color:#EA580C; }");
        html.append(".status-title { font-size:16px; font-weight:800; }");
        html.append(".attempt-row { background:#FFF7ED; ").append(borderSide).append(":3px solid #F97316; border-radius:6px; padding:10px 12px; margin-bottom:8px; }");
        html.append(".attempt-type { font-size:11px; font-weight:700; color:#EA580C; text-transform:uppercase; letter-spacing:0.5px; }");
        html.append(".attempt-reason { font-size:13px; font-weight:600; color:#1a1a1a; margin-top:3px; }");
        html.append(".attempt-meta { font-size:11px; color:#888; margin-top:4px; }");
        // Signature: table for side-by-side boxes
        html.append(".signature-table { width:100%; border-collapse:collapse; margin:16px 0; }");
        html.append(".signature-table td { width:50%; padding:0 10px 0 0; vertical-align:top; }");
        html.append(".signature-table td:last-child { padding:0 0 0 10px; }");
        html.append(".signature-box { border:1px solid #e0e0e0; border-radius:8px; padding:12px; }");
        html.append(".signature-label { font-size:11px; font-weight:700; color:#999; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:36px; display:block; }");
        html.append(".signature-line { border-top:1px solid #ccc; margin-top:4px; padding-top:4px; font-size:10px; color:#bbb; text-align:center; }");
        html.append("</style></head><body>");

        // ── Logo + header ───────────────────────────────────────────────────────
        String logoImgTag = logoToBase64ImgTag(logoUrl);
        String phoneDetail = (businessPhone != null && !businessPhone.isEmpty())
                ? "<div class='business-detail'>&#128222; " + businessPhone + "</div>" : "";
        String qrTag = qrBase64.isEmpty() ? "" : "<img src='data:image/png;base64," + qrBase64 + "' class='qr-code'/>";

        html.append("<div class='logo-top'>").append(logoImgTag).append("</div>");
        // Use a table so iText reliably puts business info and QR on opposite ends
        // In RTL the first cell is on the right, second on the left — which is correct.
        html.append("<table class='header-table'><tr>")
            .append("<td style='vertical-align:top;'>")
            .append("<div class='business-name'>").append(businessName).append("</div>")
            .append(phoneDetail)
            .append("<div class='business-detail'>&#128205; ").append(businessAddress).append("</div>")
            .append("</td>")
            .append("<td style='vertical-align:top; text-align:").append(priceAlign).append("; width:100px;'>")
            .append(qrTag)
            .append("<div class='receipt-number'>#").append(commande.getNumeroCommande()).append("</div>")
            .append("</td></tr></table>");

        // ── Status banners ──────────────────────────────────────────────────────
        CommandeStatus currentStatus = commande.getStatus();
        if (currentStatus == CommandeStatus.CANCELLED) {
            html.append("<div class='status-banner cancelled'><div class='status-title'>").append(labelCancelled).append("</div></div>");
        } else if (currentStatus == CommandeStatus.PICKUP_FAILED) {
            html.append("<div class='status-banner failed'><div class='status-title'>").append(labelPickupFail).append("</div></div>");
        } else if (currentStatus == CommandeStatus.DELIVERY_FAILED) {
            html.append("<div class='status-banner failed'><div class='status-title'>").append(labelDelivFail).append("</div></div>");
        }

        // ── Order meta ──────────────────────────────────────────────────────────
        String statusText = ar ? shapeArabic(translateStatus(commande.getStatus().name(), true))
                               : translateStatus(commande.getStatus().name(), false);
        html.append("<div class='order-meta'>")
            .append("<div class='order-ref' dir='ltr'>").append(commande.getNumeroCommande()).append("</div>")
            .append("<table class='meta-table'><tr>")
            // Date: Arabic label + LTR date value in separate spans
            .append("<td>").append(ar ? arLabelValue(labelDate, ": " + dateCreation)
                                      : labelDate + ": <strong>" + dateCreation + "</strong>").append("</td>")
            .append("<td>").append(ar ? arLabelValue(labelMode, ": " + modeLabel)
                                      : labelMode + ": <strong>" + modeLabel + "</strong>").append("</td>")
            .append("</tr><tr>")
            .append("<td colspan='2'>").append(labelStatut).append(": <strong>").append(statusText).append("</strong></td>")
            .append("</tr></table></div>");

        // ── Scheduled pickup box ────────────────────────────────────────────────
        if (commande.getScheduledPickupDate() != null) {
            String pickupDate = commande.getScheduledPickupDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            String driverName = commande.getLivreur() != null ? (ar ? shapeArabic(commande.getLivreur().getName()) : commande.getLivreur().getName()) : "—";
            html.append("<table class='pickup-table'><tr>")
                .append("<td style='vertical-align:top;'>")
                .append("<span class='pickup-label'>").append(labelPickupDate).append("</span>")
                .append("<span class='pickup-date'>").append(pickupDate).append("</span>")
                .append("</td>")
                .append("<td style='vertical-align:top; text-align:").append(priceAlign).append(";'>")
                .append("<span class='pickup-label'>").append(labelLivreur).append("</span>")
                .append("<span class='pickup-date'>").append(driverName).append("</span>")
                .append("</td></tr></table>");
        }

        // ── Client info ─────────────────────────────────────────────────────────
        String phone   = !client.getPhones().isEmpty()    ? client.getPhones().get(0).getPhoneNumber()    : "—";
        String address = !client.getAddresses().isEmpty() ? client.getAddresses().get(0).getAddress()     : labelNoAddr;
        String clientName = ar ? shapeArabic(client.getName()) : client.getName();
        if (ar) address = shapeArabic(address);

        html.append("<div class='section-header'>&#128100; ").append(labelClient).append("</div>")
            .append("<table class='client-table'><tr>")
            .append("<td><span class='info-label'>").append(labelNom).append("</span>")
                // Client name may be Arabic or Latin — wrap in bdi to auto-detect
                .append("<span class='info-value'><bdi>").append(clientName).append("</bdi></span></td>")
            .append("<td><span class='info-label'>").append(labelTel).append("</span>")
                // Phone is always LTR digits
                .append("<span class='info-value' dir='ltr' style='unicode-bidi:embed;'>").append(phone).append("</span></td>")
            .append("</tr><tr>")
            .append("<td colspan='2'><span class='info-label'>").append(labelAdresse).append("</span>")
                // Address may be Arabic or Latin
                .append("<span class='info-value'><bdi>").append(address).append("</bdi></span></td>")
            .append("</tr></table>");

        // ── Items table ─────────────────────────────────────────────────────────
        html.append("<div class='section-header'>&#128230; ").append(labelArticles).append("</div>")
            .append("<table class='items-table'><thead><tr>")
            .append("<th>").append(labelArticle).append("</th>")
            .append("<th>").append(labelDetails).append("</th>")
            .append("<th style='text-align:").append(priceAlign).append("'>").append(labelPrix).append("</th>")
            .append("</tr></thead><tbody>");

        for (int i = 0; i < items.size(); i++) {
            CommandeTapis item = items.get(i);
            String productName = item.getProduct() != null ? item.getProduct().getNom() : "—";
            if (ar) productName = shapeArabic(productName);
            String details = "";
            if (item.getLargeur() != null && item.getHauteur() != null) {
                details = item.getLargeur() + "m × " + item.getHauteur() + "m = "
                        + item.getLargeur().multiply(item.getHauteur()).setScale(2, RoundingMode.HALF_UP) + "m²";
            } else if (item.getQuantite() != null && item.getQuantite() > 1) {
                details = item.getQuantite() + (ar ? shapeArabic(" قطع") : " pièces");
            }
            if (item.getCouleur() != null && !item.getCouleur().isEmpty()) {
                details += (details.isEmpty() ? "" : " · ") + item.getCouleur();
            }
            String discountHtml = "";
            if (item.getRemiseMontant() != null && item.getRemiseMontant().compareTo(BigDecimal.ZERO) > 0) {
                String remiseLabel = ar ? shapeArabic("خصم") : "Remise";
                String remiseRaison = item.getRemiseRaison() != null
                        ? (ar ? shapeArabic(item.getRemiseRaison()) : item.getRemiseRaison()) : null;
                discountHtml = "<div class='discount-text'>" + remiseLabel + ": -"
                        + item.getRemiseMontant() + " DH"
                        + (remiseRaison != null ? " (" + remiseRaison + ")" : "")
                        + "</div>";
            }
            html.append("<tr><td><div class='item-name'>").append(productName).append("</div>").append(discountHtml).append("</td>")
                .append("<td class='item-detail'>").append(details).append("</td>")
                .append("<td class='price-cell'>").append(item.getSousTotal().setScale(2, RoundingMode.HALF_UP)).append(" DH</td></tr>");
        }
        html.append("</tbody></table>");

        // ── Totals ──────────────────────────────────────────────────────────────
        BigDecimal totalDiscount = items.stream()
                .map(i -> i.getRemiseMontant() != null ? i.getRemiseMontant() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Totals table: uniform structure — dir="rtl" on body makes label start on
        // the right and amount on the left automatically. No manual column swap needed.
        html.append("<div class='totals-section'><table class='total-row-table'>");
        if (totalDiscount.compareTo(BigDecimal.ZERO) > 0) {
            html.append("<tr><td class='lbl'>").append(labelSousTotal).append("</td>")
                .append("<td class='val' dir='ltr'>").append(montantTotal.add(totalDiscount).setScale(2, RoundingMode.HALF_UP)).append(" DH</td></tr>")
                .append("<tr class='discount-text'><td class='lbl'>").append(labelRemise).append("</td>")
                .append("<td class='val' dir='ltr'>-").append(totalDiscount.setScale(2, RoundingMode.HALF_UP)).append(" DH</td></tr>");
        }
        html.append("<tr class='grand'><td class='lbl'>").append(labelTotal).append("</td>")
            .append("<td class='val' dir='ltr'>").append(montantTotal.setScale(2, RoundingMode.HALF_UP)).append(" DH</td></tr>");

        if (montantPaye.compareTo(BigDecimal.ZERO) > 0) {
            html.append("<tr class='paid'><td class='lbl'>").append(labelPaye).append("</td>")
                .append("<td class='val' dir='ltr'>").append(montantPaye.setScale(2, RoundingMode.HALF_UP)).append(" DH</td></tr>");
            if (montantRestant.compareTo(BigDecimal.ZERO) > 0) {
                html.append("<tr class='remaining'><td class='lbl'>").append(labelReste).append("</td>")
                    .append("<td class='val' dir='ltr'>").append(montantRestant.setScale(2, RoundingMode.HALF_UP)).append(" DH</td></tr>");
            }
        }
        html.append("</table></div>");

        // ── Payment history ─────────────────────────────────────────────────────
        if (payments != null && !payments.isEmpty()) {
            html.append("<div class='section-header'>&#128176; ").append(labelPaiements).append("</div><div>");
            for (Paiement p : payments) {
                String payDate = p.getDatePaiement().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
                String note = (p.getNote() != null && !p.getNote().isEmpty())
                        ? (ar ? shapeArabic(p.getNote()) : p.getNote()) : labelPaiement;
                // Uniform structure — body dir="rtl" places amount on left, date on right for AR
                html.append("<table class='payment-row-table'><tr>")
                    .append("<td><div class='payment-amount' dir='ltr'>+").append(p.getMontant().setScale(2, RoundingMode.HALF_UP)).append(" DH</div>")
                    .append("<div class='payment-note'>").append(note).append("</div></td>")
                    .append("<td class='payment-date' dir='ltr' style='width:130px;'>").append(payDate).append("</td>")
                    .append("</tr></table>");
            }
            html.append("</div>");
            if (montantRestant.compareTo(BigDecimal.ZERO) > 0) {
                html.append("<div class='unpaid-alert'><div class='unpaid-title'>").append(labelSolde).append("</div>")
                    .append("<div class='unpaid-amount'>").append(montantRestant.setScale(2, RoundingMode.HALF_UP)).append(" DH</div></div>");
            } else {
                html.append("<div class='paid-badge'><div class='paid-badge-text'>&#10003; ").append(labelEntPaye).append("</div></div>");
            }
        } else if (montantRestant.compareTo(BigDecimal.ZERO) > 0 && montantPaye.compareTo(BigDecimal.ZERO) == 0) {
            html.append("<div class='unpaid-alert'><div class='unpaid-title'>").append(labelSolde).append("</div>")
                .append("<div class='unpaid-amount'>").append(montantRestant.setScale(2, RoundingMode.HALF_UP)).append(" DH</div></div>");
        }

        // ── Failed attempts ─────────────────────────────────────────────────────
        List<OrderAttempt> attempts = commande.getAttempts();
        if (attempts != null && !attempts.isEmpty()) {
            html.append("<div class='section-header'>&#9888; ").append(labelTentatives).append("</div>");
            for (OrderAttempt attempt : attempts) {
                String attemptDate = attempt.getAttemptedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
                String typeLabel = attempt.getAttemptType() == AttemptType.PICKUP
                        ? (ar ? shapeArabic("استلام") : "Collecte")
                        : (ar ? shapeArabic("تسليم")  : "Livraison");
                String reason = ar ? shapeArabic(OrderAttempt.getReasonLabel(attempt.getReason(), "AR"))
                                   : OrderAttempt.getReasonLabel(attempt.getReason(), "FR");
                // meta is always LTR (dates, names, numbers)
                String meta = attemptDate;
                if (attempt.getDriver() != null) meta += " · " + attempt.getDriver().getName();
                if (attempt.getNotes() != null && !attempt.getNotes().isEmpty()) meta += " · " + attempt.getNotes();
                if (attempt.getRescheduledTo() != null) {
                    String reschedLabel = ar ? shapeArabic("موعد جديد") : "Reporté";
                    meta += " · " + reschedLabel + ": " + attempt.getRescheduledTo().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
                }
                html.append("<div class='attempt-row'>")
                    .append("<div class='attempt-type'>").append(typeLabel).append("</div>")
                    .append("<div class='attempt-reason'>").append(reason).append("</div>")
                    .append("<div class='attempt-meta'>").append(meta).append("</div></div>");
            }
        }

        // ── Signature boxes (delivery only) ─────────────────────────────────────
        if (receiptType.equals("DELIVERY")) {
            html.append("<table class='signature-table'><tr>")
                .append("<td><div class='signature-box'><span class='signature-label'>").append(labelSigClient).append("</span>")
                .append("<div class='signature-line'>").append(labelSignLine).append("</div></div></td>")
                .append("<td><div class='signature-box'><span class='signature-label'>").append(labelSigLivr).append("</span>")
                .append("<div class='signature-line'>").append(labelSignLine).append("</div></div></td>")
                .append("</tr></table>");
        }

        // ── Footer ──────────────────────────────────────────────────────────────
        html.append("<div class='footer'>")
            .append("<div class='footer-text'>").append(footerThanks).append("</div>")
            .append("<div class='footer-text'>").append(footerContact).append("</div>")
            .append("<div class='footer-brand'>").append(businessName).append("</div>")
            .append("</div>");

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
        String businessName = settings.getAppName() != null ? settings.getAppName() : "ASTRA PROPRE";
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
        String businessName = settings.getAppName() != null ? settings.getAppName() : "ASTRA PROPRE";
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
        return translateStatus(status, false);
    }

    private String translateStatus(String status, boolean ar) {
        if (ar) return switch (status) {
            case "PENDING_PICKUP"     -> "قيد الانتظار";
            case "PICKED_UP"          -> "تم الاستلام";
            case "IN_PROCESS"         -> "قيد المعالجة";
            case "READY_FOR_DELIVERY" -> "جاهز للتسليم";
            case "DELIVERED"          -> "تم التسليم";
            case "PICKUP_FAILED"      -> "فشل الاستلام";
            case "DELIVERY_FAILED"    -> "فشل التسليم";
            case "CANCELLED"          -> "ملغي";
            default -> status;
        };
        return switch (status) {
            case "PENDING_PICKUP"     -> "En attente";
            case "PICKED_UP"          -> "Récupéré";
            case "IN_PROCESS"         -> "En traitement";
            case "READY_FOR_DELIVERY" -> "Prêt à livrer";
            case "DELIVERED"          -> "Livré";
            case "PICKUP_FAILED"      -> "Échec collecte";
            case "DELIVERY_FAILED"    -> "Échec livraison";
            case "CANCELLED"          -> "Annulé";
            default -> status;
        };
    }

    public String buildThermalReceiptText(Commande commande, String receiptType) {
        SystemSettings settings = settingsService.getSettings();
        String businessName = settings.getAppName() != null ? settings.getAppName() : "ASTRA PROPRE";
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

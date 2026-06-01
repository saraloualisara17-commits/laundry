import { format } from 'date-fns';
import { fr, arDZ as ar } from 'date-fns/locale';
import * as FileSystem from 'expo-file-system/legacy';

// ─── Logo fetcher ─────────────────────────────────────────────────────────────
export async function fetchLogoBase64(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    const localUri = `${FileSystem.cacheDirectory}receipt_logo_cache`;
    const result = await FileSystem.downloadAsync(logoUrl, localUri);
    if (result.status !== 200) return null;
    const base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const lower = logoUrl.toLowerCase();
    const mime = lower.endsWith('.png') ? 'image/png'
               : lower.endsWith('.webp') ? 'image/webp'
               : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReceiptItem {
  productNom?: string;
  quantite?: number;
  surface?: number | string;
  largeur?: number | string;
  hauteur?: number | string;
  prixUnitaire?: number | string;
  sousTotal?: number | string;
  remiseMontant?: number | string;
  remiseRaison?: string;
  tagNumero?: string;
}

interface ReceiptClient {
  id?: number | string;
  name?: string;
  phones?: { phoneNumber: string }[];
  phone?: string;
  addresses?: { address?: string }[];
}

interface ReceiptOrder {
  numeroCommande?: string;
  client?: ReceiptClient;
  commandeTapis?: ReceiptItem[];
  montantTotal?: number | string;
  montantPaye?: number | string;
  scheduledPickupDate?: string | null;
  scheduledDeliveryDate?: string | null;
  notes?: string | null;
  status?: string;
  deliveryAddress?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | string | undefined | null, decimals = 2): string {
  const n = parseFloat(String(val ?? 0));
  return isNaN(n) ? '0.00' : n.toFixed(decimals);
}

function fmtDate(iso: string | null | undefined, lang: 'fr' | 'ar'): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'dd MMM yyyy, HH:mm', { locale: lang === 'ar' ? ar : fr });
  } catch {
    return iso;
  }
}

function clientPhone(client?: ReceiptClient): string {
  if (!client) return '';
  if (client.phone) return client.phone;
  if (Array.isArray(client.phones) && client.phones.length > 0) return client.phones[0].phoneNumber;
  return '';
}

function clientAddress(order: ReceiptOrder): string {
  if (order.deliveryAddress) return order.deliveryAddress;
  const addr = order.client?.addresses?.[0]?.address;
  return addr || '';
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildReceiptHtml(
  order: ReceiptOrder,
  lang: 'fr' | 'ar',
  logoBase64?: string | null,
  businessName?: string | null,
): string {
  const isAr = lang === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';
  const items: ReceiptItem[] = order.commandeTapis ?? [];
  const name = businessName || 'ASTRA PROPRE';

  const logoTag = logoBase64
    ? `<img src="${logoBase64}" alt="logo" style="height:100px;width:auto;object-fit:contain;display:block;" />`
    : `<div style="font-size:26px;font-weight:800;color:#1a1a1a;letter-spacing:1px;">${name}</div>`;

  const total     = parseFloat(String(order.montantTotal ?? 0));
  const paid      = parseFloat(String(order.montantPaye  ?? 0));
  const remaining = Math.max(0, total - paid);

  const L = {
    facture:     isAr ? 'فاتورة'           : 'FACTURE',
    receiptNum:  isAr ? 'رقم الوصل'        : 'Numéro de reçu',
    codeClient:  isAr ? 'كود العميل'       : 'Code client',
    pickedUp:    isAr ? 'تاريخ الاستلام'   : 'Ramassée le',
    delivery:    isAr ? 'تاريخ التوصيل'    : 'À livrer le',
    address:     isAr ? 'العنوان'          : 'Adresse',
    clientName:  isAr ? 'اسم العميل'        : 'Client',
    phone:       isAr ? 'الهاتف'           : 'Téléphone',
    note:        isAr ? 'ملاحظة'           : 'Note de commande',
    description: isAr ? 'الوصف'           : 'DESCRIPTION',
    qty:         isAr ? 'الكمية'           : 'QTÉ',
    surface:     isAr ? 'المساحة'          : 'SURFACE',
    pu:          isAr ? 'سعر الوحدة'       : 'P.U',
    sousTotal:   isAr ? 'المجموع الفرعي'   : 'SOUS-TOTAL',
    total:       isAr ? 'الإجمالي'         : 'Total',
    paid:        isAr ? 'المدفوع'          : 'Payé',
    remaining:   isAr ? 'المتبقي'          : 'Reste',
    dh:          isAr ? 'الدرهم المغربي'   : 'DH',
  };

  const phone       = clientPhone(order.client);
  const address     = clientAddress(order);
  const pickupStr   = fmtDate(order.scheduledPickupDate,   lang);
  const deliveryStr = fmtDate(order.scheduledDeliveryDate, lang);

  // ── Item rows ────────────────────────────────────────────────────────────────
  let itemsHtml = '';
  for (const item of items) {
    const surface = item.surface
      ? fmt(item.surface) + ' m²'
      : (item.largeur && item.hauteur)
        ? fmt(parseFloat(String(item.largeur)) * parseFloat(String(item.hauteur))) + ' m²'
        : '—';

    const qty   = item.quantite     != null ? `${item.quantite} p`                : '—';
    const pu    = item.prixUnitaire != null ? `${fmt(item.prixUnitaire)} ${L.dh}` : '—';
    const st    = item.sousTotal    != null ? `${fmt(item.sousTotal)} ${L.dh}`    : '—';
    const iname = item.productNom   || '—';

    let discountRow = '';
    if (item.remiseMontant && parseFloat(String(item.remiseMontant)) > 0) {
      discountRow = `<div class="discount">- ${fmt(item.remiseMontant)} ${L.dh}${item.remiseRaison ? ` (${item.remiseRaison})` : ''}</div>`;
    }

    itemsHtml += `
      <tr>
        <td class="td-desc"><span class="item-name">${iname}</span>${discountRow}</td>
        <td class="td-center">${qty}</td>
        <td class="td-center">${surface}</td>
        <td class="td-right">${pu}</td>
        <td class="td-right td-bold">${st}</td>
      </tr>`;
  }

  if (items.length === 0) {
    itemsHtml = `<tr><td colspan="5" class="td-empty">—</td></tr>`;
  }

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totalsHtml = `
    <tr class="total-row">
      <td colspan="3"></td>
      <td class="total-label">${L.total}</td>
      <td class="total-value">${fmt(total)} ${L.dh}</td>
    </tr>
    <tr class="total-row">
      <td colspan="3"></td>
      <td class="total-label">${L.paid}</td>
      <td class="total-value paid-value">${fmt(paid)} ${L.dh}</td>
    </tr>
    <tr class="total-row">
      <td colspan="3"></td>
      <td class="total-label">${L.remaining}</td>
      <td class="total-value ${remaining > 0 ? 'remain-value' : 'paid-value'}">${fmt(remaining)} ${L.dh}</td>
    </tr>`;

  // Build address lines
  const addrLines = address
    ? address.split(',').map(p => p.trim()).filter(Boolean)
    : [];

  // ── HTML ─────────────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Cairo', Arial, sans-serif;
    font-size: 15px;
    color: #1a1a1a;
    background: #fff;
    padding: 40px 44px 48px;
    direction: ${dir};
  }

  /* ── HEADER: logo left, FACTURE right, both vertically centered ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
  }
  .logo-block { flex: 0 0 auto; }
  .title-block { text-align: ${isAr ? 'left' : 'right'}; }
  .title-block .facture {
    font-size: 42px;
    font-weight: 800;
    color: #1a1a1a;
    letter-spacing: 5px;
    line-height: 1;
  }
  .title-block .company-sub {
    font-size: 16px;
    font-weight: 500;
    color: #555;
    letter-spacing: 3px;
    margin-top: 6px;
  }

  /* ── INFO SECTION ── */
  .info-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 32px;
    margin-bottom: 28px;
  }
  .info-left  { flex: 1; }
  .info-right { flex: 0 0 auto; min-width: 210px; }

  /* Two-column label/value grid for client info */
  .info-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 16px;
    row-gap: 4px;
    align-items: baseline;
  }
  .ig-label {
    font-size: 15px;
    font-weight: 700;
    color: #1a1a1a;
    white-space: nowrap;
  }
  .ig-value {
    font-size: 15px;
    font-weight: 400;
    color: #1a1a1a;
  }
  /* Span both columns for standalone lines (address lines) */
  .ig-full {
    grid-column: 1 / -1;
    font-size: 15px;
    font-weight: 400;
    color: #1a1a1a;
    padding-${isAr ? 'right' : 'left'}: 0;
  }

  /* Date rows on the right */
  .date-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-size: 15px;
    margin-bottom: 6px;
  }
  .date-row .lbl { font-weight: 400; color: #1a1a1a; white-space: nowrap; }
  .date-row .val { font-weight: 400; color: #1a1a1a; }

  /* ── TABLE ── */
  table { width: 100%; border-collapse: collapse; }

  thead tr { background-color: #3a3a3a; color: #fff; }
  thead th {
    padding: 11px 14px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
  }
  .th-desc   { text-align: ${isAr ? 'right' : 'left'}; width: 36%; }
  .th-center { text-align: center; width: 13%; }
  .th-right  { text-align: ${isAr ? 'left' : 'right'}; width: 14%; }

  tbody tr { border-bottom: 1px solid #e8e8e8; }

  td {
    padding: 10px 14px;
    font-size: 15px;
    vertical-align: top;
  }
  .td-desc   { text-align: ${isAr ? 'right' : 'left'}; }
  .td-center { text-align: center; color: #1a1a1a; }
  .td-right  { text-align: ${isAr ? 'left' : 'right'}; color: #1a1a1a; }
  .td-bold   { font-weight: 700; color: #1a1a1a; }
  .td-empty  { text-align: center; color: #aaa; padding: 28px; font-size: 15px; }

  .item-name { font-weight: 600; color: #1a1a1a; }
  .discount  { font-size: 12px; color: #e53e3e; margin-top: 3px; }

  /* ── TOTALS ── */
  .total-row td {
    padding: 6px 14px;
    border-bottom: none;
    font-size: 15px;
  }
  .total-row:first-of-type td { padding-top: 12px; }
  .total-label {
    text-align: ${isAr ? 'left' : 'right'};
    font-weight: 700;
    color: #1a1a1a;
    width: 14%;
  }
  .total-value {
    text-align: ${isAr ? 'left' : 'right'};
    font-weight: 700;
    color: #1a1a1a;
    width: 14%;
  }
  .paid-value   { color: #16a34a; }
  .remain-value { color: #dc2626; }

  /* ── PAGE 2 ── */
  @media print {
    .page-break { page-break-before: always; }
  }
  .page-break { page-break-before: always; }

  .conditions-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 36px;
  }
  .conditions-title {
    font-size: 26px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: ${isAr ? '0' : '3px'};
    text-align: ${isAr ? 'left' : 'right'};
  }

  .conditions-body {
    direction: rtl;
    text-align: right;
  }
  .cond-article {
    margin-bottom: 28px;
  }
  .cond-article-title {
    font-size: 15px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 8px;
  }
  .cond-article-text {
    font-size: 14px;
    font-weight: 400;
    color: #1a1a1a;
    line-height: 1.8;
  }
</style>
</head>
<body>

  <!-- HEADER: logo ←→ FACTURE, vertically centered -->
  <div class="header">
    <div class="logo-block">${logoTag}</div>
    <div class="title-block">
      <div class="facture">${L.facture}</div>
      <div class="company-sub">${name}</div>
    </div>
  </div>

  <!-- INFO SECTION -->
  <div class="info-section">
    <div class="info-left">
      <div class="info-grid">

        <!-- Numéro de reçu -->
        <span class="ig-label">${L.receiptNum}</span>
        <span class="ig-value">${order.numeroCommande ?? '—'}</span>

        <!-- Client name -->
        <span class="ig-label">${L.clientName}</span>
        <span class="ig-value">${order.client?.name ?? '—'}</span>

        <!-- Phone -->
        <span class="ig-label">${L.phone}</span>
        <span class="ig-value">${phone || '—'}</span>

        <!-- Address: label + value on same line -->
        <span class="ig-label">${L.address}</span>
        <span class="ig-value">${addrLines.join(', ') || '—'}</span>

        <!-- Note -->
        ${order.notes ? `<span class="ig-label">${L.note}</span><span class="ig-value">${order.notes}</span>` : ''}

      </div>
    </div>

    <!-- Dates right column -->
    <div class="info-right">
      <div class="date-row">
        <span class="lbl">${L.pickedUp}</span>
        <span class="val">${pickupStr}</span>
      </div>
      <div class="date-row">
        <span class="lbl">${L.delivery}</span>
        <span class="val">${deliveryStr}</span>
      </div>
    </div>
  </div>

  <!-- TABLE -->
  <table>
    <thead>
      <tr>
        <th class="th-desc">${L.description}</th>
        <th class="th-center">${L.qty}</th>
        <th class="th-center">${L.surface}</th>
        <th class="th-right">${L.pu}</th>
        <th class="th-right">${L.sousTotal}</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
      ${totalsHtml}
    </tbody>
  </table>

  <!-- PAGE 2: Conditions d'utilisation -->
  <div class="page-break" style="padding: 40px 44px 48px;">

    <div class="conditions-header">
      <div class="logo-block">${logoTag}</div>
      <div class="conditions-title">${isAr ? "شروط الاستخدام" : "Conditions d'utilisation"}</div>
    </div>

    ${isAr ? `
    <div class="conditions-body">

      <div class="cond-article">
        <div class="cond-article-title">.1 استلام وتسليم السجاد والأفرشة</div>
        <div class="cond-article-text">يتم استلام السجاد والأفرشة من العميل بحالة موثقة</div>
      </div>

      <div class="cond-article">
        <div class="cond-article-title">.2 المسؤولية عن الأضرار</div>
        <div class="cond-article-text">
          غير مسؤولة عن الأضرار الناتجة عن التلف المسبق في السجاد أو الأفرشة (مثل الثقوب، التمزقات، أو البقع Astra Propre الصعبة).<br/><br/>
          يتم إعلام العميل مسبقاً إذا كان هناك خطر تفاقم التلف أثناء عملية التنظيف.
        </div>
      </div>

      <div class="cond-article">
        <div class="cond-article-title">.3 عدم استلام السجاد</div>
        <div class="cond-article-text">
          في حالة عدم استلام العميل السجاد أو الأفرشة خلال فترة محددة (مثلاً 15 يوماً بعد الإخطار)، يحق Astra Propre التصرف بها أو فرض رسوم تخزين إضافية.
        </div>
      </div>

      <div class="cond-article">
        <div class="cond-article-title">.4 الشكاوى</div>
        <div class="cond-article-text">
          في حالة وجود شكوى، يجب على العميل تقديمها خلال 48 ساعة من استلام السجاد أو الأفرشة.
        </div>
      </div>

    </div>
    ` : `
    <div class="conditions-body" style="direction:ltr;text-align:left;">

      <div class="cond-article">
        <div class="cond-article-title">1. Réception et restitution des tapis et moquettes</div>
        <div class="cond-article-text">Les tapis et moquettes sont réceptionnés auprès du client dans un état documenté.</div>
      </div>

      <div class="cond-article">
        <div class="cond-article-title">2. Responsabilité en cas de dommages</div>
        <div class="cond-article-text">
          Astra Propre n'est pas responsable des dommages résultant d'une détérioration préexistante des tapis ou moquettes (tels que trous, déchirures ou taches difficiles).<br/><br/>
          Le client sera informé à l'avance si le processus de nettoyage présente un risque d'aggravation des dommages.
        </div>
      </div>

      <div class="cond-article">
        <div class="cond-article-title">3. Non-récupération des tapis</div>
        <div class="cond-article-text">
          En cas de non-récupération des tapis ou moquettes par le client dans un délai déterminé (par exemple 15 jours après notification), Astra Propre se réserve le droit d'en disposer ou d'appliquer des frais de stockage supplémentaires.
        </div>
      </div>

      <div class="cond-article">
        <div class="cond-article-title">4. Réclamations</div>
        <div class="cond-article-text">
          En cas de réclamation, le client doit la soumettre dans les 48 heures suivant la réception des tapis ou moquettes.
        </div>
      </div>

    </div>
    `}
  </div>

</body>
</html>`;
}

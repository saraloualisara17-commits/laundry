import { useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useQueryClient } from '@tanstack/react-query';
import { buildReceiptHtml, fetchLogoBase64 } from '../utils/receiptHtml';
import { queryKeys } from '../services/query/queryKeys';
import { SystemSettings } from '../services/api/settingsApi';
import { logger } from '../lib/logger';

type SharingAction = 'whatsapp' | 'print' | null;

const _log = logger.ns('receipt');

function log(msg: string, data?: Record<string, unknown>) {
  _log.debug(msg, data);
}

function logError(msg: string, err: unknown) {
  _log.error(msg, { err: String(err) });
}

// ─── Local PDF generation ─────────────────────────────────────────────────────

async function generateLocalPdf(
  order: any,
  lang: 'fr' | 'ar',
  logoUrl: string | null | undefined,
  businessName: string | null | undefined,
): Promise<string> {
  log('Generating PDF locally', { orderId: order?.id, lang, hasLogo: !!logoUrl });

  // Fetch logo as base64 in parallel with nothing else — cheap if already cached on disk.
  const logoBase64 = await fetchLogoBase64(logoUrl);

  const html = buildReceiptHtml(order, lang, logoBase64, businessName);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Move to a stable cache path so the filename is predictable for sharing
  const dest = `${FileSystem.cacheDirectory}receipt_${order?.id ?? 'order'}_${lang}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: dest });

  log('PDF generated locally', { uri: dest });
  return dest;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReceiptActions(
  orderId: number | string | undefined,
  confirmedStatus: string | undefined,
  orderNumber: string | undefined,
  t: (key: string, options?: any) => string,
  clientPhone?: string | null,
  order?: any,
) {
  const [sharingAction, setSharingAction] = useState<SharingAction>(null);
  const qc = useQueryClient();

  // Read settings (appName + logoUrl) from React Query cache — already loaded at app start.
  // Falls back gracefully if cache is empty (e.g. first cold open before settings fetch completes).
  function getSettings(): SystemSettings {
    return qc.getQueryData<SystemSettings>(queryKeys.settings.all) ?? {
      appName: 'ASTRA PROPRE',
      logoUrl: null,
      businessPhone: null,
    };
  }

  const handleShareWhatsApp = async (lang: 'fr' | 'ar' = 'fr') => {
    if (!orderId || !order) return;
    setSharingAction('whatsapp');
    log('WhatsApp share initiated', { orderId, lang });
    try {
      const { logoUrl, appName } = getSettings();
      const uri = await generateLocalPdf(order, lang, logoUrl, appName);

      if (Platform.OS === 'android' && clientPhone) {
        const phone = clientPhone.replace(/[\s\-().+]/g, '').replace(/^0/, '212');
        const chatUrl = `whatsapp://send?phone=${phone}`;
        try {
          await Linking.openURL(chatUrl);
        } catch {
          // WhatsApp not installed — fall through to generic share sheet
        }
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        if (clientPhone) {
          const digits = clientPhone.replace(/[\s\-().]/g, '');
          await Clipboard.setStringAsync(digits);
          log('Client phone copied to clipboard', { digits });
        }
      }

      log('Sharing PDF via share sheet', { uri });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Envoyer le reçu' });
      log('Share sheet dismissed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logError('WhatsApp share error', err);
      Alert.alert(t('common.error'), `Impossible de partager le reçu: ${msg}`);
    } finally {
      setSharingAction(null);
    }
  };

  const handlePrint = async (lang: 'fr' | 'ar' = 'fr') => {
    if (!orderId || !order) return;
    setSharingAction('print');
    log('Print initiated', { orderId, lang });
    try {
      const { logoUrl, appName } = getSettings();
      const logoBase64 = await fetchLogoBase64(logoUrl);
      const html = buildReceiptHtml(order, lang, logoBase64, appName);
      log('Calling Print.printAsync');
      await Print.printAsync({ html });
      log('Print.printAsync completed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logError('Print failed', err);
      if (msg.includes('cancelled') || msg.includes('canceled') || msg.includes('annulé') || msg.includes('did not complete')) return;
      Alert.alert(t('common.error'), `Impossible d'imprimer: ${msg}`);
    } finally {
      setSharingAction(null);
    }
  };

  return { sharingAction, handleShareWhatsApp, handlePrint };
}

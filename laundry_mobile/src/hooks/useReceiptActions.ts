import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { adminApi } from '../services/adminApi';

type SharingAction = 'whatsapp' | 'print' | null;

// ─── Diagnostics ─────────────────────────────────────────────────────────────

const TAG = '[ReceiptActions]';

function log(msg: string, data?: Record<string, unknown>) {
  if (__DEV__) {
    if (data) {
      console.log(`${TAG} ${msg}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`${TAG} ${msg}`);
    }
  }
}

function logError(msg: string, err: unknown) {
  console.error(`${TAG} ${msg}`, err);
}

// ─── Auth token ───────────────────────────────────────────────────────────────

function getAuthToken(): string | null {
  try {
    const { store } = require('../store/store');
    const token = store.getState().auth.token ?? null;
    log('Token check', { present: !!token, length: token?.length ?? 0 });
    return token;
  } catch (e) {
    logError('Failed to read auth token from store', e);
    return null;
  }
}

// ─── URL builder ─────────────────────────────────────────────────────────────

function buildPdfUrl(orderId: number | string, isDelivery: boolean): string {
  const url = isDelivery
    ? adminApi.getDeliveryPdfUrl(orderId)
    : adminApi.getOrderPdfUrl(orderId);
  log('Built PDF URL', { orderId, isDelivery, url });
  return url;
}

// ─── PDF header probe ─────────────────────────────────────────────────────────
// Reads the first 4 characters of the file as UTF-8 to check for the %PDF magic.
// Falls back to null if the file can't be read (don't block on this check).
async function getPdfMagicBytes(uri: string): Promise<string | null> {
  try {
    // Read the first 8 bytes as UTF-8. %PDF is ASCII so this is safe for the check.
    // length: 8 limits how much is read; position: 0 starts at the beginning.
    const head = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
      length: 8,
      position: 0,
    });
    return head.substring(0, 4);
  } catch {
    return null;
  }
}

// ─── Core download ────────────────────────────────────────────────────────────

async function downloadPdf(url: string, filename: string): Promise<string> {
  const localUri = `${FileSystem.cacheDirectory}${filename}`;
  const token = getAuthToken();

  log('Starting download', {
    url,
    localUri,
    hasToken: !!token,
    platform: Platform.OS,
    platformVersion: Platform.Version,
  });

  let result: FileSystem.FileSystemDownloadResult;
  try {
    result = await FileSystem.downloadAsync(url, localUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logError('FileSystem.downloadAsync threw', e);
    throw new DownloadError(`Network error during PDF download: ${msg}`, 0);
  }

  log('Download response', {
    status: result.status,
    uri: result.uri,
    headers: result.headers,
    md5: result.md5,
  });

  // Any non-200 is a hard failure — surface the exact status code.
  if (result.status !== 200) {
    // Try to read the error body if the server returned JSON (e.g. Spring error envelope).
    // FileSystem writes the body to disk even for error responses.
    let serverMessage = '';
    try {
      const bodyText = await FileSystem.readAsStringAsync(result.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      // Limit to 500 chars so the alert stays readable.
      serverMessage = bodyText.substring(0, 500);
      logError(`HTTP ${result.status} body`, { body: bodyText });
    } catch {
      // body unreadable — that's fine
    }
    throw new DownloadError(
      `HTTP ${result.status}${serverMessage ? ': ' + serverMessage : ''}`,
      result.status
    );
  }

  // Verify file exists and is non-empty.
  const fileInfo = await FileSystem.getInfoAsync(result.uri);
  log('File info', { exists: fileInfo.exists, size: fileInfo.exists ? (fileInfo as any).size : null });

  if (!fileInfo.exists) {
    throw new DownloadError('Downloaded file does not exist on disk', 200);
  }
  const fileSize = (fileInfo as any).size ?? 0;
  if (fileSize === 0) {
    throw new DownloadError('Downloaded file is empty (0 bytes)', 200);
  }

  // Verify PDF magic bytes (%PDF) — best-effort only.
  // On iOS the sandbox may block position-based binary reads, returning null.
  // null means "couldn't check" — not a failure. Only throw if we positively
  // read bytes and they are not %PDF (e.g. an HTML error page was saved as .pdf).
  const magic = await getPdfMagicBytes(result.uri);
  if (magic === null) {
    log('PDF magic bytes check skipped (read returned null — iOS binary read restriction, file is likely valid)');
  } else if (!magic.startsWith('%PDF')) {
    logError('File does not start with %PDF', { magic, sizeBytes: fileSize });
    throw new DownloadError(
      `File is not a valid PDF (starts with: "${magic}", size: ${fileSize} bytes)`,
      200
    );
  } else {
    log('PDF magic bytes check OK', { magic });
  }

  log('Download validated', { uri: result.uri, sizeBytes: fileSize });
  return result.uri;
}

// ─── Typed error ─────────────────────────────────────────────────────────────

class DownloadError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = 'DownloadError';
  }
}

// ─── Alert helpers ────────────────────────────────────────────────────────────

function showDownloadError(err: unknown, t: (k: string) => string) {
  if (err instanceof DownloadError) {
    const status = err.httpStatus;
    if (status === 401) {
      Alert.alert(
        'Session expirée',
        'Votre session a expiré. Reconnectez-vous et réessayez.'
      );
    } else if (status === 403) {
      Alert.alert(
        'Accès refusé',
        'Vous n\'avez pas accès à ce reçu (403).'
      );
    } else if (status === 400) {
      Alert.alert(
        'Reçu non disponible',
        'Ce type de reçu n\'est pas encore disponible pour cette commande (ex: livraison non confirmée).'
      );
    } else if (status === 404) {
      Alert.alert('Introuvable', 'Commande introuvable sur le serveur (404).');
    } else if (status === 500) {
      Alert.alert(
        'Erreur serveur',
        'Le serveur n\'a pas pu générer le PDF. Détail: ' + err.message
      );
    } else if (status === 0) {
      Alert.alert(
        'Erreur réseau',
        'Impossible de contacter le serveur. Vérifiez votre connexion internet.\n\nDétail: ' + err.message
      );
    } else {
      Alert.alert(
        t('common.error'),
        `Téléchargement échoué (HTTP ${status}): ${err.message}`
      );
    }
  } else {
    const msg = err instanceof Error ? err.message : String(err);
    Alert.alert(t('common.error'), `Erreur inattendue: ${msg}`);
  }
}

function showPrintError(err: unknown, t: (k: string) => string) {
  const msg = err instanceof Error ? err.message : String(err);
  logError('Print failed', err);
  // On Android, the user dismissing the print dialog throws — treat that silently.
  if (msg.includes('cancelled') || msg.includes('canceled') || msg.includes('annulé')) {
    return;
  }
  Alert.alert(
    t('common.error'),
    `Impossible d'imprimer: ${msg}`
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReceiptActions(
  orderId: number | string | undefined,
  confirmedStatus: string | undefined,
  orderNumber: string | undefined,
  t: (key: string, options?: any) => string
) {
  const [sharingAction, setSharingAction] = useState<SharingAction>(null);

  const isDelivery = confirmedStatus === 'DELIVERED';

  const handleShareWhatsApp = async () => {
    if (!orderId) return;
    setSharingAction('whatsapp');
    log('WhatsApp share initiated', { orderId, confirmedStatus, isDelivery });
    try {
      const url = buildPdfUrl(orderId, isDelivery);
      const uri = await downloadPdf(url, `recu_${orderId}.pdf`);

      const available = await Sharing.isAvailableAsync();
      log('Sharing availability', { available });
      if (!available) {
        Alert.alert(
          t('common.error'),
          t('admin.orders.create.confirmation.sharing_not_available')
        );
        return;
      }

      log('Calling Sharing.shareAsync', { uri });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${t('admin.orders.create.confirmation.send_receipt')} #${orderNumber ?? orderId}`,
        UTI: 'com.adobe.pdf',
      });
      log('Sharing.shareAsync completed');
    } catch (err) {
      logError('WhatsApp share error', err);
      showDownloadError(err, t);
    } finally {
      setSharingAction(null);
    }
  };

  const handlePrint = async () => {
    if (!orderId) return;
    setSharingAction('print');
    log('Print initiated', { orderId, confirmedStatus, isDelivery });
    try {
      const url = buildPdfUrl(orderId, isDelivery);
      const uri = await downloadPdf(url, `receipt_${orderId}.pdf`);

      log('Calling Print.printAsync', { uri });
      await Print.printAsync({ uri });
      log('Print.printAsync completed');
    } catch (err) {
      if (err instanceof DownloadError) {
        logError('Print download error', err);
        showDownloadError(err, t);
      } else {
        showPrintError(err, t);
      }
    } finally {
      setSharingAction(null);
    }
  };

  return { sharingAction, handleShareWhatsApp, handlePrint };
}

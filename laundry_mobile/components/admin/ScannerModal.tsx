import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Modal, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminColors } from '../../constants/AdminColors';

import { useTranslation } from 'react-i18next';

interface ScannerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ visible, onClose }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const isNavigating = React.useRef(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      isNavigating.current = false;
      if (!permission?.granted) {
        requestPermission();
      }
    }
  }, [visible]);
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || isNavigating.current) return;
    
    // Synchronously lock navigation
    isNavigating.current = true;
    setScanned(true);

    try {
      // The QR code contains: {frontendUrl}/order/{id}
      const parts = data.split('/');
      const id = parts[parts.length - 1];

      if (id && !isNaN(Number(id))) {
        onClose();
        // Use setImmediate or a small timeout to ensure modal closing doesn't 
        // interfere with navigation context
        setTimeout(() => {
          router.push(`/order/${id}`);
        }, 100);
      } else {
        Alert.alert(t('common.error'), t('common.error_msg'));
        isNavigating.current = false;
        setTimeout(() => setScanned(false), 2000);
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('common.error_msg'));
      isNavigating.current = false;
      setTimeout(() => setScanned(false), 2000);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, isArabic && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isArabic ? { marginLeft: 28, marginRight: 0 } : { marginRight: 28 }]}>{t('dashboard.scan_title')}</Text>
        </View>

        {!permission ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={AdminColors.primary} />
          </View>
        ) : !permission.granted ? (
          <View style={styles.centered}>
            <Text style={styles.permissionText}>{t('driver.register_client.toasts.permission_denied')}</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>{t('common.authorize_camera')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            >
              <View style={styles.overlay}>
                <View style={styles.unfocusedContainer}></View>
                <View style={styles.middleContainer}>
                  <View style={styles.unfocusedContainer}></View>
                  <View style={styles.focusedContainer}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                  </View>
                  <View style={styles.unfocusedContainer}></View>
                </View>
                <View style={styles.unfocusedContainer}></View>
              </View>
              
              <View style={styles.hintContainer}>
                <Text style={styles.hintText}>{t('dashboard.scan_hint')}</Text>
              </View>
            </CameraView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 28, // Offset for closeBtn to center text
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: AdminColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  middleContainer: {
    flexDirection: 'row',
    height: 250,
  },
  focusedContainer: {
    width: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: AdminColors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
});

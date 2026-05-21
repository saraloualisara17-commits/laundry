import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

// Order creation is restricted to Admin and Employé — redirect livreur to home
export default function LivreurCreateOrderScreen() {
  useEffect(() => { router.replace('/(livreur)/'); }, []);
  return <View />;
}

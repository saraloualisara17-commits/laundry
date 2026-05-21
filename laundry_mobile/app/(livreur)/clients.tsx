import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

// Livreurs do not manage clients — redirect to home
export default function LivreurClientsScreen() {
  useEffect(() => { router.replace('/(livreur)/'); }, []);
  return <View />;
}

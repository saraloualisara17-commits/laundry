import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../src/store/authSlice';
import { useSettings } from '../../src/hooks/query/useSettings';
import { authApi } from '../../src/services/api';
import { showError } from '../../src/services/errors/errorHandler';
import * as SecureStore from 'expo-secure-store';
import { Image } from 'react-native';

import { jwtDecode } from 'jwt-decode';
import { Colors, Shadows, Typography, Radius } from '../../constants/theme';

const { height } = Dimensions.get('window');

import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const { data: settingsData } = useSettings();
  const settings = settingsData ?? { appName: 'PureClean', logoUrl: null, businessPhone: null };
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('driver.register_client.toasts.required_fields'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password });
      
      const { token, refreshToken } = response.data;
      
      if (!token) throw new Error('No token received');

      const decoded: any = jwtDecode(token);
      const user = {
        id: Number(decoded.sub),
        email: decoded.email,
        role: decoded.role,
        name: decoded.name || 'User',
        isActive: true,
      };

      await SecureStore.setItemAsync('user', JSON.stringify(user));
      await SecureStore.setItemAsync('accessToken', token);
      if (refreshToken) {
        await SecureStore.setItemAsync('refreshToken', refreshToken);
      }

      dispatch(setCredentials({ user, token }));
      
    } catch (error: any) {
      showError(error, t('auth.login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.topDecoration} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          {settings.logoUrl && (
            <Image
              source={{ uri: settings.logoUrl }}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
          <Text style={styles.title}>{settings.appName}</Text>
          <Text style={styles.subtitle}>{t('auth.login.subtitle', { appName: settings.appName })}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('auth.login.email').toUpperCase()}</Text>
            <TextInput
              style={[styles.input, isArabic && { textAlign: 'right' }]}
              placeholder="votre@email.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isArabic && { textAlign: 'right' }]}>{t('auth.login.password').toUpperCase()}</Text>
            <TextInput
              style={[styles.input, isArabic && { textAlign: 'right' }]}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.login.submit')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.login.problem')}</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>{t('auth.login.contact_admin')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
    borderRadius: Radius.lg,
  },
  title: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: 'white',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.size.base,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: Radius.xl,
    ...Shadows.md,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    ...Shadows.teal,
  },
  buttonText: {
    color: 'white',
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: Typography.size.sm,
    color: Colors.primary,
    fontWeight: Typography.weight.semibold,
    marginTop: 4,
  },
});

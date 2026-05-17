import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
  title?: string;
  message?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  onRetry,
  title,
  message,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.danger} />
      </View>
      <Text style={styles.title}>{title || t('common.error')}</Text>
      <Text style={styles.message}>
        {message || t('common.error_msg')}
      </Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.bg,
  },
  iconContainer: {
    marginBottom: 16,
    opacity: 0.8,
  },
  title: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  buttonText: {
    color: 'white',
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
});

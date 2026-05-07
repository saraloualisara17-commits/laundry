import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminColors } from '../../constants/AdminColors';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, action }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
    paddingVertical: 80,
  },
  icon: {
    fontSize: 52,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: AdminColors.textSecondary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: AdminColors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 24,
  },
});

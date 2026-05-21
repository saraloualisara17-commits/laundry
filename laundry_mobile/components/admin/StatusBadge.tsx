import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusColors } from '../../constants/StatusColors';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  const config = StatusColors[status] || StatusColors.PENDING_PICKUP;

  return (
    <View style={[styles.container, { backgroundColor: config.dot }]}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        {t(`status.${status}`)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
});

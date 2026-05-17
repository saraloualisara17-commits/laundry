import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../../constants/theme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ActivityItem {
  id: string | number;
  type: string;
  title: string;
  description?: string;
  timestamp: string | number | Date;
  user?: string;
  icon?: string;
  iconColor?: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  emptyMessage?: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities, emptyMessage }) => {
  const renderItem = ({ item, index }: { item: ActivityItem; index: number }) => {
    const isLast = index === activities.length - 1;
    
    return (
      <View style={styles.itemContainer}>
        <View style={styles.leftColumn}>
          <View style={[styles.iconCircle, { backgroundColor: item.iconColor || Colors.primary100 }]}>
            <Ionicons 
              name={(item.icon as any) || 'notifications-outline'} 
              size={16} 
              color={item.iconColor ? 'white' : Colors.primary} 
            />
          </View>
          {!isLast && <View style={styles.line} />}
        </View>
        
        <View style={styles.rightColumn}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemTime}>
              {format(new Date(item.timestamp), 'HH:mm', { locale: fr })}
            </Text>
          </View>
          
          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}
          
          <View style={styles.itemFooter}>
            <Text style={styles.itemUser}>{item.user || 'Système'}</Text>
            <Text style={styles.itemDate}>
              {format(new Date(item.timestamp), 'dd MMM yyyy', { locale: fr })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={activities}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      scrollEnabled={false}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage || 'Aucune activité'}</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    minHeight: 80,
  },
  leftColumn: {
    alignItems: 'center',
    width: 40,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  rightColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemTime: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemUser: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  itemDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});

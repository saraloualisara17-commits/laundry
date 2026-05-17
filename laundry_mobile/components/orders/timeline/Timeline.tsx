import React from 'react';
import { View, StyleSheet } from 'react-native';
import TimelineItem, { TimelineEvent } from './TimelineItem';

interface TimelineProps {
  items: TimelineEvent[];
  isArabic: boolean;
  t: (key: string, options?: any) => string;
}

const Timeline: React.FC<TimelineProps> = ({ items, isArabic, t }) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.historyTimeline}>
      {items.map((event, index) => (
        <TimelineItem
          key={event.id}
          event={event}
          isLast={index === items.length - 1}
          isArabic={isArabic}
          t={t}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  historyTimeline: { 
    marginHorizontal: 24, 
    marginTop: 8 
  },
});

export default Timeline;

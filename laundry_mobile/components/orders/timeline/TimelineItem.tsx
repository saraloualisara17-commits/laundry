import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import { Colors, StatusColors } from '../../../constants/theme';

export interface TimelineEvent {
  id: string | number;
  nouveauStatut: string;
  createdAt: string;
  user?: {
    name?: string;
  };
  commentaire?: string;
}

interface TimelineItemProps {
  event: TimelineEvent;
  isLast: boolean;
  isArabic: boolean;
  t: (key: string, options?: any) => string;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ event, isLast, isArabic, t }) => {
  return (
    <View style={[styles.timelineItem, isArabic && { flexDirection: 'row-reverse' }]}>
      <View style={styles.timelineLeft}>
        <View 
          style={[
            styles.timelineDot, 
            { backgroundColor: StatusColors[event.nouveauStatut]?.dot || Colors.primary }
          ]} 
        />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={[styles.timelineRight, isArabic ? { paddingLeft: 0, paddingRight: 12 } : { paddingLeft: 12 }]}>
        <Text style={[styles.timelineStatus, isArabic && { textAlign: 'right' }]}>
          {StatusColors[event.nouveauStatut]?.label 
            ? t(`status.${event.nouveauStatut}`) 
            : event.nouveauStatut}
        </Text>
        <Text style={[styles.timelineMeta, isArabic && { textAlign: 'right' }]}>
          {t('common.by')} {event.user?.name || t('common.system', { defaultValue: 'Système' })} • {format(new Date(event.createdAt), 'dd MMM, HH:mm', { locale: isArabic ? ar : fr })}
        </Text>
        {event.commentaire && (
          <View style={[styles.timelineCommentBox, isArabic && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.timelineComment, isArabic && { textAlign: 'right' }]}>
              {event.commentaire}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timelineItem: { 
    flexDirection: 'row', 
    minHeight: 70 
  },
  timelineLeft: { 
    width: 30, 
    alignItems: 'center' 
  },
  timelineDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    zIndex: 1, 
    borderWidth: 2, 
    borderColor: 'white', 
    marginTop: 4 
  },
  timelineLine: { 
    width: 2, 
    flex: 1, 
    backgroundColor: '#E2E8F0', 
    marginVertical: -4 
  },
  timelineRight: { 
    flex: 1, 
    paddingLeft: 12, 
    paddingBottom: 20 
  },
  timelineStatus: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: Colors.textPrimary 
  },
  timelineMeta: { 
    fontSize: 12, 
    color: Colors.textMuted, 
    marginTop: 2 
  },
  timelineComment: { 
    fontSize: 13, 
    color: Colors.textSecondary 
  },
  timelineCommentBox: { 
    marginTop: 6, 
    backgroundColor: '#F8FAFC', 
    padding: 10, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
});

export default React.memo(TimelineItem);

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useInfiniteOrders } from '../src/hooks/query/useOrders';
import OrderCard from '../components/admin/OrderCard';
import { useRTL, row, font, textProps } from '../src/utils/rtl';
import { AdminColors } from '../constants/AdminColors';

export default function SearchScreen() {
  const { t, isRTL: isArabic } = useRTL();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const debouncedQuery = useDebounce(query, 350);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteOrders(debouncedQuery.trim().length >= 1 ? { search: debouncedQuery.trim() } : { search: '__NO_RESULTS__' });

  const orders = data?.pages.flatMap((p: any) => p.content ?? p ?? []) ?? [];

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={[styles.header, row(isArabic)]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons
              name={isArabic ? 'chevron-forward' : 'chevron-back'}
              size={24}
              color={AdminColors.textPrimary}
            />
          </TouchableOpacity>
          <View style={[styles.inputWrap, row(isArabic)]}>
            <Ionicons name="search-outline" size={18} color={AdminColors.textMuted} />
            <TextInput
              ref={inputRef}
              style={[styles.input, font.regular(isArabic), { textAlign: isArabic ? 'right' : 'left' }]}
              placeholder={t('search.placeholder')}
              placeholderTextColor={AdminColors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
              maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={AdminColors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results */}
        {debouncedQuery.trim().length < 1 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={52} color={AdminColors.textMuted} style={{ opacity: 0.4 }} />
            <Text style={[styles.emptyText, font.regular(isArabic)]}>{t('search.hint')}</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={AdminColors.primary} />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={52} color={AdminColors.textMuted} style={{ opacity: 0.4 }} />
            <Text style={[styles.emptyText, font.regular(isArabic)]}>{t('search.no_results')}</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item: any) => String(item.id)}
            renderItem={({ item }) => (
              <OrderCard item={item} isArabic={isArabic} t={t} />
            )}
            contentContainerStyle={styles.list}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              isFetchingNextPage
                ? <ActivityIndicator size="small" color={AdminColors.primary} style={{ marginVertical: 16 }} />
                : null
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: AdminColors.textPrimary,
    padding: 0,
  },
  list: { paddingTop: 12, paddingBottom: 32 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 14,
    color: AdminColors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

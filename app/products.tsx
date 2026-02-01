import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Mic,
  ChevronDown,
  Bookmark,
  CircleCheck,
  CircleAlert,
  LayoutGrid,
} from 'lucide-react-native';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { getProducts } from '../lib/products';
import { getOrCreateRoutine, addStepToRoutine } from '../lib/routines';
import { addToShelf, getExistingUserProduct, updateUserProduct } from '../lib/user-products';
import type { Product } from '../types/product';
import type { RoutineType } from '../types/routine';
import type { UserProductStatus } from '../types/user-product';
import { PRODUCT_CATEGORY_LABELS, type ProductCategory } from '../types/product';
import { Colors } from '../constants/Colors';

const CATEGORIES: { key: ProductCategory | ''; label: string }[] = [
  { key: '', label: 'Tüm Ürünler' },
  { key: 'cleanser', label: 'Temizleyici' },
  { key: 'toner', label: 'Tonik' },
  { key: 'serum', label: 'Serum' },
  { key: 'moisturizer', label: 'Nemlendirici' },
  { key: 'sunscreen', label: 'Güneş Kremi' },
  { key: 'mask', label: 'Maske' },
  { key: 'eye_cream', label: 'Göz Kremi' },
  { key: 'treatment', label: 'Tedavi' },
  { key: 'other', label: 'Diğer' },
];

// Görseldeki "match" görünümü için: ürün indexine göre yüksek/orta/düşük gösterim
function getMatchDisplay(index: number): { percent: number; color: string; Icon: typeof CircleCheck } {
  const mod = index % 3;
  if (mod === 0) return { percent: 88 + (index % 10), color: Colors.success, Icon: CircleCheck };
  if (mod === 1) return { percent: 72 + (index % 8), color: '#ea580c', Icon: CircleCheck };
  return { percent: 42 + (index % 10), color: Colors.error, Icon: CircleAlert };
}

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | ''>('');
  const [addingToRoutine, setAddingToRoutine] = useState<string | null>(null);
  const [addingToShelf, setAddingToShelf] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getProducts({
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        limit: 100,
      });
      setProducts(list);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Ürünler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    const delay = setTimeout(loadProducts, 300);
    return () => clearTimeout(delay);
  }, [loadProducts]);

  const handleAddToRoutine = (product: Product) => {
    Alert.alert(
      'Rutine Ekle',
      `${product.name} hangi rutine eklensin?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sabah Rutini',
          onPress: () => addProductToRoutine(product, 'AM'),
        },
        {
          text: 'Akşam Rutini',
          onPress: () => addProductToRoutine(product, 'PM'),
        },
      ]
    );
  };

  const addProductToRoutine = async (product: Product, type: RoutineType) => {
    try {
      setAddingToRoutine(product.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Hata', 'Giriş yapmanız gerekiyor.');
        return;
      }
      const routine = await getOrCreateRoutine(user.id, type, user.email ?? undefined);
      await addStepToRoutine(routine.id, {
        name: product.name,
        description: product.brand
          ? `${product.brand}${product.category ? ` • ${PRODUCT_CATEGORY_LABELS[product.category as ProductCategory]}` : ''}`
          : product.category
            ? PRODUCT_CATEGORY_LABELS[product.category as ProductCategory]
            : undefined,
        order: 0,
        product_id: product.id,
      });
      Alert.alert('Eklendi', `${product.name} ${type === 'AM' ? 'Sabah' : 'Akşam'} rutinine eklendi.`);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Rutine eklenemedi.');
    } finally {
      setAddingToRoutine(null);
    }
  };

  const handleAddToShelf = async (product: Product, status: UserProductStatus) => {
    try {
      setAddingToShelf(product.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Hata', 'Giriş yapmanız gerekiyor.');
        return;
      }
      const existing = await getExistingUserProduct(user.id, product.id);
      if (existing) {
        await updateUserProduct(existing.id, { status });
        Alert.alert('Güncellendi', status === 'opened' ? 'Rafına taşındı.' : 'İstek listesine taşındı.');
      } else {
        await addToShelf(user.id, product.id, status);
        Alert.alert('Eklendi', status === 'opened' ? 'Rafına eklendi.' : 'İstek listesine eklendi.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Eklenemedi.');
    } finally {
      setAddingToShelf(null);
    }
  };

  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    const isAdding = addingToRoutine === item.id;
    const isAddingShelf = addingToShelf === item.id;
    const categoryLabel = item.category
      ? PRODUCT_CATEGORY_LABELS[item.category as ProductCategory]
      : null;
    const match = getMatchDisplay(index);
    const MatchIcon = match.Icon;

    return (
      <View style={styles.card}>
        <View style={styles.cardImageWrap}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cardImagePlaceholder, { backgroundColor: index % 3 === 0 ? '#a7f3d0' : index % 3 === 1 ? '#fde68a' : Colors.lightGray }]}>
              <Text style={styles.cardImagePlaceholderText}>
                {item.name.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.matchRow}>
            <MatchIcon size={14} color={match.color} />
            <Text style={[styles.matchText, { color: match.color }]}>
              %{match.percent} Eşleşme
            </Text>
          </View>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.brand ? (
            <Text style={styles.cardBrand} numberOfLines={1}>
              {item.brand}
            </Text>
          ) : null}
          {categoryLabel ? (
            <View style={styles.tagWrap}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{categoryLabel.toUpperCase()}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.cardActions}>
            <Pressable
              style={[styles.addToRoutineButton, isAdding && styles.addButtonDisabled]}
              onPress={() => handleAddToRoutine(item)}
              disabled={isAdding || isAddingShelf}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Plus size={16} color={Colors.text} />
                  <Text style={styles.addToRoutineText}>Rutine Ekle</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={styles.bookmarkButton}
              onPress={() => handleAddToShelf(item, 'wishlist')}
              disabled={isAdding || isAddingShelf}
            >
              <Bookmark size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Product Finder</Text>
        <Pressable style={styles.headerIcon} hitSlop={12}>
          <LayoutGrid size={22} color={Colors.text} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textSecondary} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ürün, marka, içerik ara..."
            placeholderTextColor={Colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          <Pressable hitSlop={12} style={{ padding: 4 }}>
            <Mic size={18} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.key || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => {
            const isActive = categoryFilter === item.key;
            return (
              <Pressable
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                ]}
                onPress={() => setCategoryFilter(item.key as ProductCategory | '')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {item.label}
                </Text>
                {!isActive && <ChevronDown size={14} color={Colors.textSecondary} style={{ marginLeft: 4 }} />}
              </Pressable>
            );
          }}
        />
      </View>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {products.length} SONUÇ
          {search.trim() ? ` "${search.trim()}"` : ''}
          {categoryFilter ? ` • ${PRODUCT_CATEGORY_LABELS[categoryFilter as ProductCategory]}` : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Ürün bulunamadı.</Text>
              <Text style={styles.emptySubtext}>
                Arama kriterlerini değiştirin veya kendi ürününüzü ekleyin.
              </Text>
            </View>
          }
        />
      )}

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => router.push('/products/add')}
      >
        <Plus size={20} color={Colors.white} />
        <Text style={styles.fabText}>Ürün Ekle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  headerIcon: {
    padding: 4,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    color: Colors.text,
  },
  filters: {
    marginBottom: 12,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingRight: 40,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.light,
    borderColor: Colors.light,
  },
  filterPillText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  resultsRow: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  resultsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImageWrap: {
    width: 88,
    height: 88,
    margin: 14,
    borderRadius: 44,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.gray,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 0,
    justifyContent: 'space-between',
    minWidth: 0,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  cardBrand: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addToRoutineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addToRoutineText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  bookmarkButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light,
    borderRadius: 10,
  },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});

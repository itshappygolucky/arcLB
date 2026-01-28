import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Image, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { DarkModeToggle } from '../lib/components/DarkModeToggle';
import { ItemSelector } from '../lib/components/ItemSelector';
import { MaterialHeatmap } from '../lib/components/MaterialHeatmap';
import { RawMaterialsList } from '../lib/components/RawMaterialsList';
import { useTheme } from '../lib/contexts/ThemeContext';
import { useLoadout } from '../lib/hooks/useLoadout';
import { api, Item } from '../lib/services/api';
import { getItemImageSource } from '../lib/utils/itemImages';

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// Base64 encoding/decoding for favorites export/import
function encodeFavoritesCode(items: string[]): string {
  const json = JSON.stringify(items);
  // Use btoa if available (web), otherwise use manual encoding
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'btoa' in window) {
    return (window as any).btoa(unescape(encodeURIComponent(json)));
  }
  // Fallback manual encoding
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let r = '', i = 0, n: number, L = json.length;
  for (; i < L; ) {
    n = json.charCodeAt(i++) << 16;
    if (i < L) n |= json.charCodeAt(i++) << 8;
    if (i < L) n |= json.charCodeAt(i++);
    r += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const pad = (3 - (L % 3)) % 3;
  return r.slice(0, r.length - pad) + '='.repeat(pad);
}

function decodeFavoritesCode(raw: string): { valid: true; data: string[] } | { valid: false; error: string } {
  const t = raw.replace(/\s/g, '').trim();
  if (!t) return { valid: false, error: 'Empty code' };
  let items: unknown;
  try {
    let decoded: string;
    // Use atob if available (web), otherwise use manual decoding
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'atob' in window) {
      decoded = decodeURIComponent(escape((window as any).atob(t)));
    } else {
      // Fallback manual decoding
      const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const s = t.replace(/=/g, '');
      const idx = (c: string) => { const i = B64.indexOf(c); if (i < 0) throw new Error('Invalid'); return i; };
      let r = '', i = 0, n: number, L = s.length;
      while (i < L) {
        if (i + 3 >= L) break;
        n = (idx(s[i]) << 18) | (idx(s[i + 1]) << 12) | (idx(s[i + 2]) << 6) | idx(s[i + 3]);
        r += String.fromCharCode((n >> 16) & 255, (n >> 8) & 255, n & 255);
        i += 4;
      }
      if (i < L) {
        if (i + 2 < L) {
          n = (idx(s[i]) << 18) | (idx(s[i + 1]) << 12) | (idx(s[i + 2]) << 6);
          r += String.fromCharCode((n >> 16) & 255, (n >> 8) & 255);
        } else if (i + 1 < L) {
          n = (idx(s[i]) << 18) | (idx(s[i + 1]) << 12);
          r += String.fromCharCode((n >> 16) & 255);
        }
      }
      decoded = r;
    }
    items = JSON.parse(decoded);
  } catch (e) {
    return { valid: false, error: 'Invalid or corrupted code' };
  }
  if (!Array.isArray(items)) return { valid: false, error: 'Invalid format' };
  if (!items.every(item => typeof item === 'string')) return { valid: false, error: 'Invalid item format' };
  return { valid: true, data: items };
}

export default function Index() {
  const {
    favoritedItems,
    calculation,
    loading,
    error,
    toggleFavorite,
    removeItem,
    clearLoadout,
    setFavoritedItems,
  } = useLoadout();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024; // Desktop breakpoint
  const [favoritedItemDetails, setFavoritedItemDetails] = React.useState<Item[]>([]);
  const [favoritesExpanded, setFavoritesExpanded] = React.useState(true);
  const [selectorExpanded, setSelectorExpanded] = React.useState(false);
  const [exportModalVisible, setExportModalVisible] = React.useState(false);
  const [exportCode, setExportCode] = React.useState('');
  const [importModalVisible, setImportModalVisible] = React.useState(false);
  const [importCode, setImportCode] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'manual' | 'alphabetical'>('manual');

  // Load item details for favorited items
  React.useEffect(() => {
    const loadItemDetails = async () => {
      if (favoritedItems.length === 0) {
        setFavoritedItemDetails([]);
        return;
      }

      try {
        const allItems = await api.getItems();
        const details = favoritedItems
          .map(name => allItems.find(item => item.name === name))
          .filter((item): item is Item => item !== undefined);
        setFavoritedItemDetails(details);
      } catch (err) {
        console.error('Error loading item details:', err);
      }
    };

    loadItemDetails();
  }, [favoritedItems]);

  const onExport = () => {
    const code = encodeFavoritesCode(favoritedItems);
    setExportCode(code);
    setExportModalVisible(true);
  };

  const onExportCopy = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportCode);
        Alert.alert('Copied', 'Favorites code copied to clipboard.');
      } else {
        await Share.share({ message: exportCode, title: 'Favorites Code' });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not copy or share the code.');
    }
  };

  const onImport = () => {
    setImportCode('');
    setImportModalVisible(true);
  };

  const onImportApply = () => {
    const result = decodeFavoritesCode(importCode);
    if (!result.valid) {
      Alert.alert('Invalid Code', result.error);
      return;
    }
    setFavoritedItems(result.data);
    setImportModalVisible(false);
    setImportCode('');
    Alert.alert('Loaded', 'Favorites imported successfully.');
  };

  // Reorder functions
  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...favoritedItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setFavoritedItems(newItems);
  };

  const moveItemDown = (index: number) => {
    if (index === favoritedItems.length - 1) return;
    const newItems = [...favoritedItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setFavoritedItems(newItems);
  };

  // Sort favorited items
  const sortedFavoritedItems = React.useMemo(() => {
    if (sortOrder === 'alphabetical') {
      return [...favoritedItems].sort((a, b) => a.localeCompare(b));
    }
    return favoritedItems;
  }, [favoritedItems, sortOrder]);

  // Get sorted item details
  const sortedFavoritedItemDetails = React.useMemo(() => {
    if (sortOrder === 'alphabetical') {
      return [...favoritedItemDetails].sort((a, b) => a.name.localeCompare(b.name));
    }
    // Maintain manual order
    return favoritedItems
      .map(name => favoritedItemDetails.find(item => item.name === name))
      .filter((item): item is Item => item !== undefined);
  }, [favoritedItemDetails, favoritedItems, sortOrder]);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 12,
      paddingTop: 50,
      paddingBottom: 12,
      backgroundColor: colors.header,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 8,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.headerText,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.headerText,
      opacity: 0.9,
    },
    content: {
      flex: 1,
    },
    twoColumnLayout: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start',
      gap: 16,
      paddingHorizontal: 16,
    },
    leftColumn: {
      width: '25%',
      minWidth: 300,
      maxWidth: 400,
    },
    rightColumn: {
      flex: 1,
      minWidth: 0,
    },
    section: {
      marginTop: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      maxHeight: 720,
      width: '100%',
    },
    selectedSection: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      width: '100%',
    },
    selectedTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    clearButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.error,
      borderRadius: 6,
    },
    selectedItemChip: {
      backgroundColor: colors.primary + '20',
    },
    selectedItemText: {
      color: colors.primary,
    },
    removeButton: {
      backgroundColor: colors.primary,
    },
    errorContainer: {
      backgroundColor: colors.error + '20',
      borderLeftColor: colors.error,
    },
    errorText: {
      color: colors.error,
    },
    resultsSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      width: '100%',
    },
    resultsTitle: {
      color: colors.text,
      borderBottomColor: colors.border,
    },
    optimizerSection: {
      backgroundColor: colors.surface,
    },
    favoritedItemRow: {
      borderBottomColor: colors.border,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerText}>
          <Text style={dynamicStyles.headerTitle}>Loot Planner</Text>
          <Text style={dynamicStyles.headerSubtitle}>Track materials to keep while looting</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={onExport}
            style={[styles.exportButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
            disabled={favoritedItems.length === 0}
          >
            <Ionicons name="download-outline" size={14} color={colors.primary} />
            <Text style={[styles.exportButtonText, { color: colors.primary, opacity: favoritedItems.length === 0 ? 0.5 : 1 }]}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={onImport}
            style={[styles.importButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
            <Text style={styles.importButtonText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={clearLoadout}
            style={[styles.clearButtonHeader, { backgroundColor: colors.error }]}
            disabled={favoritedItems.length === 0}
          >
            <Text style={[styles.clearButtonText, { opacity: favoritedItems.length === 0 ? 0.5 : 1 }]}>Clear</Text>
          </TouchableOpacity>
          <DarkModeToggle />
        </View>
      </View>

      <ScrollView style={dynamicStyles.content} contentContainerStyle={styles.contentContainer}>
        {isDesktop ? (
          <View style={dynamicStyles.twoColumnLayout}>
            {/* Left Column: Favorited Items and Item Selector */}
            <View style={dynamicStyles.leftColumn}>
              {/* Favorited Items Section */}
              {favoritedItems.length > 0 && (
                <View style={[dynamicStyles.selectedSection, { marginHorizontal: 0 }]}>
                  <View style={styles.collapsibleHeader}>
                    <TouchableOpacity 
                      onPress={() => setFavoritesExpanded(!favoritesExpanded)}
                      style={{ flex: 1 }}
                    >
                      <View style={styles.selectedHeader}>
                        <Text style={dynamicStyles.selectedTitle}>Favorited Items ({favoritedItems.length})</Text>
                        <View style={[styles.expandButton, { backgroundColor: colors.primary + '20' }]}>
                          <Ionicons 
                            name={favoritesExpanded ? 'chevron-up' : 'chevron-down'} 
                            size={16} 
                            color={colors.primary} 
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                    {favoritesExpanded && (
                      <View style={styles.sortControls}>
                        <TouchableOpacity
                          onPress={() => setSortOrder(sortOrder === 'alphabetical' ? 'manual' : 'alphabetical')}
                          style={[styles.sortButton, { backgroundColor: sortOrder === 'alphabetical' ? colors.primary + '30' : colors.background, borderColor: colors.border }]}
                        >
                          <Ionicons 
                            name={sortOrder === 'alphabetical' ? 'text' : 'list'} 
                            size={14} 
                            color={sortOrder === 'alphabetical' ? colors.primary : colors.textSecondary} 
                          />
                          <Text style={[styles.sortButtonText, { color: sortOrder === 'alphabetical' ? colors.primary : colors.textSecondary }]}>
                            {sortOrder === 'alphabetical' ? 'A-Z' : 'Manual'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  {favoritesExpanded && (
                    <ScrollView 
                      style={styles.favoritedItemsList}
                      showsVerticalScrollIndicator={true}
                    >
                      {sortedFavoritedItemDetails.map((item, displayIndex) => {
                        const actualIndex = favoritedItems.indexOf(item.name);
                        const imgSrc = getItemImageSource(item.name, slug(item.name));
                        return (
                        <View key={item.name} style={[styles.favoritedItemRow, dynamicStyles.favoritedItemRow, { borderBottomColor: colors.border }]}>
                          <View style={styles.favoritedItemLeft}>
                            {sortOrder === 'manual' && (
                                <View style={styles.reorderButtons}>
                                  <TouchableOpacity
                                    onPress={() => moveItemUp(actualIndex)}
                                    disabled={actualIndex === 0}
                                    style={[styles.reorderButton, { backgroundColor: colors.background, opacity: actualIndex === 0 ? 0.3 : 1 }]}
                                  >
                                    <Ionicons 
                                      name="chevron-up" 
                                      size={14} 
                                      color={actualIndex === 0 ? colors.textSecondary : colors.primary} 
                                    />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => moveItemDown(actualIndex)}
                                    disabled={actualIndex === favoritedItems.length - 1}
                                    style={[styles.reorderButton, { backgroundColor: colors.background, opacity: actualIndex === favoritedItems.length - 1 ? 0.3 : 1 }]}
                                  >
                                    <Ionicons 
                                      name="chevron-down" 
                                      size={14} 
                                      color={actualIndex === favoritedItems.length - 1 ? colors.textSecondary : colors.primary} 
                                    />
                                  </TouchableOpacity>
                                </View>
                              )}
                              {imgSrc && (
                                <Image source={imgSrc} style={styles.favoritedItemImage} />
                              )}
                              <Ionicons name="star" size={14} color={colors.primary} style={styles.favoriteIcon} />
                              <View style={styles.itemChipContent}>
                                <Text style={[styles.selectedItemText, dynamicStyles.selectedItemText]} numberOfLines={1}>
                                  {item.name}
                                </Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              onPress={() => removeItem(item.name)}
                              style={[styles.removeButton, dynamicStyles.removeButton]}
                            >
                              <Text style={styles.removeButtonText}>×</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Item Selector */}
              <View style={[dynamicStyles.section, { marginHorizontal: 0 }]}>
                <TouchableOpacity 
                  onPress={() => setSelectorExpanded(!selectorExpanded)}
                  style={[styles.selectorHeader, { backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.selectorHeaderText, { color: colors.text }]}>
                    {selectorExpanded ? 'Hide' : 'Show'} Item Selector
                  </Text>
                  <View style={[styles.expandButton, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons 
                      name={selectorExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={16} 
                      color={colors.primary} 
                    />
                  </View>
                </TouchableOpacity>
                {selectorExpanded && (
                  <ItemSelector onItemSelect={toggleFavorite} selectedItems={favoritedItems} />
                )}
              </View>

              {/* Error Message */}
              {error && (
                <View style={[styles.errorContainer, dynamicStyles.errorContainer]}>
                  <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text>
                </View>
              )}

              {/* Loading Indicator */}
              {loading && favoritedItems.length > 0 && (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Calculating materials...</Text>
                </View>
              )}

              {/* Empty State */}
              {favoritedItems.length === 0 && !loading && (
                <View style={styles.emptyState}>
                  <Ionicons name="star-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                    No favorited items yet
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                    Search and favorite items to see what materials to keep
                  </Text>
                </View>
              )}
            </View>

            {/* Right Column: Materials to Keep and Material Utility Heatmap */}
            <View style={dynamicStyles.rightColumn}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                {/* Materials Section */}
                {calculation && (calculation.rawMaterials.length > 0 || (calculation.directRecipes && calculation.directRecipes.length > 0)) && (
                  <View style={[dynamicStyles.section, { marginTop: 12, marginHorizontal: 0, flex: 1, minWidth: 0, maxWidth: '50%' }]}>
                    <RawMaterialsList
                      favoritedItems={favoritedItems}
                      directRecipes={calculation.directRecipes}
                      rawMaterials={calculation.rawMaterials}
                      usedFallback={calculation.usedFallback}
                      materialUsage={calculation.materialUsage}
                      hideHeatmap={isDesktop}
                    />
                  </View>
                )}
                
                {/* Material Utility Heatmap - Right Side */}
                {isDesktop && calculation && calculation.materialUsage && Object.keys(calculation.materialUsage).length > 0 && (
                  <View style={[dynamicStyles.section, { marginTop: 12, marginHorizontal: 0, width: 350, maxWidth: 350 }]}>
                    <MaterialHeatmap
                      directRecipes={calculation.directRecipes}
                      rawMaterials={calculation.rawMaterials}
                      materialUsage={calculation.materialUsage}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Mobile Layout: Single Column */}
            {/* Favorited Items Section */}
            {favoritedItems.length > 0 && (
              <View style={dynamicStyles.selectedSection}>
                <View style={styles.collapsibleHeader}>
                  <TouchableOpacity 
                    onPress={() => setFavoritesExpanded(!favoritesExpanded)}
                    style={{ flex: 1 }}
                  >
                    <View style={styles.selectedHeader}>
                      <Text style={dynamicStyles.selectedTitle}>Favorited Items ({favoritedItems.length})</Text>
                      <View style={[styles.expandButton, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons 
                          name={favoritesExpanded ? 'chevron-up' : 'chevron-down'} 
                          size={16} 
                          color={colors.primary} 
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                  {favoritesExpanded && (
                    <View style={styles.sortControls}>
                      <TouchableOpacity
                        onPress={() => setSortOrder(sortOrder === 'alphabetical' ? 'manual' : 'alphabetical')}
                        style={[styles.sortButton, { backgroundColor: sortOrder === 'alphabetical' ? colors.primary + '30' : colors.background, borderColor: colors.border }]}
                      >
                        <Ionicons 
                          name={sortOrder === 'alphabetical' ? 'text' : 'list'} 
                          size={14} 
                          color={sortOrder === 'alphabetical' ? colors.primary : colors.textSecondary} 
                        />
                        <Text style={[styles.sortButtonText, { color: sortOrder === 'alphabetical' ? colors.primary : colors.textSecondary }]}>
                          {sortOrder === 'alphabetical' ? 'A-Z' : 'Manual'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {favoritesExpanded && (
                  <ScrollView 
                    style={styles.favoritedItemsList}
                    showsVerticalScrollIndicator={true}
                  >
                    {sortedFavoritedItemDetails.map((item) => {
                      const actualIndex = favoritedItems.indexOf(item.name);
                      const imgSrc = getItemImageSource(item.name, slug(item.name));
                      return (
                        <View key={item.name} style={[styles.favoritedItemRow, dynamicStyles.favoritedItemRow, { borderBottomColor: colors.border }]}>
                          <View style={styles.favoritedItemLeft}>
                            {sortOrder === 'manual' && (
                              <View style={styles.reorderButtons}>
                                <TouchableOpacity
                                  onPress={() => moveItemUp(actualIndex)}
                                  disabled={actualIndex === 0}
                                  style={[styles.reorderButton, { backgroundColor: colors.background, opacity: actualIndex === 0 ? 0.3 : 1 }]}
                                >
                                  <Ionicons 
                                    name="chevron-up" 
                                    size={14} 
                                    color={actualIndex === 0 ? colors.textSecondary : colors.primary} 
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => moveItemDown(actualIndex)}
                                  disabled={actualIndex === favoritedItems.length - 1}
                                  style={[styles.reorderButton, { backgroundColor: colors.background, opacity: actualIndex === favoritedItems.length - 1 ? 0.3 : 1 }]}
                                >
                                  <Ionicons 
                                    name="chevron-down" 
                                    size={14} 
                                    color={actualIndex === favoritedItems.length - 1 ? colors.textSecondary : colors.primary} 
                                  />
                                </TouchableOpacity>
                              </View>
                            )}
                            {imgSrc && (
                              <Image source={imgSrc} style={styles.favoritedItemImage} />
                            )}
                            <Ionicons name="star" size={14} color={colors.primary} style={styles.favoriteIcon} />
                            <View style={styles.itemChipContent}>
                              <Text style={[styles.selectedItemText, dynamicStyles.selectedItemText]} numberOfLines={1}>
                                {item.name}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            onPress={() => removeItem(item.name)}
                            style={[styles.removeButton, dynamicStyles.removeButton]}
                          >
                            <Text style={styles.removeButtonText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Item Selector */}
            <View style={[dynamicStyles.section, { marginHorizontal: 16 }]}>
              <TouchableOpacity 
                onPress={() => setSelectorExpanded(!selectorExpanded)}
                style={[styles.selectorHeader, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.selectorHeaderText, { color: colors.text }]}>
                  {selectorExpanded ? 'Hide' : 'Show'} Item Selector
                </Text>
                <View style={[styles.expandButton, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons 
                    name={selectorExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color={colors.primary} 
                  />
                </View>
              </TouchableOpacity>
              {selectorExpanded && (
                <ItemSelector onItemSelect={toggleFavorite} selectedItems={favoritedItems} />
              )}
            </View>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorContainer, dynamicStyles.errorContainer]}>
                <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text>
              </View>
            )}

            {/* Loading Indicator */}
            {loading && favoritedItems.length > 0 && (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Calculating materials...</Text>
              </View>
            )}

            {/* Raw Materials Section */}
            {calculation && (calculation.rawMaterials.length > 0 || (calculation.directRecipes && calculation.directRecipes.length > 0)) && (
              <View style={[styles.resultsSection, dynamicStyles.resultsSection, { marginTop: 12, marginHorizontal: 16 }]}>
                <RawMaterialsList
                  favoritedItems={favoritedItems}
                  directRecipes={calculation.directRecipes}
                  rawMaterials={calculation.rawMaterials}
                  usedFallback={calculation.usedFallback}
                  materialUsage={calculation.materialUsage}
                />
              </View>
            )}

            {/* Empty State */}
            {favoritedItems.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="star-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No favorited items yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                  Search and favorite items to see what materials to keep
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Export Modal */}
      <Modal visible={exportModalVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setExportModalVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Export Favorites</Text>
            <TextInput style={[styles.modalCodeInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={exportCode} editable={false} multiline placeholder="" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={onExportCopy}>
                <Text style={styles.modalButtonText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setExportModalVisible(false)}>
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal visible={importModalVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setImportModalVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Import Favorites</Text>
            <TextInput 
              style={[styles.modalCodeInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, minHeight: 80 }]} 
              value={importCode} 
              onChangeText={setImportCode} 
              placeholder="Paste code here..." 
              placeholderTextColor={colors.textSecondary} 
              multiline 
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={onImportApply}>
                <Text style={styles.modalButtonText}>Import</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setImportModalVisible(false)}>
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 20,
  },
  collapsibleHeader: {
    width: '100%',
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  clearButtonHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  expandButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  selectorHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  favoritedItemsList: {
    maxHeight: 400,
  },
  favoritedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  favoritedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  reorderButtons: {
    flexDirection: 'column',
    gap: 2,
    marginRight: 4,
  },
  reorderButton: {
    width: 24,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sortControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    minWidth: 100,
  },
  favoritedItemImage: {
    width: 28,
    height: 28,
    marginRight: 6,
    borderRadius: 4,
  },
  favoriteIcon: {
    marginRight: 6,
  },
  itemChipContent: {
    flex: 1,
    marginRight: 6,
  },
  selectedItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemChipType: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  errorContainer: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  errorText: {
    fontSize: 14,
  },
    resultsSection: {
      marginTop: 12,
      marginHorizontal: 16,
      borderRadius: 12,
      overflow: 'hidden',
      maxWidth: 800,
      alignSelf: 'center',
      width: '100%',
    },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  loadingContainer: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyState: {
    marginTop: 40,
    marginHorizontal: 16,
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalCodeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 16,
    minHeight: 60,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

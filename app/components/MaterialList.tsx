import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Material } from '../_services/api';
import { useTheme } from '../_contexts/ThemeContext';

interface MaterialListProps {
  direct: Material[];
  intermediate: Material[];
  raw: Material[];
}

export function MaterialList({ direct, intermediate, raw }: MaterialListProps) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
    },
    sectionTitle: {
      color: colors.text,
    },
    sectionSubtitle: {
      color: colors.textSecondary,
    },
    materialRow: {
      backgroundColor: colors.background,
      borderLeftColor: colors.primary,
    },
    materialName: {
      color: colors.text,
    },
    materialQuantity: {
      color: colors.primary,
    },
    divider: {
      backgroundColor: colors.border,
    },
    emptyText: {
      color: colors.textSecondary,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={styles.column}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Required Materials</Text>
        <Text style={[styles.sectionSubtitle, dynamicStyles.sectionSubtitle]}>Direct crafting requirements</Text>
        <ScrollView style={styles.list}>
          {direct.length === 0 ? (
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No direct requirements</Text>
          ) : (
            direct.map((material, index) => (
              <View key={index} style={[styles.materialRow, dynamicStyles.materialRow]}>
                <Text style={[styles.materialName, dynamicStyles.materialName]}>{material.name}</Text>
                <Text style={[styles.materialQuantity, dynamicStyles.materialQuantity]}>×{material.quantity}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <View style={[styles.divider, dynamicStyles.divider]} />

      <View style={styles.column}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Raw Materials</Text>
        <Text style={[styles.sectionSubtitle, dynamicStyles.sectionSubtitle]}>Base materials breakdown</Text>
        <ScrollView style={styles.list}>
          {raw.length === 0 ? (
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No raw materials needed</Text>
          ) : (
            raw.map((material, index) => (
              <View key={index} style={[styles.materialRow, dynamicStyles.materialRow]}>
                <Text style={[styles.materialName, dynamicStyles.materialName]}>{material.name}</Text>
                <Text style={[styles.materialQuantity, dynamicStyles.materialQuantity]}>×{material.quantity}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flex: 1,
  },
  column: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  list: {
    flex: 1,
  },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  materialName: {
    fontSize: 14,
    flex: 1,
  },
  materialQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  divider: {
    width: 1,
    marginVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ItemBreakdown as ItemBreakdownType, MaterialBreakdown } from '../_services/api';
import { useTheme } from '../_contexts/ThemeContext';

interface ItemBreakdownProps {
  breakdown: ItemBreakdownType;
}

interface MaterialBreakdownItemProps {
  material: MaterialBreakdown;
  level: number;
}

function MaterialBreakdownItem({ material, level }: MaterialBreakdownItemProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const hasBreakdown = material.hasRecipe && material.breakdown && material.breakdown.length > 0;

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderLeftColor: colors.primary,
    },
    materialRow: {
      backgroundColor: level % 2 === 0 ? colors.surface : colors.background,
    },
    materialName: {
      color: colors.text,
    },
    materialQuantity: {
      color: colors.primary,
    },
    expandButton: {
      backgroundColor: colors.primary + '20',
    },
    expandButtonText: {
      color: colors.primary,
    },
  });

  return (
    <View style={styles.materialContainer}>
      <TouchableOpacity
        style={[styles.materialRow, dynamicStyles.materialRow, { paddingLeft: 16 + (level * 16) }]}
        onPress={() => hasBreakdown && setExpanded(!expanded)}
        disabled={!hasBreakdown}
      >
        <View style={styles.materialContent}>
          {hasBreakdown && (
            <View style={[styles.expandButton, dynamicStyles.expandButton]}>
              <Text style={[styles.expandButtonText, dynamicStyles.expandButtonText]}>
                {expanded ? '▼' : '▶'}
              </Text>
            </View>
          )}
          {!hasBreakdown && <View style={styles.expandButtonPlaceholder} />}
          <Text style={[styles.materialName, dynamicStyles.materialName]}>
            {material.quantity}× {material.name}
          </Text>
        </View>
      </TouchableOpacity>
      
      {expanded && hasBreakdown && (
        <View style={styles.breakdownContainer}>
          {material.breakdown.map((subMaterial, index) => (
            <MaterialBreakdownItem
              key={index}
              material={subMaterial}
              level={level + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function ItemBreakdown({ breakdown }: ItemBreakdownProps) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    itemName: {
      color: colors.text,
      borderBottomColor: colors.border,
    },
    errorText: {
      color: colors.error,
    },
  });

  if (breakdown.error) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <Text style={[styles.itemName, dynamicStyles.itemName]}>{breakdown.item}</Text>
        <Text style={[styles.errorText, dynamicStyles.errorText]}>{breakdown.error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.itemName, dynamicStyles.itemName]}>{breakdown.item}</Text>
      {breakdown.directRequirements.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No requirements found
        </Text>
      ) : (
        <View style={styles.requirementsContainer}>
          {breakdown.directRequirements.map((requirement, index) => (
            <MaterialBreakdownItem
              key={index}
              material={requirement}
              level={0}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemName: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
  },
  requirementsContainer: {
    paddingVertical: 8,
  },
  materialContainer: {
    width: '100%',
  },
  materialRow: {
    paddingVertical: 10,
    paddingRight: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  materialContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandButtonPlaceholder: {
    width: 32,
  },
  materialName: {
    fontSize: 15,
    flex: 1,
  },
  materialQuantity: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  breakdownContainer: {
    marginLeft: 0,
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    padding: 16,
    fontSize: 14,
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { UpgradeChain as UpgradeChainType } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface UpgradeChainProps {
  chains: UpgradeChainType[];
}

export function UpgradeChain({ chains }: UpgradeChainProps) {
  const { colors } = useTheme();
  const [expandedChains, setExpandedChains] = useState<Set<number>>(new Set());

  const toggleChain = (index: number) => {
    const newExpanded = new Set(expandedChains);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChains(newExpanded);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
    },
    title: {
      color: colors.text,
    },
    chainContainer: {
      backgroundColor: colors.background,
      borderLeftColor: colors.primary,
    },
    chainHeader: {
      borderBottomColor: colors.border,
    },
    chainTitle: {
      color: colors.text,
    },
    chainSubtitle: {
      color: colors.textSecondary,
    },
    expandButton: {
      backgroundColor: colors.primary + '20',
    },
    expandButtonText: {
      color: colors.primary,
    },
    stepContainer: {
      backgroundColor: colors.surface,
      borderLeftColor: colors.border,
    },
    stepHeader: {
      borderBottomColor: colors.border,
    },
    stepItemName: {
      color: colors.text,
    },
    stepType: {
      color: colors.primary,
    },
    stepFrom: {
      color: colors.textSecondary,
    },
    arrow: {
      color: colors.primary,
    },
    materialRow: {
      backgroundColor: colors.background,
    },
    materialName: {
      color: colors.text,
    },
    materialQuantity: {
      color: colors.primary,
    },
    emptyText: {
      color: colors.textSecondary,
    },
  });

  if (!chains || chains.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.title]}>Upgrade Chains</Text>
      
      {chains.map((chain, chainIndex) => {
        const isExpanded = expandedChains.has(chainIndex);
        const reversedChain = [...chain.chain].reverse(); // Show from base to target
        
        return (
          <View key={chainIndex} style={[styles.chainContainer, dynamicStyles.chainContainer]}>
            <TouchableOpacity
              style={[styles.chainHeader, dynamicStyles.chainHeader]}
              onPress={() => toggleChain(chainIndex)}
            >
              <View style={styles.chainHeaderContent}>
                <View style={styles.chainHeaderText}>
                  <Text style={[styles.chainTitle, dynamicStyles.chainTitle]}>
                    {chain.targetItem}
                  </Text>
                  <Text style={[styles.chainSubtitle, dynamicStyles.chainSubtitle]}>
                    {chain.chain.length} step{chain.chain.length !== 1 ? 's' : ''} • Tap to {isExpanded ? 'collapse' : 'expand'}
                  </Text>
                </View>
                <View style={[styles.expandButton, dynamicStyles.expandButton]}>
                  <Text style={[styles.expandButtonText, dynamicStyles.expandButtonText]}>
                    {isExpanded ? '−' : '+'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {isExpanded && (
              <ScrollView style={styles.chainSteps}>
                {reversedChain.map((step, stepIndex) => (
                  <View key={stepIndex} style={[styles.stepContainer, dynamicStyles.stepContainer]}>
                    <View style={[styles.stepHeader, dynamicStyles.stepHeader]}>
                      <View style={styles.stepHeaderContent}>
                        <Text style={[styles.stepItemName, dynamicStyles.stepItemName]}>
                          {step.item}
                        </Text>
                        <View style={styles.stepMeta}>
                          <Text style={[styles.stepType, dynamicStyles.stepType]}>
                            {step.type === 'upgrade' ? '↑ Upgrade' : '⚒ Craft'}
                          </Text>
                          {step.from && (
                            <>
                              <Text style={[styles.arrow, dynamicStyles.arrow]}> → </Text>
                              <Text style={[styles.stepFrom, dynamicStyles.stepFrom]}>
                                from {step.from}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    {step.materials && step.materials.length > 0 && (
                      <View style={styles.materialsList}>
                        {step.materials.map((material, matIndex) => (
                          <View key={matIndex} style={[styles.materialRow, dynamicStyles.materialRow]}>
                            <Text style={[styles.materialName, dynamicStyles.materialName]}>
                              {material.name}
                            </Text>
                            <Text style={[styles.materialQuantity, dynamicStyles.materialQuantity]}>
                              ×{material.quantity}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {stepIndex < reversedChain.length - 1 && (
                      <View style={styles.chainArrow}>
                        <Text style={[styles.arrow, dynamicStyles.arrow]}>↓</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chainContainer: {
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  chainHeader: {
    padding: 12,
    borderBottomWidth: 1,
  },
  chainHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chainHeaderText: {
    flex: 1,
  },
  chainTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  chainSubtitle: {
    fontSize: 12,
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chainSteps: {
    maxHeight: 400,
  },
  stepContainer: {
    padding: 12,
    borderLeftWidth: 2,
    marginLeft: 8,
  },
  stepHeader: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  stepHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  stepItemName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  stepType: {
    fontSize: 12,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepFrom: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  materialsList: {
    marginTop: 8,
  },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  materialName: {
    fontSize: 13,
    flex: 1,
  },
  materialQuantity: {
    fontSize: 13,
    fontWeight: '600',
  },
  chainArrow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});

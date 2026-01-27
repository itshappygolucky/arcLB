import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LoadoutCalculation } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface StashOptimizerProps {
  optimization: LoadoutCalculation['optimization'];
}

export function StashOptimizer({ optimization }: StashOptimizerProps) {
  const { colors } = useTheme();
  const { stashLimit, currentUsage, remainingSpace, recommendations, efficiency, smartRecommendations } = optimization;
  const usagePercent = (currentUsage / stashLimit) * 100;
  const isOverCapacity = remainingSpace < 0;
  const [expandedSmart, setExpandedSmart] = useState(false);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    },
    title: {
      color: colors.text,
    },
    statValue: {
      color: colors.primary,
    },
    statValueWarning: {
      color: colors.error,
    },
    statLabel: {
      color: colors.textSecondary,
    },
    progressBar: {
      backgroundColor: colors.border,
    },
    progressFill: {
      backgroundColor: colors.primary,
    },
    progressFillWarning: {
      backgroundColor: colors.error,
    },
    progressText: {
      color: colors.textSecondary,
    },
    recommendationsTitle: {
      color: colors.text,
    },
    recommendationsMessage: {
      color: colors.text,
      backgroundColor: colors.background,
    },
    recommendationLabel: {
      color: colors.primary,
    },
    recommendationLabelRecycle: {
      color: '#FF9500',
    },
    recommendationItem: {
      color: colors.textSecondary,
    },
    efficiencyContainer: {
      backgroundColor: colors.background,
    },
    efficiencyTitle: {
      color: colors.text,
    },
    efficiencyLabel: {
      color: colors.textSecondary,
    },
    efficiencyValue: {
      color: colors.text,
    },
    smartRecommendationsContainer: {
      backgroundColor: colors.background,
    },
    smartRecommendationsTitle: {
      color: colors.text,
    },
    smartRecommendationCard: {
      backgroundColor: colors.surface,
      borderLeftColor: colors.primary,
    },
    smartRecommendationItem: {
      color: colors.text,
    },
    smartRecommendationReason: {
      color: colors.primary,
    },
    smartRecommendationYield: {
      color: colors.textSecondary,
    },
    smartRecommendationSpace: {
      color: '#4CAF50',
    },
    smartRecommendationPriority: {
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
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.title]}>Stash Management</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, dynamicStyles.statValue]}>{currentUsage}</Text>
          <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Items Used</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, dynamicStyles.statValue, isOverCapacity && dynamicStyles.statValueWarning]}>
            {Math.abs(remainingSpace)}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.statLabel]}>
            {isOverCapacity ? 'Over Capacity' : 'Remaining'}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, dynamicStyles.statValue]}>{stashLimit}</Text>
          <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Stash Limit</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, dynamicStyles.progressBar]}>
          <View 
            style={[
              styles.progressFill, 
              dynamicStyles.progressFill,
              { width: `${Math.min(usagePercent, 100)}%` },
              isOverCapacity && dynamicStyles.progressFillWarning
            ]} 
          />
        </View>
        <Text style={[styles.progressText, dynamicStyles.progressText]}>{usagePercent.toFixed(1)}% Full</Text>
      </View>

      <View style={styles.recommendationsContainer}>
        <Text style={[styles.recommendationsTitle, dynamicStyles.recommendationsTitle]}>Recommendations</Text>
        <Text style={[styles.recommendationsMessage, dynamicStyles.recommendationsMessage]}>{recommendations.message}</Text>

        {recommendations.keep.length > 0 && (
          <View style={styles.recommendationSection}>
            <Text style={[styles.recommendationLabel, dynamicStyles.recommendationLabel]}>Keep ({recommendations.keep.length}):</Text>
            <ScrollView style={styles.recommendationList}>
              {recommendations.keep.map((item, index) => (
                <Text key={index} style={[styles.recommendationItem, dynamicStyles.recommendationItem]}>• {item}</Text>
              ))}
            </ScrollView>
          </View>
        )}

        {recommendations.recycle.length > 0 && (
          <View style={styles.recommendationSection}>
            <Text style={[styles.recommendationLabel, styles.recommendationLabelRecycle, dynamicStyles.recommendationLabelRecycle]}>
              Consider Recycling ({recommendations.recycle.length}):
            </Text>
            <ScrollView style={styles.recommendationList}>
              {recommendations.recycle.map((item, index) => (
                <Text key={index} style={[styles.recommendationItem, dynamicStyles.recommendationItem]}>• {item}</Text>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {smartRecommendations && smartRecommendations.length > 0 && (
        <View style={[styles.smartRecommendationsContainer, dynamicStyles.smartRecommendationsContainer]}>
          <TouchableOpacity
            onPress={() => setExpandedSmart(!expandedSmart)}
            style={[styles.smartRecommendationsHeader, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.smartRecommendationsTitle, dynamicStyles.smartRecommendationsTitle]}>
              Smart Recommendations ({smartRecommendations.length})
            </Text>
            <View style={[styles.expandButton, dynamicStyles.expandButton]}>
              <Text style={[styles.expandButtonText, dynamicStyles.expandButtonText]}>
                {expandedSmart ? '−' : '+'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {expandedSmart && (
            <ScrollView style={styles.smartRecommendationsList}>
              {smartRecommendations.map((rec, index) => (
                <View key={index} style={[styles.smartRecommendationCard, dynamicStyles.smartRecommendationCard]}>
                  <View style={styles.smartRecommendationHeader}>
                    <Text style={[styles.smartRecommendationItem, dynamicStyles.smartRecommendationItem]}>
                      {rec.item}
                    </Text>
                    {rec.priority === 'high' && (
                      <View style={[styles.priorityBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.smartRecommendationPriority, dynamicStyles.smartRecommendationPriority]}>
                          High Priority
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.smartRecommendationReason, dynamicStyles.smartRecommendationReason]}>
                    {rec.reason}
                  </Text>
                  <View style={styles.smartRecommendationYieldContainer}>
                    <Text style={[styles.smartRecommendationYield, dynamicStyles.smartRecommendationYield]}>
                      Recycles to:{' '}
                      {Object.entries(rec.recycleYield).map(([name, qty], i) => (
                        <Text key={i}>
                          {qty}× {name}
                          {i < Object.entries(rec.recycleYield).length - 1 ? ', ' : ''}
                        </Text>
                      ))}
                    </Text>
                  </View>
                  {rec.spaceSaved > 0 && (
                    <Text style={[styles.smartRecommendationSpace, dynamicStyles.smartRecommendationSpace]}>
                      Saves {rec.spaceSaved} stash slot{rec.spaceSaved !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={[styles.efficiencyContainer, dynamicStyles.efficiencyContainer]}>
        <Text style={[styles.efficiencyTitle, dynamicStyles.efficiencyTitle]}>Efficiency Metrics</Text>
        <View style={styles.efficiencyRow}>
          <Text style={[styles.efficiencyLabel, dynamicStyles.efficiencyLabel]}>Items per Slot:</Text>
          <Text style={[styles.efficiencyValue, dynamicStyles.efficiencyValue]}>{efficiency.itemsPerSlot.toFixed(2)}</Text>
        </View>
        <View style={styles.efficiencyRow}>
          <Text style={[styles.efficiencyLabel, dynamicStyles.efficiencyLabel]}>Avg Stack Size:</Text>
          <Text style={[styles.efficiencyValue, dynamicStyles.efficiencyValue]}>{efficiency.averageStackSize.toFixed(1)}</Text>
        </View>
        <View style={styles.efficiencyRow}>
          <Text style={[styles.efficiencyLabel, dynamicStyles.efficiencyLabel]}>High Value Items:</Text>
          <Text style={[styles.efficiencyValue, dynamicStyles.efficiencyValue]}>{efficiency.highValueItems}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderTopWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
  },
  recommendationsContainer: {
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationsMessage: {
    fontSize: 14,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  recommendationSection: {
    marginBottom: 12,
  },
  recommendationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationLabelRecycle: {
    // Color handled by dynamic styles
  },
  recommendationList: {
    maxHeight: 120,
  },
  recommendationItem: {
    fontSize: 12,
    marginBottom: 4,
    paddingLeft: 8,
  },
  efficiencyContainer: {
    padding: 12,
    borderRadius: 8,
  },
  efficiencyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  efficiencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  efficiencyLabel: {
    fontSize: 12,
  },
  efficiencyValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  smartRecommendationsContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  smartRecommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  smartRecommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  smartRecommendationsList: {
    maxHeight: 300,
  },
  smartRecommendationCard: {
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  smartRecommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  smartRecommendationItem: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  smartRecommendationPriority: {
    fontSize: 10,
    fontWeight: '600',
  },
  smartRecommendationReason: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  smartRecommendationYieldContainer: {
    marginBottom: 6,
  },
  smartRecommendationYield: {
    fontSize: 12,
  },
  smartRecommendationSpace: {
    fontSize: 12,
    fontWeight: '600',
  },
});

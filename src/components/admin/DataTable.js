import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { Eye, EyeOff, Trash2 } from 'lucide-react-native';

const DataTable = ({ data, loading, columns, onToggle, onDelete, emptyMsg }) => {
  if (loading) {
    return <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 60 }} />;
  }
  if (!data || data.length === 0) {
    return <Text style={styles.emptyText}>{emptyMsg || 'No records found'}</Text>;
  }

  const hasActions = onToggle || onDelete;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header Row */}
          <View style={styles.row}>
            {columns.map((col, i) => (
              <View key={i} style={[styles.cell, styles.headerCell, { width: col.width || 120 }]}>
                <Text style={styles.headerText}>{col.label}</Text>
              </View>
            ))}
            {hasActions && (
              <View style={[styles.cell, styles.headerCell, { width: 90 }]}>
                <Text style={styles.headerText}>Actions</Text>
              </View>
            )}
          </View>

          {/* Data Rows */}
          {data.map((row, ri) => (
            <View key={ri} style={[styles.row, ri % 2 === 0 && styles.rowEven]}>
              {columns.map((col, ci) => (
                <View key={ci} style={[styles.cell, { width: col.width || 120 }]}>
                  <Text style={styles.cellText} numberOfLines={2}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                  </Text>
                </View>
              ))}
              {hasActions && (
                <View style={[styles.cell, { width: 90, flexDirection: 'row', gap: 8 }]}>
                  {onToggle && (
                    <TouchableOpacity onPress={() => onToggle(row)} style={styles.actionBtn}>
                      {row.is_active ? <EyeOff size={16} color="#f59e0b" /> : <Eye size={16} color="#10b981" />}
                    </TouchableOpacity>
                  )}
                  {onDelete && (
                    <TouchableOpacity onPress={() => onDelete(row)} style={styles.actionBtn}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Record count */}
      {data.length > 0 && (
        <View style={styles.recordCount}>
          <Text style={styles.recordCountText}>
            {data.length} record{data.length > 1 ? 's' : ''} found
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowEven: { backgroundColor: 'rgba(255,255,255,0.02)' },
  cell: { paddingHorizontal: 10, paddingVertical: 12, justifyContent: 'center' },
  headerCell: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(16,185,129,0.3)',
  },
  headerText: {
    fontSize: 11, fontWeight: '700', color: '#10b981',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  cellText: { fontSize: 13, color: '#cbd5e1' },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 60, fontSize: 15 },
  recordCount: {
    marginTop: 16, paddingVertical: 10, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  recordCountText: { fontSize: 12, color: '#475569' },
});

export default DataTable;

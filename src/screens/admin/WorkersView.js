import React from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import DataTable from '../../components/admin/DataTable';
import { ADMIN_API } from '../../config/api';

const COLUMNS = [
  { key: 'id', label: 'ID', width: 50 },
  { key: 'full_name', label: 'Name', width: 130 },
  { key: 'skills', label: 'Skills', width: 140 },
  { key: 'daily_rate', label: 'Rate', width: 80, render: (v) => v ? `₹${v}` : '—' },
  { key: 'is_available', label: 'Available', width: 85, render: (v) => v ? '🟢' : '🔴' },
  { key: 'location', label: 'Location', width: 120 },
];

const WorkersView = ({ data, loading, onRefresh }) => {
  const handleDelete = (row) => {
    Alert.alert('Delete Worker', `Delete ${row.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${ADMIN_API}/workers/${row.id}`);
            onRefresh();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.error || err.message);
          }
        },
      },
    ]);
  };

  return (
    <DataTable
      data={data}
      loading={loading}
      columns={COLUMNS}
      onDelete={handleDelete}
      emptyMsg="No workers found"
    />
  );
};

export default WorkersView;

import React from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import DataTable from '../../components/admin/DataTable';
import { ADMIN_API } from '../../config/api';

const COLUMNS = [
  { key: 'id', label: 'ID', width: 50 },
  { key: 'full_name', label: 'Name', width: 150 },
  { key: 'email', label: 'Email', width: 180 },
  { key: 'phone', label: 'Phone', width: 120 },
  { key: 'is_active', label: 'Active', width: 70, render: (v) => v ? '✅' : '❌' },
];

const CustomersView = ({ data, loading, onRefresh }) => {
  const handleDelete = (row) => {
    Alert.alert('Delete Customer', `Delete ${row.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${ADMIN_API}/customers/${row.id}`);
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
      emptyMsg="No customers found"
    />
  );
};

export default CustomersView;

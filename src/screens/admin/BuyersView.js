import React from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import DataTable from '../../components/admin/DataTable';
import { ADMIN_API } from '../../config/api';

const COLUMNS = [
  { key: 'id', label: 'ID', width: 50 },
  { key: 'full_name', label: 'Name', width: 150 },
  { key: 'business_name', label: 'Business', width: 140 },
  { key: 'phone', label: 'Phone', width: 120 },
  { key: 'total_orders', label: 'Orders', width: 80 },
  { key: 'total_spent', label: 'Spent (₹)', width: 100 },
  { key: 'is_active', label: 'Active', width: 60, render: (v) => v ? '✅' : '❌' },
];

const BuyersView = ({ data, loading, onRefresh }) => {
  const handleDelete = (row) => {
    Alert.alert('Delete Buyer', `Delete ${row.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${ADMIN_API}/buyers/${row.id}`);
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
      emptyMsg="No buyers registered yet"
    />
  );
};

export default BuyersView;

import React from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import DataTable from '../../components/admin/DataTable';
import { ADMIN_API } from '../../config/api';

const COLUMNS = [
  { key: 'id', label: 'ID', width: 50 },
  { key: 'name', label: 'Product', width: 150 },
  { key: 'category', label: 'Category', width: 100 },
  { key: 'price', label: 'Price', width: 80, render: (v) => `₹${v}` },
  { key: 'stock_quantity', label: 'Stock', width: 70 },
  { key: 'is_active', label: 'Active', width: 70, render: (v) => v ? '✅' : '❌' },
];

const ProductsView = ({ data, loading, onRefresh }) => {
  const handleDelete = (row) => {
    Alert.alert('Deactivate Product', `Deactivate "${row.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate', style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${ADMIN_API}/products/${row.id}`);
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
      emptyMsg="No products found"
    />
  );
};

export default ProductsView;

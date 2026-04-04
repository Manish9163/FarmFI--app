import React from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import DataTable from '../../components/admin/DataTable';
import { ADMIN_API } from '../../config/api';

const COLUMNS = [
  { key: 'id', label: 'ID', width: 50 },
  { key: 'full_name', label: 'Name', width: 140 },
  { key: 'email', label: 'Email', width: 180 },
  { key: 'role_name', label: 'Role', width: 80 },
  { key: 'is_active', label: 'Active', width: 70, render: (v) => v ? '✅' : '❌' },
];

const UsersView = ({ data, loading, onRefresh }) => {
  const handleToggle = async (row) => {
    try {
      await axios.patch(`${ADMIN_API}/users/${row.id}/toggle`);
      onRefresh();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    }
  };

  const handleDelete = (row) => {
    Alert.alert('Delete User', `Are you sure you want to delete ${row.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${ADMIN_API}/users/${row.id}`);
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
      onToggle={handleToggle}
      onDelete={handleDelete}
      emptyMsg="No users found"
    />
  );
};

export default UsersView;

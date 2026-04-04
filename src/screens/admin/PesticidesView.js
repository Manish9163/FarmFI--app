import React from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import DataTable from '../../components/admin/DataTable';
import { ADMIN_API } from '../../config/api';

const COLUMNS = [
  { key: 'id', label: 'ID', width: 50 },
  { key: 'disease_name', label: 'Disease', width: 160 },
  { key: 'pesticide_name', label: 'Pesticide', width: 150 },
  { key: 'dosage', label: 'Dosage', width: 120 },
];

const PesticidesView = ({ data, loading, onRefresh }) => {
  const handleDelete = (row) => {
    Alert.alert('Delete Pesticide', `Delete pesticide for "${row.disease_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${ADMIN_API}/pesticides/${row.id}`);
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
      emptyMsg="No pesticides found"
    />
  );
};

export default PesticidesView;

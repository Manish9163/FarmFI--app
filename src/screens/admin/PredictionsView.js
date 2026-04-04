import React from 'react';
import DataTable from '../../components/admin/DataTable';

const COLUMNS = [
  { key: 'prediction_id', label: 'ID', width: 50 },
  { key: 'user_id', label: 'User', width: 60 },
  { key: 'disease_name', label: 'Disease', width: 160 },
  { key: 'confidence_score', label: 'Confidence', width: 100, render: (v) => v ? `${(v * 100).toFixed(1)}%` : '—' },
];

const PredictionsView = ({ data, loading }) => (
  <DataTable data={data} loading={loading} columns={COLUMNS} emptyMsg="No disease predictions found" />
);

export default PredictionsView;

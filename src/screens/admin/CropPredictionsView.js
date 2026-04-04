import React from 'react';
import DataTable from '../../components/admin/DataTable';

const COLUMNS = [
  { key: 'prediction_id', label: 'ID', width: 50 },
  { key: 'user_id', label: 'User', width: 60 },
  { key: 'location', label: 'Soil Type', width: 120 },
  { key: 'recommended_crops', label: 'Crops', width: 180 },
  { key: 'suitability_score', label: 'Score', width: 70 },
];

const CropPredictionsView = ({ data, loading }) => (
  <DataTable data={data} loading={loading} columns={COLUMNS} emptyMsg="No crop predictions found" />
);

export default CropPredictionsView;

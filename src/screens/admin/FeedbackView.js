import React from 'react';
import DataTable from '../../components/admin/DataTable';

const COLUMNS = [
  { key: 'feedback_id', label: 'ID', width: 50 },
  { key: 'predicted_disease', label: 'Predicted', width: 150 },
  { key: 'actual_disease', label: 'Actual', width: 150 },
  { key: 'feedback_type', label: 'Type', width: 90 },
  { key: 'comment', label: 'Comment', width: 160 },
];

const FeedbackView = ({ data, loading }) => (
  <DataTable data={data} loading={loading} columns={COLUMNS} emptyMsg="No feedback records found" />
);

export default FeedbackView;

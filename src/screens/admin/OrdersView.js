import React from 'react';
import DataTable from '../../components/admin/DataTable';

const COLUMNS = [
  { key: 'id', label: 'ID', width: 50 },
  { key: 'farmer_name', label: 'Farmer', width: 130 },
  { key: 'total_amount', label: 'Amount', width: 90, render: (v) => `₹${v}` },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'payment_method', label: 'Payment', width: 100 },
];

const OrdersView = ({ data, loading }) => (
  <DataTable data={data} loading={loading} columns={COLUMNS} emptyMsg="No orders found" />
);

export default OrdersView;

import React from 'react';
import DataTable from '../../components/admin/DataTable';

const COLUMNS = [
  { key: 'id', label: 'ID', width: 50 },
  { key: ' vegetable_name', label: 'Product', width: 120 },
  { key: 'farmer_name', label: 'Farmer', width: 130 },
  { key: 'quantity_kg', label: 'Qty(kg)', width: 80 },
  { key: 'total_amount', label: 'Total', width: 90, render: (v) => `\u20B9${v}` },
  { key: 'status', label: 'Status', width: 100 },
];

const OrdersView = ({ data, loading }) => (
  <DataTable data={data} loading={loading} columns={COLUMNS} emptyMsg="No orders found" />
);

export default OrdersView;

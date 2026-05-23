import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ActivityLogs from './routes/ActivityLogs';
import AllListings from './routes/AllListings';
import Dashboard from './routes/Dashboard';
import Keywords from './routes/Keywords';
import ListingDetail from './routes/ListingDetail';
import Login from './routes/Login';
import MessagesReview from './routes/MessagesReview';
import PendingQueue from './routes/PendingQueue';
import Users from './routes/Users';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index            element={<Dashboard />} />
        <Route path="pending"   element={<PendingQueue />} />
        <Route path="listings"  element={<AllListings />} />
        <Route path="listings/:id"      element={<ListingDetail />} />
        <Route path="messages-review"   element={<MessagesReview />} />
        <Route path="keywords"          element={<Keywords />} />
        <Route path="users"     element={<Users />} />
        <Route path="logs"      element={<ActivityLogs />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import React from 'react';
import { Navigate } from 'react-router-dom';

// Wrap any screen that requires a logged-in user:
//   <ProtectedRoute user={user}><Dashboard /></ProtectedRoute>
// `user` should come from the onAuthStateChanged subscription held at App root.
export default function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

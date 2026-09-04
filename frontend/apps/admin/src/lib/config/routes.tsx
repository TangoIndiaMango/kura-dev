import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminWorkbenchPage } from '../../components/AdminWorkbenchPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminWorkbenchPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { WorkbenchPage } from '../../components/WorkbenchPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WorkbenchPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

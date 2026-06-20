import { createHashRouter } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import IndexPage from './pages/IndexPage'
import QueryPage from './pages/QueryPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <IndexPage /> },
      { path: 'query', element: <QueryPage /> },
    ],
  },
])

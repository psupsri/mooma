import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { ErrorPage } from './pages/ErrorPage'
import { HomePage } from './pages/HomePage'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        // Pathless wrapper so route errors render inside the layout.
        ErrorBoundary: ErrorPage,
        children: [
          { index: true, Component: HomePage },
          { path: '*', Component: ErrorPage },
        ],
      },
    ],
  },
])

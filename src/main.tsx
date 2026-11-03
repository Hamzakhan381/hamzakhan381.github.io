import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import 'lenis/dist/lenis.css'
import './styles.css'
import { RootLayout } from './layout/RootLayout'
import Home from './pages/Home'
import About from './pages/About'
import Services from './pages/Services'
import Projects from './pages/Projects'
import CV from './pages/CV'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'

const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: 'about', Component: About },
      { path: 'services', Component: Services },
      { path: 'projects', Component: Projects },
      { path: 'cv', Component: CV },
      { path: 'contact', Component: Contact },
      { path: '*', Component: NotFound },
    ],
  },
])

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

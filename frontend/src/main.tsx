import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer
        position="top-right"
        autoClose={2800}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable={false}
        limit={4}
        theme="dark"
        className="eduai-toast-container"
        toastClassName="eduai-toast"
      />
    </BrowserRouter>
  </StrictMode>,
)

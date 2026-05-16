import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { Slide, ToastContainer } from 'react-toastify'
import { TOAST_AUTO_CLOSE_MS, toastOptions } from './lib/notify'
import 'react-toastify/dist/ReactToastify.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer
        position="top-right"
        autoClose={TOAST_AUTO_CLOSE_MS}
        transition={Slide}
        newestOnTop
        draggable={false}
        limit={4}
        theme="dark"
        className="eduai-toast-container"
        toastClassName="eduai-toast"
        toastStyle={{ wordBreak: "break-word" }}
        {...toastOptions}
      />
    </BrowserRouter>
  </StrictMode>,
)

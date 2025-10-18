import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {AuthProvider} from "./contexts/AuthContext.jsx";
import ChatProvider from './components/chat/Context/ChatProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
         <App />
    </AuthProvider>
  </StrictMode>
)
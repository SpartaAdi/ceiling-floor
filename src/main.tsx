import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppStoreProvider } from './store/AppStore'
import { SyncProvider } from './sync/SyncProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStoreProvider>
      <SyncProvider>
        <App />
      </SyncProvider>
    </AppStoreProvider>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import koKR from 'antd/locale/ko_KR'
import './index.css'
import App from './App.jsx'

document.documentElement.setAttribute('data-theme', 'dark')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      locale={koKR}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#818cf8',
          borderRadius: 8,
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)

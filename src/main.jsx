import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntApp, ConfigProvider, theme } from 'antd'
import './lib/dayjsConfig.js'
import antdLocale from './lib/antdLocale.js'
import './index.css'
import App from './App.jsx'

document.documentElement.setAttribute('data-theme', 'dark')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      locale={antdLocale}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#818cf8',
          colorBgContainer: '#18181b',
          colorBgElevated: '#18181b',
          colorBorder: '#27272a',
          borderRadius: 10,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
        components: {
          Card: { colorBgContainer: '#18181b' },
          Statistic: { contentFontSize: 22 },
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)

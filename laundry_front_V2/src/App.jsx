import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'

import OrderLanding from './pages/public/OrderLanding'
import OrderWizard  from './pages/public/OrderWizard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<OrderLanding />} />
        <Route path="/order/wizard" element={<OrderWizard />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { RequireRole } from './components/RequireRole';
import { Storefront } from './pages/Storefront';
import { GameDetail } from './pages/GameDetail';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { PublisherGames } from './pages/PublisherGames';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { OrderHistory } from './pages/OrderHistory';
import { AdminRefunds } from './pages/AdminRefunds';
import { AdminGiftCards } from './pages/AdminGiftCards';
import { AdminPromotions } from './pages/AdminPromotions';
import { AdminAnalytics } from './pages/AdminAnalytics';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Storefront />} />
          <Route path="/games/:id" element={<GameDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<RequireRole />}>
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/orders/:orderId/confirmation" element={<OrderConfirmation />} />
          </Route>
          <Route element={<RequireRole roles={['PUBLISHER']} />}>
            <Route path="/publisher/games" element={<PublisherGames />} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN', 'PUBLISHER']} />}>
            <Route path="/admin/refunds" element={<AdminRefunds />} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route path="/admin/gift-cards" element={<AdminGiftCards />} />
            <Route path="/admin/promotions" element={<AdminPromotions />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Layout } from './components/Layout';
import { RequireRole } from './components/RequireRole';
import { Storefront } from './pages/Storefront';
import { Categories } from './pages/Categories';
import { Discover } from './pages/Discover';
import { Search } from './pages/Search';
import { Wishlist } from './pages/Wishlist';
import { Checkout } from './pages/Checkout';
import { GameDetail } from './pages/GameDetail';
import { CustomerLogin, PublisherLogin, AdminLogin } from './pages/Login';
import { Signup } from './pages/Signup';
import { PublisherSignup } from './pages/PublisherSignup';
import { PublisherGames } from './pages/PublisherGames';
import { PublisherSales } from './pages/PublisherSales';
import { PublisherOnboarding } from './pages/PublisherOnboarding';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { Subscribe } from './pages/Subscribe';
import { SubscriptionConfirmation } from './pages/SubscriptionConfirmation';
import { OrderHistory } from './pages/OrderHistory';
import { MyGames } from './pages/MyGames';
import { Profile } from './pages/Profile';
import { GiftCardsInfo } from './pages/GiftCardsInfo';
import { AdminRefunds } from './pages/AdminRefunds';
import { ManageUsers } from './pages/ManageUsers';
import { ManageGames } from './pages/ManageGames';
import { CreatePromotions } from './pages/CreatePromotions';
import { IssueGiftCards } from './pages/IssueGiftCards';
import { MonitorTransactions } from './pages/MonitorTransactions';
import { ManageSubscriptions } from './pages/ManageSubscriptions';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
      <WishlistProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Storefront />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/search" element={<Search />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/publisher/login" element={<PublisherLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/publisher/signup" element={<PublisherSignup />} />
          <Route element={<RequireRole roles={['CUSTOMER']} />}>
            <Route path="/games/:id" element={<GameDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/library" element={<MyGames />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/orders/:orderId/confirmation" element={<OrderConfirmation />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/gift-cards" element={<GiftCardsInfo />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/subscription/confirmation" element={<SubscriptionConfirmation />} />
          </Route>
          <Route element={<RequireRole roles={['PUBLISHER']} />}>
            <Route path="/publisher/games" element={<PublisherGames />} />
            <Route path="/publisher/sales" element={<PublisherSales />} />
            <Route path="/publisher/onboarding" element={<PublisherOnboarding />} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN', 'PUBLISHER']} />}>
            <Route path="/admin/refunds" element={<AdminRefunds />} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/games" element={<ManageGames />} />
            <Route path="/admin/promotions" element={<CreatePromotions />} />
            <Route path="/admin/gift-cards" element={<IssueGiftCards />} />
            <Route path="/admin/transactions" element={<MonitorTransactions />} />
            <Route path="/admin/subscriptions" element={<ManageSubscriptions />} />
          </Route>
        </Route>
      </Routes>
      </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

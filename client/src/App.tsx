import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { RequireRole } from './components/RequireRole';
import { Storefront } from './pages/Storefront';
import { GameDetail } from './pages/GameDetail';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { PublisherGames } from './pages/PublisherGames';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Storefront />} />
          <Route path="/games/:id" element={<GameDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<RequireRole roles={['PUBLISHER']} />}>
            <Route path="/publisher/games" element={<PublisherGames />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

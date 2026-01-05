import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from "./context/authContext";
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import './styles/dark-mode.css';
function App() {

  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          {/* Public routes - accessible only when not authenticated */}
          <Route path="/" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          
          {/* Protected routes - accessible only when authenticated */}
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App

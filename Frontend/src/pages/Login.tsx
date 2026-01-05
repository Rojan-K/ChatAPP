import React, { useState, useEffect } from "react";
import {Link, useNavigate} from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useLoginMutation } from "../lib/api";
import "../styles/Login.css";

const Login: React.FC = () => {
  const [formData,setFormData]=useState({
    email:"",
    password:""
});
  const { login: authLogin } = useAuth();
  const [login]=useLoginMutation();
  const navigate=useNavigate();
  const [error, setError] = useState('');
  const [isSuccess,setIsSuccess]=useState(false);
  const [showPassword, setShowPassword] = useState(false);

//handle change in input value
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try{
      const response=await login({
      email:formData.email,
      password:formData.password
    }).unwrap()
     if (response.success) {
        console.log('=== LOGIN RESPONSE DEBUG ===');
        console.log('Full API response:', response);
        console.log('Response data:', response.data);
        console.log('Response data fields:', Object.keys(response.data));
        console.log('Response data values:', Object.entries(response.data));
        console.log('=== END LOGIN RESPONSE DEBUG ===');
        
        setIsSuccess(true);
        // Clear form
        setFormData({
          email: '',
          password: '',
        });
        
        // Use auth context to store tokens and user data
        authLogin({
         Id: response.data.Id,  
         Fullname: response.data.Fullname,
         Email: response.data.Email
        }, response.accessToken, response.refreshToken);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/home');
        }, 200);
      }
    }catch (err: any) {
      console.error('Login error:', err);
      setError(err.data?.message || 'Login failed. Please try again.');
    }
   
  }; 

  return (
    <div className="login-page">
      {/* <div
        className="login-left"
        style={{ backgroundImage: `url(${images[currentImage]})` }}
      >
        <div className="overlay">
          <h1>Welcome to TalkieFy</h1>
          <p>Login to chat</p>
        </div>
      </div> */}
    
      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <img src="./public/logo2.png" alt="" />
          <h2>Login</h2>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              name="email"
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg className="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
              {error}
            </div>
          )}
          <button type="submit">Login</button>
          <p className="signup-text">
            Don't have an account? <Link to="/Register">Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;

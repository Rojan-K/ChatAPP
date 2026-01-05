import React, { useState } from "react";
import {Link,useNavigate} from "react-router-dom";
import { useRegisterMutation } from "../lib/api";
import "../styles/Register.css";


const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [register,{isLoading}] =useRegisterMutation();
  const navigate =useNavigate();
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const fullNameRegex = /^[A-Za-z]+(?: [A-Za-z]+)+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  //handle change in input value
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Reset error state
    setError(''); 

    //validate full name
    if(!fullNameRegex.test(formData.name)){
      setError('Enter full name and first letter of name and surname must be capital');
      return;
    }

    // Validate passwords
    if(!passwordRegex.test(formData.password)){
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    //email validation
    if(!emailRegex.test(formData.email)){
      setError('Invalid email format');
    }
    
    try {
      const response = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      }).unwrap();

      // If registration is successful
      if (response.success) {
        setIsSuccess(true);
        // Clear form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="Register-page">
     

      <div className="Register-right">
        <form className="Register-form" onSubmit={handleSubmit}>
          <img src="./public/logo2.png" alt="" />
          <h2>Create your account</h2>
          {isSuccess && (
            <div className="success-message" style={{ color: 'green', marginBottom: '10px' }}>
              Registration successful! Redirecting to login...
            </div>
          )}
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              type="password"
              id="confirm-password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
          </div>
           {error && (
            <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </button>
          <p className="login-text">
            already have an account? <Link to="/">Login in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;

import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

const LoginButton = ({ onLogin }) => {
  const navigate = useNavigate(); // 2. Activate the hook
  const handleSuccess = async (credentialResponse) => {
    const token = credentialResponse.credential;
    try {
      const response = await fetch('https://open-bet-capstone.onrender.com/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token }),
      });
      const data = await response.json();
      if (response.ok) {
        onLogin(data.user);
       
        if (!data.user.favoriteTeam) {
            navigate('/profile');
        }
        
      } else {
        console.error("Login failed:", data.error);
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => console.log('Login Failed')}
    />
  );
};

export default LoginButton;
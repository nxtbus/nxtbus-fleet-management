import React from 'react';
import logoImage from '../Images/dark-nxtbus.png';
import './Logo.css';

const Logo = ({ 
  size = 'medium', 
  showText = true, 
  variant = 'default',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'logo-small',
    medium: 'logo-medium', 
    large: 'logo-large'
  };

  const variantClasses = {
    default: 'logo-default',
    login: 'logo-login',
    sidebar: 'logo-sidebar',
    header: 'logo-header'
  };

  return (
    <div className={`nxtbus-logo ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      <img 
        src={logoImage} 
        alt="NxtBus Logo" 
        className="logo-image"
      />
      {showText && (
        <h1>NXTBUS</h1>
      )}
    </div>
  );
};

export default Logo;
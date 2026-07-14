import React from 'react';
// @ts-ignore
import logo from '../assets/branding/logo.png';

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number | string;
}

const Logo: React.FC<LogoProps> = ({
  size = 40,
  className,
  style,
  ...props
}) => {
  return (
    <img
      src={logo}
      alt="Lifehut Workspace"
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
         transform: 'scale(1.75)',   // Increase to 1.4 or 1.5 if needed
         transformOrigin: 'center',
        ...style,
      }}
      {...props}
    />
  );
};

export default Logo;


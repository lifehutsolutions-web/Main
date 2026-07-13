import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  fillColor?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = '100%', 
  fillColor = '#0A84FF', 
  className,
  ...props 
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Centered, high-fidelity sky blue crescent moon matching the uploaded design */}
      <path
        d="M 23.1,12.5 Q 2.4,51.5 81.2,87.5 Q 26.1,69.9 23.1,12.5 Z"
        fill={fillColor}
      />
    </svg>
  );
};

export default Logo;

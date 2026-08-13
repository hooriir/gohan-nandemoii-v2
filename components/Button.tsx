import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  variant?: "red" | "blue" | "sky";
  disabled?: boolean;
}

export default function Button({ 
  text, 
  variant = 'red', 
  type = 'button',
  disabled = false,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyle = "w-full mt-4 py-3 text-white font-bold rounded-xl shadow-md transition-all text-center";
  const stateStyle = disabled 
    ? "opacity-50 cursor-not-allowed" 
    : "cursor-pointer active:scale-[0.98]";

  const variantStyles = {
    red: "bg-brand-red hover:bg-red-600 shadow-brand-red/20",
    blue: "bg-brand-blue hover:bg-blue-600 shadow-brand-blue/20",
    sky: "bg-sky-400 hover:bg-sky-500 shadow-sky-400/20",
  }[variant];

  return (
    <button 
      type={type} 
      disabled={disabled}
      className={`${baseStyle} ${stateStyle} ${variantStyles} ${className}`}
      {...props}
    >
      {text}
    </button>
  );
}
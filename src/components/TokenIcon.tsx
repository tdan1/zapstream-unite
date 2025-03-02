
import React from "react";
import { Token } from "@/lib/types";

interface TokenIconProps {
  token: Token;
  size?: number;
  className?: string;
}

const TokenIcon: React.FC<TokenIconProps> = ({ 
  token, 
  size = 24, 
  className = "" 
}) => {
  // Default icons for common tokens
  const getIconPath = () => {
    switch (token.symbol.toLowerCase()) {
      case "eth":
        return "/icons/eth.svg";
      case "sweth":
        return "/icons/sweth.svg";
      case "usdc":
        return "/icons/usdc.svg";
      case "op":
        return "/icons/op.svg";
      case "dai":
        return "/icons/dai.svg";
      case "weth":
        return "/icons/weth.svg";
      default:
        return "/icons/generic-token.svg";
    }
  };

  return (
    <div 
      className={`flex-shrink-0 rounded-full overflow-hidden bg-white/10 ${className}`}
      style={{ width: size, height: size }}
    >
      <img 
        src={getIconPath()} 
        alt={`${token.symbol} icon`}
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback to showing the first letter of the token symbol if image fails to load
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement!.innerHTML = `
            <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-600 text-white font-bold">
              ${token.symbol.charAt(0)}
            </div>
          `;
        }}
      />
    </div>
  );
};

export default TokenIcon;


import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { connectWallet, formatAddress, verifyWalletOwnership } from "@/lib/contract";
import { ethers } from "ethers";
import { Wallet, Loader2, CheckCircle2, ChevronDown, LogOut } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WalletConnectProps {
  onConnect: (provider: ethers.providers.Web3Provider, signer: ethers.Signer, address: string) => void;
  onDisconnect: () => void;
  connected: boolean;
  address: string | null;
  assets?: {
    eth: string;
    sweth: string;
  };
}

const WalletConnect: React.FC<WalletConnectProps> = ({ 
  onConnect, 
  onDisconnect, 
  connected, 
  address,
  assets = { eth: "0", sweth: "0" }
}) => {
  const [connecting, setConnecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    
    try {
      const provider = await connectWallet();
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      onConnect(provider, signer, address);
      
      // After connecting, verify ownership
      await handleVerifyOwnership(provider, signer);
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsOpen(false);
    onDisconnect();
    setVerified(false);
  };

  const handleVerifyOwnership = async (provider: ethers.providers.Web3Provider, signer: ethers.Signer) => {
    if (!provider || !signer) return;
    
    setVerifying(true);
    setError(null);
    
    try {
      const isVerified = await verifyWalletOwnership(signer);
      setVerified(isVerified);
      
      if (!isVerified) {
        setError("Wallet ownership verification failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Error verifying wallet ownership:", err);
      setError(err.message || "Failed to verify wallet ownership. Please try again.");
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  // Effect to reconnect wallet if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          
          onConnect(provider, signer, address);
          
          // After reconnecting, verify ownership
          await handleVerifyOwnership(provider, signer);
        } catch (err) {
          console.error("Error reconnecting wallet:", err);
        }
      }
    };
    
    checkConnection();
  }, [onConnect]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {connected ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-swell-subtle text-swell animate-fade-in hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
          >
            <Wallet size={16} />
            <span className="font-medium">{formatAddress(address || "")}</span>
            {verified && (
              <CheckCircle2 size={16} className="text-green-500 ml-1" />
            )}
            <ChevronDown size={16} className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-lg shadow-lg p-4 z-50 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/30 animate-fade-in-down">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Connected Wallet</span>
                  <span className="text-sm font-medium">{formatAddress(address || "")}</span>
                </div>
                
                <div className="h-px bg-purple-100 dark:bg-purple-900/30 my-1" />
                
                <div className="space-y-2">
                  <div className="text-sm font-medium text-purple-800 dark:text-purple-300">Assets</div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                        E
                      </div>
                      <span className="text-sm">Ethereum</span>
                    </div>
                    <span className="text-sm font-medium">{parseFloat(assets.eth).toFixed(4)} ETH</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        S
                      </div>
                      <span className="text-sm">Swell ETH</span>
                    </div>
                    <span className="text-sm font-medium">{parseFloat(assets.sweth).toFixed(4)} swETH</span>
                  </div>
                </div>
                
                <div className="h-px bg-purple-100 dark:bg-purple-900/30 my-1" />
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-2 text-destructive hover:text-destructive-foreground"
                >
                  <LogOut size={14} />
                  Disconnect Wallet
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Button 
          onClick={handleConnect}
          disabled={connecting || verifying}
          className="bg-swell hover:bg-swell-dark transition-colors rounded-full px-6 py-2 font-medium"
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting
            </>
          ) : verifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </>
          )}
        </Button>
      )}
      
      {error && (
        <div className="text-destructive text-sm animate-fade-in px-4 py-2 rounded-lg bg-destructive/10">
          {error}
        </div>
      )}
    </div>
  );
};

export default WalletConnect;

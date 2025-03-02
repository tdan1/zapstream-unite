
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { connectWallet, formatAddress } from "@/lib/contract";
import { ethers } from "ethers";
import { Wallet, Loader2 } from "lucide-react";

interface WalletConnectProps {
  onConnect: (provider: ethers.providers.Web3Provider, signer: ethers.Signer, address: string) => void;
  connected: boolean;
  address: string | null;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect, connected, address }) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    
    try {
      const provider = await connectWallet();
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      onConnect(provider, signer, address);
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet. Please try again.");
    } finally {
      setConnecting(false);
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
        } catch (err) {
          console.error("Error reconnecting wallet:", err);
        }
      }
    };
    
    checkConnection();
  }, [onConnect]);

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {connected ? (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-swell-subtle text-swell animate-fade-in">
          <Wallet size={16} />
          <span className="font-medium">{formatAddress(address || "")}</span>
        </div>
      ) : (
        <Button 
          onClick={handleConnect}
          disabled={connecting}
          className="bg-swell hover:bg-swell-dark transition-colors rounded-full px-6 py-2 font-medium"
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting
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

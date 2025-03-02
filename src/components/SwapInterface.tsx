
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, Loader2, RefreshCw } from "lucide-react";
import { ethers } from "ethers";
import { AVAILABLE_TOKENS_FOR_SWAP, MAX_SLIPPAGE, TOKENS } from "@/lib/constants";
import { SwapQuote, Token } from "@/lib/types";
import { getSwapRoute, executeSwap, getTokenBalance } from "@/lib/api";

interface SwapInterfaceProps {
  connected: boolean;
  signer: ethers.Signer | null;
  provider: ethers.providers.Web3Provider | null;
  address: string | null;
  onSuccess: (txHash: string, quote: SwapQuote) => void;
}

const SwapInterface: React.FC<SwapInterfaceProps> = ({
  connected,
  signer,
  provider,
  address,
  onSuccess
}) => {
  const [fromToken, setFromToken] = useState<Token>(TOKENS.SWETH);
  const [toToken, setToToken] = useState<Token>(TOKENS.USDC);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromBalance, setFromBalance] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);

  // Update balances when tokens or wallet changes
  useEffect(() => {
    const updateBalances = async () => {
      if (!connected || !provider || !address) {
        setFromBalance("0");
        return;
      }

      try {
        const balance = await getTokenBalance(
          fromToken.address,
          address,
          provider
        );
        setFromBalance(balance);
      } catch (err) {
        console.error("Error fetching balance:", err);
        setFromBalance("0");
      }
    };

    updateBalances();
  }, [connected, provider, address, fromToken]);

  // Fetch quote when input changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!connected || !signer || !address || !fromAmount || parseFloat(fromAmount) === 0) {
        setToAmount("");
        setQuote(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // In a real implementation, you would call an API to get a swap quote
        // This is a simplified placeholder
        const quote = await getSwapRoute(
          fromToken,
          toToken,
          fromAmount,
          address
        );

        if (quote) {
          setToAmount(quote.toAmount);
          setQuote(quote);
        } else {
          setToAmount("");
          setQuote(null);
          setError("Could not find a swap route");
        }
      } catch (err: any) {
        console.error("Error fetching quote:", err);
        setError(err.message || "Failed to get swap quote");
        setToAmount("");
        setQuote(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the quote fetch
    const timer = setTimeout(() => {
      if (fromAmount && parseFloat(fromAmount) > 0) {
        fetchQuote();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [fromToken, toToken, fromAmount, connected, signer, address]);

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value);
      setError(null);
    }
  };

  const handleFromTokenChange = (value: string) => {
    const token = AVAILABLE_TOKENS_FOR_SWAP.find(t => t.address === value);
    if (token) {
      setFromToken(token);
      
      // If the to token is the same as the new from token, switch to another token
      if (toToken.address === token.address) {
        setToToken(fromToken);
      }
    }
  };

  const handleToTokenChange = (value: string) => {
    const token = AVAILABLE_TOKENS_FOR_SWAP.find(t => t.address === value);
    if (token) {
      setToToken(token);
      
      // If the from token is the same as the new to token, switch to another token
      if (fromToken.address === token.address) {
        setFromToken(toToken);
      }
    }
  };

  const handleMaxClick = () => {
    setFromAmount(fromBalance);
  };

  const handleSwapClick = async () => {
    if (!connected || !signer || !quote || !quote.route) {
      setError("Please connect your wallet and enter a valid amount");
      return;
    }

    setIsSwapping(true);
    setError(null);

    try {
      const tx = await executeSwap(quote.route, signer);
      onSuccess(tx.hash, quote);
      
      // Reset the form after successful swap
      setFromAmount("");
      setToAmount("");
      setQuote(null);
    } catch (err: any) {
      console.error("Swap error:", err);
      setError(err.message || "Swap failed. Please try again.");
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwitchTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount("");
    setToAmount("");
    setQuote(null);
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm border border-gray-200 shadow-elevated rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-semibold text-center gradient-text">
          Swap
        </CardTitle>
        <CardDescription className="text-center text-gray-600">
          Swap your tokens for other assets on Optimism
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* From Token Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">
              From
            </label>
            <div className="text-xs text-gray-500">
              Balance: {parseFloat(fromBalance).toFixed(6)}
              <button 
                onClick={handleMaxClick}
                className="ml-1 text-swell hover:text-swell-dark font-medium"
                disabled={parseFloat(fromBalance) === 0}
              >
                MAX
              </button>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={fromAmount}
                onChange={handleFromAmountChange}
                placeholder="0.0"
                className="font-medium text-lg glass-input"
                disabled={isSwapping || !connected}
              />
            </div>
            
            <Select 
              value={fromToken.address} 
              onValueChange={handleFromTokenChange}
              disabled={isSwapping}
            >
              <SelectTrigger className="w-[120px] glass-input">
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_TOKENS_FOR_SWAP.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Switch Button */}
        <div className="flex justify-center -my-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSwitchTokens}
            className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200"
            disabled={isSwapping || isLoading}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
        
        {/* To Token Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            To (estimated)
          </label>
          
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={toAmount}
                readOnly
                placeholder="0.0"
                className={`font-medium text-lg glass-input ${isLoading ? "animate-pulse" : ""}`}
              />
            </div>
            
            <Select 
              value={toToken.address} 
              onValueChange={handleToTokenChange}
              disabled={isSwapping}
            >
              <SelectTrigger className="w-[120px] glass-input">
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_TOKENS_FOR_SWAP.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Swap Info */}
        {quote && (
          <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm animate-fade-in">
            <div className="flex justify-between">
              <span className="text-gray-500">Price Impact</span>
              <span className={`font-medium ${parseFloat(quote.priceImpact.toString()) > 1 ? "text-orange-600" : "text-green-600"}`}>
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Max Slippage</span>
              <span className="font-medium">{MAX_SLIPPAGE}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fee</span>
              <span className="font-medium">$0.1</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-destructive text-sm bg-destructive/10 p-2 rounded animate-fade-in">
            {error}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleSwapClick}
          disabled={
            isSwapping || 
            isLoading || 
            !connected || 
            !fromAmount || 
            parseFloat(fromAmount) === 0 || 
            !toAmount || 
            !quote
          }
          className="w-full h-12 bg-swell hover:bg-swell-dark transition-all duration-300"
        >
          {isSwapping ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Swapping...
            </>
          ) : isLoading ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Loading Quote...
            </>
          ) : !connected ? (
            "Connect Wallet"
          ) : !fromAmount || parseFloat(fromAmount) === 0 ? (
            "Enter Amount"
          ) : !quote ? (
            "Invalid Swap"
          ) : (
            "Swap Now"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SwapInterface;

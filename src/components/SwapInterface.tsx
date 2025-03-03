
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, Loader2, RefreshCw, ArrowLeftRight } from "lucide-react";
import { ethers } from "ethers";
import { AVAILABLE_TOKENS_FOR_SWAP, MAX_SLIPPAGE, TOKENS } from "@/lib/constants";
import { SwapQuote, Token } from "@/lib/types";
import { getSwapRoute, executeSwap, getTokenBalance } from "@/lib/api";
import TokenIcon from "./TokenIcon";

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
    <Card className="w-full max-w-md mx-auto glass-panel border-purple-100 dark:border-purple-900/30 shadow-elevated rounded-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 dark:from-purple-900/10 dark:to-blue-900/10" />
      
      <CardHeader className="pb-4 relative">
        <CardTitle className="text-2xl font-semibold text-center text-purple-900 dark:text-purple-300">
          Swap Tokens
        </CardTitle>
        <CardDescription className="text-center text-purple-700/70 dark:text-purple-300/70">
          Swap your tokens for other assets on Optimism
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 relative">
        {/* From Token Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-purple-800 dark:text-purple-300">
              From
            </label>
            <div className="text-xs text-purple-600 dark:text-purple-400">
              Balance: {parseFloat(fromBalance).toFixed(6)}
              <button 
                onClick={handleMaxClick}
                className="ml-1 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                disabled={parseFloat(fromBalance) === 0}
              >
                MAX
              </button>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <TokenIcon token={fromToken} size={20} />
            </div>
            <Input
              type="text"
              value={fromAmount}
              onChange={handleFromAmountChange}
              placeholder="0.0"
              className="pl-10 pr-24 font-medium text-lg glass-input bg-white/40 dark:bg-black/20 border-purple-100 dark:border-purple-900/30"
              disabled={isSwapping || !connected}
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              <Select 
                value={fromToken.address} 
                onValueChange={handleFromTokenChange}
                disabled={isSwapping}
              >
                <SelectTrigger className="border-0 bg-transparent focus:ring-0 text-purple-600 dark:text-purple-400 font-medium">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-purple-100 dark:border-purple-900/30">
                  {AVAILABLE_TOKENS_FOR_SWAP.map((token) => (
                    <SelectItem key={token.address} value={token.address} className="flex items-center gap-2">
                      <TokenIcon token={token} size={16} />
                      <span>{token.symbol}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Switch Button */}
        <div className="flex justify-center my-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center cursor-pointer" onClick={handleSwitchTokens}>
            <ArrowDown className="h-4 w-4 text-purple-500 dark:text-purple-400" />
          </div>
        </div>
        
        {/* To Token Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-purple-800 dark:text-purple-300">
            To (estimated)
          </label>
          
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <TokenIcon token={toToken} size={20} />
            </div>
            <Input
              type="text"
              value={toAmount}
              readOnly
              placeholder="0.0"
              className={`pl-10 pr-24 font-medium text-lg glass-input bg-white/40 dark:bg-black/20 border-purple-100 dark:border-purple-900/30 ${isLoading ? "animate-pulse" : ""}`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              <Select 
                value={toToken.address} 
                onValueChange={handleToTokenChange}
                disabled={isSwapping}
              >
                <SelectTrigger className="border-0 bg-transparent focus:ring-0 text-purple-600 dark:text-purple-400 font-medium">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-purple-100 dark:border-purple-900/30">
                  {AVAILABLE_TOKENS_FOR_SWAP.map((token) => (
                    <SelectItem key={token.address} value={token.address} className="flex items-center gap-2">
                      <TokenIcon token={token} size={16} />
                      <span>{token.symbol}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Swap Info */}
        {quote && (
          <div className="p-3 bg-white/40 dark:bg-black/20 rounded-lg space-y-1 text-sm animate-fade-in border border-purple-100/30 dark:border-purple-900/20">
            <div className="flex justify-between">
              <span className="text-purple-700/70 dark:text-purple-300/70">Price Impact</span>
              <span className={`font-medium ${parseFloat(quote.priceImpact.toString()) > 1 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}>
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700/70 dark:text-purple-300/70">Max Slippage</span>
              <span className="font-medium text-purple-800 dark:text-purple-300">{MAX_SLIPPAGE}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700/70 dark:text-purple-300/70">Fee</span>
              <span className="font-medium text-purple-800 dark:text-purple-300">$0.1</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-md animate-fade-in">
            {error}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="relative">
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
          className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 transition-all duration-300"
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
            <>
              <ArrowLeftRight className="mr-2 h-5 w-5" />
              Swap Now
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SwapInterface;

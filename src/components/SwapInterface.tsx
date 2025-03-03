
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowDown, Loader2, RefreshCw, Settings } from "lucide-react";
import { ethers } from "ethers";
import { AVAILABLE_TOKENS_FOR_SWAP, MAX_SLIPPAGE, TOKENS } from "@/lib/constants";
import { SwapQuote, Token } from "@/lib/types";
import { getSwapRoute, executeSwap, getTokenBalance } from "@/lib/api";
import TokenIcon from "@/components/TokenIcon";

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
  const [fromToken, setFromToken] = useState<Token>(TOKENS.ETH);
  const [toToken, setToToken] = useState<Token>(TOKENS.USDC);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromBalance, setFromBalance] = useState("0");
  const [toBalance, setToBalance] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);

  // Update balances when tokens or wallet changes
  useEffect(() => {
    const updateBalances = async () => {
      if (!connected || !provider || !address) {
        setFromBalance("0");
        setToBalance("0");
        return;
      }

      try {
        const fromBal = await getTokenBalance(
          fromToken.address,
          address,
          provider
        );
        setFromBalance(fromBal);

        const toBal = await getTokenBalance(
          toToken.address,
          address,
          provider
        );
        setToBalance(toBal);
      } catch (err) {
        console.error("Error fetching balance:", err);
        setFromBalance("0");
        setToBalance("0");
      }
    };

    updateBalances();
  }, [connected, provider, address, fromToken, toToken]);

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
    <div className="max-w-md w-full mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Token Swap</h1>
        <p className="text-gray-600">Trade tokens instantly with precision and elegance</p>
      </div>
      
      <Card className="border border-gray-200 bg-white shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex justify-between items-center pb-3 pt-5 px-5">
          <h2 className="text-xl font-bold text-gray-900">Swap</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-500">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-500">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-5 p-5">
          {/* From Token Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-600">
                From
              </label>
              <div className="text-xs text-gray-500">
                Balance: {parseFloat(fromBalance).toFixed(4)}
                <button 
                  onClick={handleMaxClick}
                  className="ml-1 text-blue-600 font-medium"
                  disabled={parseFloat(fromBalance) === 0}
                >
                  Max
                </button>
              </div>
            </div>
            
            <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
              <Input
                type="text"
                value={fromAmount}
                onChange={handleFromAmountChange}
                placeholder="0.0"
                className="flex-1 border-0 bg-transparent text-lg font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isSwapping || !connected}
              />
              
              <Select 
                value={fromToken.address} 
                onValueChange={handleFromTokenChange}
                disabled={isSwapping}
              >
                <SelectTrigger className="border-0 bg-white shadow-sm w-[130px] ml-2 h-10">
                  <SelectValue placeholder="Token">
                    <div className="flex items-center">
                      <TokenIcon token={fromToken} size={20} className="mr-2" />
                      <span>{fromToken.symbol}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {AVAILABLE_TOKENS_FOR_SWAP.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center">
                        <TokenIcon token={token} size={20} className="mr-2" />
                        <span>{token.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Switch Button */}
          <div className="flex justify-center my-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSwitchTokens}
              className="h-8 w-8 rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
              disabled={isSwapping || isLoading}
            >
              <ArrowDown className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
          
          {/* To Token Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-600">
                To
              </label>
              <div className="text-xs text-gray-500">
                Balance: {parseFloat(toBalance).toFixed(4)}
              </div>
            </div>
            
            <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
              <Input
                type="text"
                value={toAmount}
                readOnly
                placeholder="0.0"
                className={`flex-1 border-0 bg-transparent text-lg font-medium focus-visible:ring-0 focus-visible:ring-offset-0 ${isLoading ? "animate-pulse" : ""}`}
              />
              
              <Select 
                value={toToken.address} 
                onValueChange={handleToTokenChange}
                disabled={isSwapping}
              >
                <SelectTrigger className="border-0 bg-white shadow-sm w-[130px] ml-2 h-10">
                  <SelectValue placeholder="Token">
                    <div className="flex items-center">
                      <TokenIcon token={toToken} size={20} className="mr-2" />
                      <span>{toToken.symbol}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {AVAILABLE_TOKENS_FOR_SWAP.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center">
                        <TokenIcon token={token} size={20} className="mr-2" />
                        <span>{token.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Swap Info */}
          {quote && (
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-1 text-sm">
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
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Swap Button */}
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
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium"
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
              "Swap"
            )}
          </Button>
        </CardContent>
      </Card>
      
      <div className="text-center mt-8 text-gray-500 text-sm">
        <p>Designed with simplicity and precision in mind.</p>
        <p>Every detail carefully crafted for a seamless experience.</p>
      </div>
    </div>
  );
};

export default SwapInterface;

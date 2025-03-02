import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Coins, Loader2, RefreshCw } from "lucide-react";
import { ethers } from "ethers";
import { estimateSwethAmount, stakeEthToSweth, restakeSwethViaEigen } from "@/lib/contract";
import { MIN_ETH_AMOUNT } from "@/lib/constants";

interface StakingInterfaceProps {
  connected: boolean;
  signer: ethers.Signer | null;
  provider: ethers.providers.Web3Provider | null;
  ethBalance: string;
  swethBalance: string;
  isRestaking?: boolean;
  onSuccess: (txHash: string) => void;
}

const StakingInterface: React.FC<StakingInterfaceProps> = ({
  connected,
  signer,
  provider,
  ethBalance,
  swethBalance,
  isRestaking = false,
  onSuccess
}) => {
  const [amount, setAmount] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("0");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = isRestaking ? "Restake swETH" : "Stake ETH";
  const description = isRestaking
    ? "Restake your swETH through EigenLayer for additional rewards"
    : "Stake your ETH to receive swETH liquid staking tokens";
  const balance = isRestaking ? swethBalance : ethBalance;
  const inputToken = isRestaking ? "swETH" : "ETH";
  const outputToken = isRestaking ? "rswETH" : "swETH";

  useEffect(() => {
    const updateEstimatedAmount = async () => {
      if (!amount || parseFloat(amount) === 0 || !provider) {
        setEstimatedAmount("0");
        return;
      }

      try {
        if (!isRestaking) {
          const estimated = await estimateSwethAmount(amount, provider);
          setEstimatedAmount(estimated);
        } else {
          setEstimatedAmount(amount);
        }
      } catch (err) {
        console.error("Error estimating amount:", err);
        setEstimatedAmount("0");
      }
    };

    updateEstimatedAmount();
  }, [amount, provider, isRestaking]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const handleMaxClick = () => {
    if (isRestaking) {
      setAmount(swethBalance);
    } else {
      const maxAmount = parseFloat(ethBalance) > 0.01
        ? (parseFloat(ethBalance) - 0.01).toFixed(18)
        : "0";
      setAmount(maxAmount);
    }
  };

  const validateAmount = (): boolean => {
    if (!amount || parseFloat(amount) === 0) {
      setError("Please enter an amount");
      return false;
    }

    if (parseFloat(amount) < MIN_ETH_AMOUNT) {
      setError(`Minimum amount is ${MIN_ETH_AMOUNT} ${inputToken}`);
      return false;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      setError(`Insufficient ${inputToken} balance`);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!connected || !signer) {
      setError("Please connect your wallet first");
      return;
    }

    if (!validateAmount()) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let tx;
      
      if (isRestaking) {
        tx = await restakeSwethViaEigen(amount, signer);
      } else {
        tx = await stakeEthToSweth(amount, signer);
      }
      
      onSuccess(tx.hash);
      
      setAmount("");
      setEstimatedAmount("0");
    } catch (err: any) {
      console.error("Transaction error:", err);
      setError(err.message || "Transaction failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto glass-panel border border-gray-200 dark:border-gray-800 shadow-elevated rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-semibold text-center gradient-text">
          {title}
        </CardTitle>
        <CardDescription className="text-center text-gray-600 dark:text-gray-300">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount
            </label>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Balance: {parseFloat(balance).toFixed(6)} {inputToken}
              <button 
                onClick={handleMaxClick}
                className="ml-1 text-swell hover:text-swell-dark dark:text-swell-light dark:hover:text-swell font-medium"
                disabled={parseFloat(balance) === 0}
              >
                MAX
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Input
              id="amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.0"
              className="pr-16 font-medium text-lg glass-input"
              disabled={isProcessing || !connected}
            />
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 font-medium">{inputToken}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center my-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="estimated" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            You will receive (estimated)
          </label>
          
          <div className="relative">
            <Input
              id="estimated"
              type="text"
              value={estimatedAmount}
              readOnly
              className="pr-16 font-medium text-lg glass-input"
            />
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 font-medium">{outputToken}</span>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="text-destructive text-sm bg-destructive/10 dark:bg-destructive/20 p-2 rounded animate-fade-in">
            {error}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleSubmit}
          disabled={isProcessing || !connected || !amount || parseFloat(amount) === 0}
          className="w-full h-12 bg-swell hover:bg-swell-dark transition-all duration-300"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {isRestaking ? "Restaking..." : "Staking..."}
            </>
          ) : (
            <>
              {isRestaking ? (
                <RefreshCw className="mr-2 h-5 w-5" />
              ) : (
                <Coins className="mr-2 h-5 w-5" />
              )}
              {isRestaking ? "Restake Now" : "Stake Now"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default StakingInterface;


import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import WalletConnect from "@/components/WalletConnect";
import StakingInterface from "@/components/StakingInterface";
import SwapInterface from "@/components/SwapInterface";
import { Coins, GitMerge, ArrowLeftRight, ExternalLink } from "lucide-react";
import { ethers } from "ethers";
import { TOKENS } from "@/lib/constants";
import { getAccountBalances } from "@/lib/contract";
import { Transaction, TransactionStatus, TransactionType, SwapQuote } from "@/lib/types";

const Index = () => {
  const { toast } = useToast();
  const [wallet, setWallet] = useState({
    connected: false,
    address: null as string | null,
    provider: null as ethers.providers.Web3Provider | null,
    signer: null as ethers.Signer | null,
    chainId: null as number | null,
    balance: {
      eth: "0",
      sweth: "0"
    }
  });
  const [activeTab, setActiveTab] = useState("stake");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Update account balances periodically
  useEffect(() => {
    if (!wallet.connected || !wallet.provider || !wallet.address) return;

    const updateBalances = async () => {
      try {
        const balances = await getAccountBalances(wallet.address!, wallet.provider);
        setWallet(prev => ({
          ...prev,
          balance: balances
        }));
      } catch (error) {
        console.error("Error updating balances:", error);
      }
    };

    // Update balances immediately
    updateBalances();

    // Then update every 30 seconds
    const interval = setInterval(updateBalances, 30000);
    
    return () => clearInterval(interval);
  }, [wallet.connected, wallet.provider, wallet.address]);

  // Handle wallet connection
  const handleWalletConnect = (
    provider: ethers.providers.Web3Provider,
    signer: ethers.Signer,
    address: string
  ) => {
    setWallet({
      connected: true,
      address,
      provider,
      signer,
      chainId: provider.network.chainId,
      balance: {
        eth: "0",
        sweth: "0"
      }
    });

    toast({
      title: "Wallet Connected",
      description: `Connected to ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
    });
  };

  // Handle transaction success
  const handleStakingSuccess = (txHash: string) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: activeTab === "restake" ? TransactionType.RESTAKE : TransactionType.STAKE,
      status: TransactionStatus.PENDING,
      hash: txHash,
      fromToken: activeTab === "restake" ? TOKENS.SWETH : TOKENS.ETH,
      toToken: activeTab === "restake" ? { ...TOKENS.SWETH, symbol: "rswETH", name: "Restaked swETH" } : TOKENS.SWETH,
      fromAmount: "0", // We don't have this info
      toAmount: "0", // We don't have this info
      timestamp: Date.now()
    };

    setTransactions(prev => [newTransaction, ...prev]);

    toast({
      title: activeTab === "restake" ? "Restaking Initiated" : "Staking Initiated",
      description: `Transaction hash: ${txHash.substring(0, 10)}...`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`https://optimistic.etherscan.io/tx/${txHash}`, "_blank")}
          className="flex items-center gap-1"
        >
          <ExternalLink size={14} />
          View
        </Button>
      ),
    });
  };

  // Handle swap success
  const handleSwapSuccess = (txHash: string, quote: SwapQuote) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: TransactionType.SWAP,
      status: TransactionStatus.PENDING,
      hash: txHash,
      fromToken: quote.fromToken,
      toToken: quote.toToken,
      fromAmount: quote.fromAmount,
      toAmount: quote.toAmount,
      timestamp: Date.now()
    };

    setTransactions(prev => [newTransaction, ...prev]);

    toast({
      title: "Swap Initiated",
      description: `Swapping ${quote.fromAmount} ${quote.fromToken.symbol} to ${quote.toToken.symbol}`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`https://optimistic.etherscan.io/tx/${txHash}`, "_blank")}
          className="flex items-center gap-1"
        >
          <ExternalLink size={14} />
          View
        </Button>
      ),
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-blue-50">
      {/* Header */}
      <header className="w-full py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold gradient-text">SwellFlow</h1>
            <div className="ml-4 px-3 py-1 bg-swell-subtle text-swell text-xs font-medium rounded-full">
              Beta
            </div>
          </div>
          <WalletConnect
            onConnect={handleWalletConnect}
            connected={wallet.connected}
            address={wallet.address}
          />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <section className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
              <span className="gradient-text">Simplify Your Swellchain Experience</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stake, restake, and swap in one seamless interface. Unlock the power of Swellchain with just a few clicks.
            </p>
          </section>

          {/* Main Interface */}
          <section className="mb-12">
            <Tabs defaultValue="stake" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="stake" className="data-[state=active]:bg-swell data-[state=active]:text-white">
                  <Coins className="mr-2 h-4 w-4" />
                  Stake ETH
                </TabsTrigger>
                <TabsTrigger value="restake" className="data-[state=active]:bg-swell data-[state=active]:text-white">
                  <GitMerge className="mr-2 h-4 w-4" />
                  Restake swETH
                </TabsTrigger>
                <TabsTrigger value="swap" className="data-[state=active]:bg-swell data-[state=active]:text-white">
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Swap Tokens
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="stake" className="animate-scale-in">
                <StakingInterface
                  connected={wallet.connected}
                  signer={wallet.signer}
                  provider={wallet.provider}
                  ethBalance={wallet.balance.eth}
                  swethBalance={wallet.balance.sweth}
                  onSuccess={handleStakingSuccess}
                />
              </TabsContent>
              
              <TabsContent value="restake" className="animate-scale-in">
                <StakingInterface
                  connected={wallet.connected}
                  signer={wallet.signer}
                  provider={wallet.provider}
                  ethBalance={wallet.balance.eth}
                  swethBalance={wallet.balance.sweth}
                  isRestaking={true}
                  onSuccess={handleStakingSuccess}
                />
              </TabsContent>
              
              <TabsContent value="swap" className="animate-scale-in">
                <SwapInterface
                  connected={wallet.connected}
                  signer={wallet.signer}
                  provider={wallet.provider}
                  address={wallet.address}
                  onSuccess={handleSwapSuccess}
                />
              </TabsContent>
            </Tabs>
          </section>

          {/* Recent Transactions */}
          {wallet.connected && transactions.length > 0 && (
            <section className="mb-12 animate-fade-in">
              <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="transaction-card card-hover">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium">
                            {tx.type === TransactionType.STAKE
                              ? "Staked ETH"
                              : tx.type === TransactionType.RESTAKE
                              ? "Restaked swETH"
                              : `Swapped ${tx.fromToken.symbol} to ${tx.toToken.symbol}`}
                          </span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            tx.status === TransactionStatus.PENDING
                              ? "bg-yellow-100 text-yellow-800"
                              : tx.status === TransactionStatus.CONFIRMED
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                      </div>
                      
                      {tx.hash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://optimistic.etherscan.io/tx/${tx.hash}`, "_blank")}
                          className="text-gray-500 hover:text-swell"
                        >
                          <ExternalLink size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Info Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Stake ETH</h3>
              <p className="text-gray-600 mb-4">Convert your ETH to liquid staking tokens (swETH) and earn staking rewards.</p>
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("stake")}
                className="w-full border-swell text-swell hover:bg-swell hover:text-white"
              >
                Start Staking
              </Button>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Restake via EigenLayer</h3>
              <p className="text-gray-600 mb-4">Maximize your yields by restaking your swETH through EigenLayer protocols.</p>
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("restake")}
                className="w-full border-swell text-swell hover:bg-swell hover:text-white"
              >
                Restake Now
              </Button>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2">Swap Tokens</h3>
              <p className="text-gray-600 mb-4">Swap your swETH or other tokens for assets of your choice on Optimism DEXes.</p>
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("swap")}
                className="w-full border-swell text-swell hover:bg-swell hover:text-white"
              >
                Swap Tokens
              </Button>
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full py-8 bg-white/50 backdrop-blur-sm border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-gray-500">
                © 2023 SwellFlow. All rights reserved.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-gray-600 hover:text-swell transition-colors">
                Terms
              </a>
              <a href="#" className="text-gray-600 hover:text-swell transition-colors">
                Privacy
              </a>
              <a href="#" className="text-gray-600 hover:text-swell transition-colors">
                FAQ
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

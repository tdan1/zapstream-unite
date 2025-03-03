
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import WalletConnect from "@/components/WalletConnect";
import StakingInterface from "@/components/StakingInterface";
import SwapInterface from "@/components/SwapInterface";
import { Coins, GitMerge, ArrowLeftRight, ExternalLink } from "lucide-react";
import { ethers } from "ethers";
import { TOKENS } from "@/lib/constants";
import { getAccountBalances } from "@/lib/contract";
import { Transaction, TransactionStatus, TransactionType, SwapQuote } from "@/lib/types";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const [activeTab, setActiveTab] = useState("swap");
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">SwellFlow</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <WalletConnect
              onConnect={handleWalletConnect}
              connected={wallet.connected}
              address={wallet.address}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Main Interface */}
        <section className="mb-12">
          <Tabs defaultValue="swap" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6 bg-white border border-gray-200 rounded-lg">
              <TabsTrigger value="stake" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-600">
                <Coins className="mr-2 h-4 w-4" />
                Stake ETH
              </TabsTrigger>
              <TabsTrigger value="restake" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-600">
                <GitMerge className="mr-2 h-4 w-4" />
                Restake swETH
              </TabsTrigger>
              <TabsTrigger value="swap" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-600">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Swap Tokens
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="stake" className="animate-in fade-in">
              <StakingInterface
                connected={wallet.connected}
                signer={wallet.signer}
                provider={wallet.provider}
                ethBalance={wallet.balance.eth}
                swethBalance={wallet.balance.sweth}
                onSuccess={handleStakingSuccess}
              />
            </TabsContent>
            
            <TabsContent value="restake" className="animate-in fade-in">
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
            
            <TabsContent value="swap" className="animate-in fade-in">
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
          <section className="max-w-md mx-auto mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Recent Transactions</h2>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-800">
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
                        className="text-blue-600"
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
      </main>

      <footer className="w-full py-4 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              © 2023 SwellFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

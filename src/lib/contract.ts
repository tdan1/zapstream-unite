
import { ethers } from "ethers";
import { CHAIN_ID, CONTRACTS, TOKENS, API } from "./constants";
import { getProvider, getSimpleStakingContract, getEigenStakingContract, getTokenContract } from "./api";
import type { ContractCallOptions } from "./types";

// Check if the current network is supported
export const checkNetwork = async (provider: ethers.providers.Web3Provider): Promise<boolean> => {
  const network = await provider.getNetwork();
  return network.chainId === CHAIN_ID;
};

// Request connection to the wallet
export const connectWallet = async (): Promise<ethers.providers.Web3Provider> => {
  if (!window.ethereum) {
    throw new Error("No Ethereum wallet detected. Please install MetaMask or another wallet.");
  }

  try {
    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    // Create a Web3Provider instance
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Check if we're on the correct network
    const isCorrectNetwork = await checkNetwork(provider);
    
    if (!isCorrectNetwork) {
      // Request network switch
      await switchToOptimism();
      // Refresh the provider after network switch
      return new ethers.providers.Web3Provider(window.ethereum);
    }
    
    return provider;
  } catch (error) {
    console.error("Error connecting to wallet:", error);
    throw error;
  }
};

// Switch to Optimism network
export const switchToOptimism = async (): Promise<void> => {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }]
    });
  } catch (error: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${CHAIN_ID.toString(16)}`,
            chainName: "Optimism",
            nativeCurrency: {
              name: "Ethereum",
              symbol: "ETH",
              decimals: 18
            },
            rpcUrls: [API.OPTIMISM_RPC],
            blockExplorerUrls: ["https://optimistic.etherscan.io"]
          }
        ]
      });
    } else {
      throw error;
    }
  }
};

// Get account balances (ETH and swETH)
export const getAccountBalances = async (
  address: string,
  provider: ethers.providers.Web3Provider
): Promise<{ eth: string; sweth: string }> => {
  try {
    // Get ETH balance
    const ethBalance = await provider.getBalance(address);
    
    // Get swETH balance
    const swEthContract = getTokenContract(TOKENS.SWETH.address, provider);
    const swEthBalance = await swEthContract.balanceOf(address);
    
    return {
      eth: ethers.utils.formatEther(ethBalance),
      sweth: ethers.utils.formatEther(swEthBalance)
    };
  } catch (error) {
    console.error("Error fetching balances:", error);
    return { eth: "0", sweth: "0" };
  }
};

// Stake ETH to swETH using the SimpleStaking contract
export const stakeEthToSweth = async (
  amount: string,
  signer: ethers.Signer,
  options?: ContractCallOptions
): Promise<ethers.ContractTransaction> => {
  try {
    const stakingContract = getSimpleStakingContract(signer);
    const amountWei = ethers.utils.parseEther(amount);
    
    const txOptions: ContractCallOptions = {
      value: amountWei.toString(),
      ...options
    };
    
    // Call the deposit function with value
    return stakingContract.deposit(txOptions);
  } catch (error) {
    console.error("Error staking ETH:", error);
    throw error;
  }
};

// Estimate the amount of swETH received for a given ETH amount
export const estimateSwethAmount = async (
  ethAmount: string,
  provider: ethers.providers.Provider
): Promise<string> => {
  try {
    if (!ethAmount || parseFloat(ethAmount) === 0) return "0";
    
    const stakingContract = getSimpleStakingContract(provider);
    const ethAmountWei = ethers.utils.parseEther(ethAmount);
    const swethAmountWei = await stakingContract.getSwETHByETH(ethAmountWei);
    
    return ethers.utils.formatEther(swethAmountWei);
  } catch (error) {
    console.error("Error estimating swETH amount:", error);
    return "0";
  }
};

// Approve swETH for restaking via EigenLayer
export const approveSwethForRestaking = async (
  amount: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransaction> => {
  try {
    const swEthContract = getTokenContract(TOKENS.SWETH.address, signer);
    const amountWei = ethers.utils.parseEther(amount);
    
    // Approve the EigenStaking contract to spend swETH
    return swEthContract.approve(CONTRACTS.SWELL_EIGEN_STAKING, amountWei);
  } catch (error) {
    console.error("Error approving swETH for restaking:", error);
    throw error;
  }
};

// Restake swETH via EigenLayer
export const restakeSwethViaEigen = async (
  amount: string,
  signer: ethers.Signer,
  options?: ContractCallOptions
): Promise<ethers.ContractTransaction> => {
  try {
    // First, approve the transfer
    const approvalTx = await approveSwethForRestaking(amount, signer);
    await approvalTx.wait(); // Wait for approval to be confirmed
    
    // Then, call the depositSwETH function
    const eigenContract = getEigenStakingContract(signer);
    const amountWei = ethers.utils.parseEther(amount);
    
    return eigenContract.depositSwETH(amountWei, options);
  } catch (error) {
    console.error("Error restaking swETH:", error);
    throw error;
  }
};

// Listen for Optimism Bridge events
export const listenToBridgeEvents = (
  provider: ethers.providers.Provider,
  callback: (event: any) => void
): ethers.Contract => {
  const bridgeAbi = [
    "event ETHDepositInitiated(address indexed from, address indexed to, uint256 amount, bytes data)"
  ];
  
  const bridgeContract = new ethers.Contract(CONTRACTS.OPTIMISM_BRIDGE, bridgeAbi, provider);
  
  // Set up event listener for bridge deposits
  bridgeContract.on("ETHDepositInitiated", (from, to, amount, data, event) => {
    callback({
      from,
      to,
      amount: ethers.utils.formatEther(amount),
      data,
      event
    });
  });
  
  return bridgeContract;
};

// Helper function to format and shorten addresses
export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Helper function to format transaction amounts with proper decimals
export const formatAmount = (amount: string | number, decimals: number = 18): string => {
  if (typeof amount === "number") {
    amount = amount.toString();
  }
  
  try {
    // Parse the amount as a BigNumber
    const parsedAmount = ethers.utils.parseUnits(amount, decimals);
    
    // Format it back to a string with the appropriate decimals
    return ethers.utils.formatUnits(parsedAmount, decimals);
  } catch (error) {
    console.error("Error formatting amount:", error);
    return "0";
  }
};

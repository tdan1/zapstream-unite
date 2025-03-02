
import { ethers } from "ethers";
import { API, CONTRACTS, MAX_SLIPPAGE, TOKENS } from "./constants";
import type { SwapQuote, Token } from "./types";

// Simplified ABI for the Swell Simple Staking contract
const SIMPLE_STAKING_ABI = [
  "function deposit() external payable",
  "function getSwETHByETH(uint256 _ethAmount) external view returns (uint256)"
];

// Simplified ABI for the Swell Eigen Staking contract
const EIGEN_STAKING_ABI = [
  "function depositSwETH(uint256 _amount) external",
  "function balanceOf(address _user) external view returns (uint256)"
];

// Simplified ABI for ERC20 tokens
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

export const getProvider = (customRpc?: string) => {
  return new ethers.providers.JsonRpcProvider(customRpc || API.OPTIMISM_RPC);
};

export const getContract = (
  address: string,
  abi: any,
  signerOrProvider: ethers.Signer | ethers.providers.Provider
) => {
  return new ethers.Contract(address, abi, signerOrProvider);
};

export const getSimpleStakingContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
  return getContract(CONTRACTS.SWELL_SIMPLE_STAKING, SIMPLE_STAKING_ABI, signerOrProvider);
};

export const getEigenStakingContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
  return getContract(CONTRACTS.SWELL_EIGEN_STAKING, EIGEN_STAKING_ABI, signerOrProvider);
};

export const getTokenContract = (
  tokenAddress: string,
  signerOrProvider: ethers.Signer | ethers.providers.Provider
) => {
  return getContract(tokenAddress, ERC20_ABI, signerOrProvider);
};

export const getSwethForEth = async (
  ethAmount: string,
  provider: ethers.providers.Provider
): Promise<string> => {
  if (!ethAmount || parseFloat(ethAmount) === 0) return "0";
  
  try {
    const stakingContract = getSimpleStakingContract(provider);
    const ethAmountWei = ethers.utils.parseEther(ethAmount);
    const swethAmountWei = await stakingContract.getSwETHByETH(ethAmountWei);
    return ethers.utils.formatEther(swethAmountWei);
  } catch (error) {
    console.error("Error estimating swETH amount:", error);
    return "0";
  }
};

export const stakeEth = async (
  amount: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransaction> => {
  const stakingContract = getSimpleStakingContract(signer);
  const amountWei = ethers.utils.parseEther(amount);
  
  return stakingContract.deposit({ value: amountWei });
};

export const approveTokenForContract = async (
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  decimals: number,
  signer: ethers.Signer
): Promise<ethers.ContractTransaction> => {
  const tokenContract = getTokenContract(tokenAddress, signer);
  const amountToApprove = ethers.utils.parseUnits(amount, decimals);
  
  return tokenContract.approve(spenderAddress, amountToApprove);
};

export const restakeSweth = async (
  amount: string,
  signer: ethers.Signer
): Promise<ethers.ContractTransaction> => {
  // First approve swETH for the Eigen Staking contract
  const approvalTx = await approveTokenForContract(
    TOKENS.SWETH.address,
    CONTRACTS.SWELL_EIGEN_STAKING,
    amount,
    TOKENS.SWETH.decimals,
    signer
  );
  
  // Wait for approval to be confirmed
  await approvalTx.wait();
  
  // Now deposit swETH into the Eigen Staking contract
  const eigenContract = getEigenStakingContract(signer);
  const amountWei = ethers.utils.parseEther(amount);
  
  return eigenContract.depositSwETH(amountWei);
};

export const getTokenBalance = async (
  tokenAddress: string,
  accountAddress: string,
  provider: ethers.providers.Provider
): Promise<string> => {
  // If this is the native ETH token
  if (tokenAddress === TOKENS.ETH.address) {
    const balance = await provider.getBalance(accountAddress);
    return ethers.utils.formatEther(balance);
  }
  
  // For ERC20 tokens
  const tokenContract = getTokenContract(tokenAddress, provider);
  const balance = await tokenContract.balanceOf(accountAddress);
  const decimals = await tokenContract.decimals();
  
  return ethers.utils.formatUnits(balance, decimals);
};

export const getSwapRoute = async (
  fromToken: Token,
  toToken: Token,
  amount: string,
  walletAddress: string
): Promise<SwapQuote | null> => {
  // This is a simplified implementation of the ENSO route API call
  // In a real implementation, you would call the ENSO API and handle the response
  
  try {
    const response = await fetch(`${API.ENSO_ROUTE}?fromToken=${fromToken.address}&toToken=${toToken.address}&amount=${amount}&fromAddress=${walletAddress}&slippage=${MAX_SLIPPAGE}`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch swap route");
    }
    
    const data = await response.json();
    
    return {
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: data.toAmount || "0",
      route: data,
      priceImpact: data.priceImpact || 0
    };
  } catch (error) {
    console.error("Error fetching swap route:", error);
    return null;
  }
};

export const executeSwap = async (
  route: any,
  signer: ethers.Signer
): Promise<ethers.ContractTransaction> => {
  // In a real implementation, you would use the route data to execute the swap
  // This is a simplified implementation for demonstration purposes
  
  // First approve the token spending if needed
  if (route.approvalData) {
    const tokenContract = getTokenContract(route.approvalData.token, signer);
    await tokenContract.approve(route.approvalData.spender, route.approvalData.amount);
  }
  
  // Then execute the swap transaction
  return signer.sendTransaction({
    to: route.to,
    data: route.data,
    value: route.value || "0",
    gasLimit: route.gasLimit || 2000000
  });
};

export const getEthPrice = async (): Promise<number> => {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    const data = await response.json();
    return data.ethereum.usd || 0;
  } catch (error) {
    console.error("Error fetching ETH price:", error);
    return 0;
  }
};

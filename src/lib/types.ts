
import { ethers } from "ethers";

export type Token = {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  logoURI?: string;
};

export enum TransactionType {
  STAKE = "STAKE",
  RESTAKE = "RESTAKE",
  SWAP = "SWAP",
  BRIDGE = "BRIDGE"
}

export enum TransactionStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED"
}

export type Transaction = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  hash?: string;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  timestamp: number;
};

export type WalletState = {
  connected: boolean;
  address: string | null;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  chainId: number | null;
  balance: {
    eth: string;
    sweth: string;
  };
};

export type StakingState = {
  amount: string;
  isStaking: boolean;
  isRestaking: boolean;
  stakingTxHash: string | null;
};

export type SwapState = {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  isSwapping: boolean;
  route: any | null;
  slippage: number;
};

export type SwapQuote = {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  route: any;
  priceImpact: number;
};

export type AppState = {
  wallet: WalletState;
  staking: StakingState;
  swap: SwapState;
  transactions: Transaction[];
  activeTab: "stake" | "restake" | "swap";
};

export interface ContractCallOptions {
  value?: string;
  gasLimit?: number;
}


export const CHAIN_ID = 10; // Optimism
export const TESTNET_CHAIN_ID = 420; // Optimism Goerli Testnet

export const CONTRACTS = {
  SWELL_SIMPLE_STAKING: "0xf4A338A329643C130fDDeD145cD2fB0F579F0Ae6",
  SWELL_EIGEN_STAKING: "0x56B391349E39C5EB9A3F14BC0E24736A63E53b14",
  SWETH_TOKEN: "0x0C14e822E43796d955a30917a65613d4b30e5047",
  OPTIMISM_BRIDGE: "0xDC5e37d9DaCf15eF5EBcEeF72C7f481F6f271336"
};

export const TOKENS = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" // Standard representation for native ETH
  },
  SWETH: {
    symbol: "swETH",
    name: "Swell ETH",
    decimals: 18,
    address: CONTRACTS.SWETH_TOKEN
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607" // USDC on Optimism
  }
};

export const API = {
  ENSO_ROUTE: "https://api.enso.finance/api/v1/shortcuts/route",
  OPTIMISM_RPC: "https://optimism.llamarpc.com",
  SWELLCHAIN_RPC: "https://rpc.swellnetwork.io"
};

export const MIN_ETH_AMOUNT = 0.01;
export const MAX_SLIPPAGE = 0.5; // 0.5%
export const TRANSACTION_FEE = 0.1; // $0.1 fee

export const AVAILABLE_TOKENS_FOR_SWAP = [
  TOKENS.ETH,
  TOKENS.SWETH,
  TOKENS.USDC,
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    decimals: 18,
    address: "0x4200000000000000000000000000000000000006"
  },
  {
    symbol: "OP",
    name: "Optimism",
    decimals: 18,
    address: "0x4200000000000000000000000000000000000042"
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  }
];

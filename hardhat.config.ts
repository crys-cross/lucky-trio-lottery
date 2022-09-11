import "@nomicfoundation/hardhat-toolbox"
import "hardhat-deploy"
import "hardhat-contract-sizer"
import "dotenv/config"
import { HardhatUserConfig } from "hardhat/config"

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const GOERLI_RPC_URL = process.env.RINKEBY_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

// Your API key for Etherscan, obtain one at https://etherscan.io/
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "Your polygonscan API key"
const REPORT_GAS = process.env.REPORT_GAS || false

const config: HardhatUserConfig = {
    // solidity: "0.8.8",
    solidity: {
        compilers: [{ version: "0.8.8" }, { version: "0.8.4" }, { version: "0.6.6" }],
    },
    networks: {
        hardhat: {
            // // If you want to do some forking, uncomment this
            // forking: {
            //   url: MAINNET_RPC_URL
            // }
            chainId: 31337,
        },
        goerli: {
            url: GOERLI_RPC_URL || "",
            accounts: [PRIVATE_KEY],
            chainId: 5,
        },
        fantomtest: {
            url: "https://rpc.testnet.fantom.network" || "",
            accounts: [PRIVATE_KEY],
            chainId: 4002,
        },
        fujitest: {
            url: "https://api.avax-test.network/ext/bc/C/rpc" || "",
            accounts: [PRIVATE_KEY],
            chainId: 43113,
        },
        mumbaitest: {
            url: "https://polygon-testnet.public.blastapi.io" || "",
            accounts: [PRIVATE_KEY],
            chainId: 80001,
        },
        optimismkovan: {
            url: "https://kovan.optimism.io/" || "",
            accounts: [PRIVATE_KEY],
            chainId: 69,
        },
        bnbtest: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545" || "",
            accounts: [PRIVATE_KEY],
            chainId: 97,
        },
        klaytontest: {
            url: "https://api.baobab.klaytn.net:8651" || "",
            accounts: [PRIVATE_KEY],
            chainId: 1001,
        },
        // arbitrum: {
        //     url: "https://data-seed-prebsc-1-s1.binance.org:8545" || "",
        //     accounts: [PRIVATE_KEY],
        //     chainId: 97,
        // },
        metisstardust: {
            url: "https://stardust.metis.io/?owner=588" || "",
            accounts: [PRIVATE_KEY],
            chainId: 588,
        },
        evmostest: {
            url: "https://eth.bd.evmos.dev:8545" || "",
            accounts: [PRIVATE_KEY],
            chainId: 9000,
        },
    },
    gasReporter: {
        enabled: true,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
        token: "ETH",
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        user: {
            default: 1,
        },
    },
    // mocha: {
    //     timeout: 40000, //4000 seconds
    // },
}
export default config

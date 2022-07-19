import "typechain/hardhat"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "hardhat-deploy"
import "solidity-coverage"
import "hardhat-gas-reporter"
import "hardhat-contract-sizer"
import "dotenvconfig"
import { HardhatUserConfig } from "hardhat/config"

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL
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
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            // // If you want to do some forking, uncomment this
            // forking: {
            //   url: MAINNET_RPC_URL
            // }
            chainId: 31337,
        },
        localhost: {
            chainId: 31337,
        },
        rinkeby: {
            url: RINKEBY_RPC_URL || "",
            accounts: [PRIVATE_KEY],
            chainId: 4,
            // },
            // kovan: {
            //     url: KOVAN_RPC_URL,
            //     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            //     //accounts: {
            //     //     mnemonic: MNEMONIC,
            //     // },
            //     saveDeployments: true,
            //     chainId: 42,
            // },
            // rinkeby: {
            //     url: RINKEBY_RPC_URL,
            //     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            //     //   accounts: {
            //     //     mnemonic: MNEMONIC,
            //     //   },
            //     saveDeployments: true,
            //     chainId: 4,
            // },
            // mainnet: {
            //     url: MAINNET_RPC_URL,
            //     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            //     //   accounts: {
            //     //     mnemonic: MNEMONIC,
            //     //   },
            //     saveDeployments: true,
            //     chainId: 1,
            // },
            // polygon: {
            //     url: POLYGON_MAINNET_RPC_URL,
            //     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            //     saveDeployments: true,
            //     chainId: 137,
            // },
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
}
export default config

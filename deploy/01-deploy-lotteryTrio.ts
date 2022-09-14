import { ethers } from "hardhat"
import { DeployFunction } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config"
import verify from "../utils/verify"

const FUND_AMOUNT = "1000000000000000000000"

const deployLotteryTrio: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address
    let subscriptionId

    if (chainId == 31337) {
        // create VRFV2 Subscription
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        // Fund the subscription
        // Our mock makes it so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[network.config.chainId!]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[network.config.chainId!]["subscriptionId"]
    }
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("-----------------------------------------------------")
    const args: any[] = [
        vrfCoordinatorV2Address,
        networkConfig[network.config.chainId!]["lotteryEntranceFee"],
        networkConfig[network.config.chainId!]["gasLane"],
        subscriptionId,
        networkConfig[network.config.chainId!]["callbackGasLimit"],
        networkConfig[network.config.chainId!]["keepersUpdateInterval"],
    ]
    const lotteryTrio = await deploy("LotteryTrio", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: waitBlockConfirmations,
    })

    const blockNumBefore = await ethers.provider.getBlockNumber()
    const blockBefore = await ethers.provider.getBlock(blockNumBefore)
    const timestampBefore = blockBefore.timestamp
    console.log(`current block.timestamp is: ${timestampBefore}`)

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(lotteryTrio.address, args)
    }

    // log("Run Price Feed contract with command")
    // const networkName = network.name == "hardhat" ? "localhost" : network.name
    // log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`)
    // log("----------------------------------------------------")
}
export default deployLotteryTrio
deployLotteryTrio.tags = ["all", "raffle"]

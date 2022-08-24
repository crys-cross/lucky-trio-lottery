import fs from "fs"
import { ethers, network } from "hardhat"
import { DeployFunction } from "hardhat-deploy/types"

const frontEndContractsFile = "../lucky-trio-frontend/constants/networkAddresses.json"
const frontEndAbiFile = "../lucky-trio-frontend/constants/luckyTrioAbi.json"

const updateUI: DeployFunction = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating Front End")
        updateContractAddresses()
        updateAbi()
        console.log("Front end written!")
    }
}
const updateContractAddresses = async () => {
    const lotteryTrio = await ethers.getContract("LotteryTrio")
    const chainId = network.config.chainId!.toString()
    const currentAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId]["LotteryTrio"].includes(lotteryTrio.address)) {
            currentAddresses[chainId]["LotteryTrio"].push(lotteryTrio.address)
        }
    } else {
        currentAddresses[chainId] = { LotteryTrio: [lotteryTrio.address] }
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(currentAddresses))
    console.log("Addresses written!")
}
const updateAbi = async () => {
    const lotteryTrio = await ethers.getContract("LotteryTrio")
    fs.writeFileSync(
        frontEndAbiFile,
        lotteryTrio.interface.format(ethers.utils.FormatTypes.json).toString()
    )
    console.log("ABI written!")
}

export default updateUI
updateUI.tags = ["all", "frontend"]

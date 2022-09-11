import { BigNumber } from "ethers"
import { ethers, network } from "hardhat"
import { LotteryTrio, VRFCoordinatorV2Mock } from "../typechain-types"

async function mockKeepers() {
    const lottery: LotteryTrio = await ethers.getContract("LotteryTrio")
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""))
    const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(checkData)
    if (upkeepNeeded) {
        const tx = await lottery.performUpkeep(checkData)
        const txReceipt = await tx.wait(1)
        const requestId = txReceipt.events![1].args!.requestId
        console.log(`Performed upkeep with RequestId: ${requestId}`)
        await mockVrf(requestId, lottery)
        console.log("done...")
        //     if (network.config.chainId == 31337) {
        //         await mockVrf(requestId, lottery)
        //     }
        // } else {
        //     console.log("No upkeep needed!")
    }
}

async function mockVrf(requestId: BigNumber, lottery: LotteryTrio) {
    console.log("We on a local network? Ok let's pretend...")
    const vrfCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract(
        "VRFCoordinatorV2Mock"
    )
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address)
    console.log("Responded!")
    const recentWinner = await lottery.getRecentWinner()
    console.log(`The winner is: ${recentWinner}`)
    const recentWinningNumber = await lottery.getRecentWinningNumber()
    console.log(`The winning number is: ${recentWinningNumber}`)
    const totalBalance = await lottery.getTotalBalance()
    console.log(`The TotalBalance is: ${totalBalance}`)
    const potmoney = await lottery.getPotMoney()
    console.log(`The potmoney is: ${potmoney}`)
    const adminfund = await lottery.getAdminFund()
    console.log(`The adminfund is: ${adminfund}`)
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

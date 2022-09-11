import { ethers } from "hardhat"

async function enterRaffle() {
    const lottery = await ethers.getContract("LotteryTrio")
    const entranceFee = await lottery.getEntranceFee()
    await lottery.enterLottery(888, { value: entranceFee })
    console.log("Entered!")
    const totalBalance = await lottery.getTotalBalance()
    console.log(`The TotalBalance is: ${totalBalance}`)
    const potmoney = await lottery.getPotMoney()
    console.log(`The potmoney is: ${potmoney}`)
    const adminfund = await lottery.getAdminFund()
    console.log(`The adminfund is: ${adminfund}`)
}

enterRaffle()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

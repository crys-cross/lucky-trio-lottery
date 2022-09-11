import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { isAddress } from "ethers/lib/utils"
import { deployments, ethers, network } from "hardhat"
import { subtask } from "hardhat/config"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { LotteryTrio, VRFCoordinatorV2Mock } from "../../typechain-types"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Unit Test", () => {
          let lottery: LotteryTrio
          let lottery2: LotteryTrio
          let lottery3: LotteryTrio
          let lotteryContract: LotteryTrio
          let lotteryDeployer: LotteryTrio
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let lotteryEntranceFee: BigNumber
          let interval: number
          let accounts: SignerWithAddress[]
          let deployer: SignerWithAddress
          let player: SignerWithAddress
          let player2: SignerWithAddress
          let player3: SignerWithAddress

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]
              player2 = accounts[2]
              player3 = accounts[2]
              await deployments.fixture(["mocks", "raffle"])
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              lotteryContract = await ethers.getContract("LotteryTrio")
              lotteryDeployer = lotteryContract.connect(deployer)
              lottery = lotteryContract.connect(player)
              lottery2 = lotteryContract.connect(player2)
              lottery3 = lotteryContract.connect(player3)
              lotteryEntranceFee = await lottery.getEntranceFee()
              interval = (await lottery.getInterval()).toNumber()
          })
          describe("constructor", () => {
              it("initializes the raffle correctly", async () => {
                  console.log(network.config.chainId)

                  const lotteryState = (await lottery.getLotteryState()).toString()
                  assert.equal(lotteryState, "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId!]["keepersUpdateInterval"]
                  )
              })
          })
          describe("enterLottery", () => {
              it("reverts when you don't pay enough", async () => {
                  await expect(
                      lottery.enterLottery(888, { value: 0 })
                  ).to.be.revertedWithCustomError(lottery, "Lottery_Not_enough_ETH_paid")
              })
              it("reverts when rafflestate is closed || can't enter when lotter is calculating", async () => {
                  await lottery.enterLottery(888, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })

                  await lottery.performUpkeep([])
                  await expect(
                      lottery2.enterLottery(889, { value: lotteryEntranceFee })
                  ).to.be.revertedWithCustomError(lottery, "Lottery__NotOpen")
              })
              it("reverts when your number is already taken", async () => {
                  await lottery.enterLottery(888, { value: lotteryEntranceFee })

                  await expect(
                      lottery2.enterLottery(888, { value: lotteryEntranceFee })
                  ).to.be.revertedWithCustomError(lottery2, "Lottery__NumberAlreadyTaken")
              })
              it("properly saves players address and number", async () => {
                  await lottery.enterLottery(888, { value: lotteryEntranceFee })
                  const playerAddress = await lottery.s_playersEntry(888) // mapping
                  assert.equal(playerAddress, player.address)
              })
              it("emits event on enter", async () => {
                  await expect(lottery.enterLottery(888, { value: lotteryEntranceFee })).to.emit(
                      lottery,
                      "RaffleEnter"
                  )
              })
          })
          describe("checkUpkeep", () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async () => {
                  await lottery.enterLottery(888, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  await lottery.performUpkeep([])
                  const raffleState = await lottery.getLotteryState()
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery(888, { value: lotteryEntranceFee })
                  //   await network.provider.send("evm_increaseTime", [interval - 1])
                  //   await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await lottery.enterLottery(888, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert(upkeepNeeded)
              })
          })
          describe("performUpkeep", () => {
              it("can only run if checkupkeep is true", async () => {
                  await lottery.enterLottery(888, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const tx = await lottery.performUpkeep("0x")
                  assert(tx)
              })
              it("reverts if checkup is false", async () => {
                  await expect(lottery.performUpkeep("0x")).to.be.revertedWithCustomError(
                      lottery,
                      "Lottery__UpKeepNotNeeded"
                  )
              })
              it("updates the raffle state and emits a requestId", async () => {
                  await lottery.enterLottery(888, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const txResponse = await lottery.performUpkeep("0x")
                  const txReceipt = await txResponse.wait(1)
                  const lotterytate = await lottery.getLotteryState()
                  const requestId = txReceipt!.events![1].args!.requestId
                  assert(requestId.toNumber() > 0)
                  assert(lotterytate == 1)
              })
          })
          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await lottery.enterLottery(888, { value: lotteryEntranceFee })
                  await lottery2.enterLottery(889, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("can only be called after performupkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
                  ).to.be.revertedWith("nonexistent request")
              })

              it("adjust potMoney and adminFund even if no winner", async () => {
                  const tx = await lottery.performUpkeep("0x")
                  const txReceipt = await tx.wait(1)
                  const response = await vrfCoordinatorV2Mock.fulfillRandomWords(
                      txReceipt!.events![1].args!.requestId,
                      lottery.address
                  )
                  const winner = (await lottery.getRecentWinner()).toString()
                  const number = (await lottery.getRecentWinningNumber()).toString()
                  const players = (await lottery.getNumberofPlayers()).toString()
                  const time = (await lottery.getLatestTimeStamp()).toString()
                  const total = (await lottery.getTotalBalance()).toString()
                  const potmoney = (await lottery.getPotMoney()).toString()
                  const adminfund = (await lottery.getAdminFund()).toString()
                  console.log(winner)
                  console.log(number)
                  console.log(players)
                  console.log(time)
                  console.log(total)
                  console.log(potmoney)
                  console.log(adminfund)
                  expect((await lottery.getTotalBalance()).toString()).to.equal("20000000000000000")
              })
              it("emit event event if no winner", async () => {
                  const tx = await lottery.performUpkeep("0x")
                  const txReceipt = await tx.wait(1)
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt!.events![1].args!.requestId,
                          lottery.address
                      )
                  ).to.emit(lottery, "NoWinner")
              })
              it("send potmoney funds if winner is picked", async () => {
                  await lottery3.enterLottery(509, { value: lotteryEntranceFee })
                  const winnerStartingBalance = await player3.getBalance()
                  const tx = await lottery.performUpkeep("0x")
                  const txReceipt = await tx.wait(1)
                  await vrfCoordinatorV2Mock.fulfillRandomWords(
                      txReceipt!.events![1].args!.requestId,
                      lottery.address
                  )
                  const winner = (await lottery.getRecentWinner()).toString()
                  const number = (await lottery.getRecentWinningNumber()).toString()
                  const players = (await lottery.getNumberofPlayers()).toString()
                  const time = (await lottery.getLatestTimeStamp()).toString()
                  const total = (await lottery.getTotalBalance()).toString()
                  const potmoney = (await lottery.getPotMoney()).toString()
                  const adminfund = (await lottery.getAdminFund()).toString()
                  console.log(`winner is : ${winner}`)
                  console.log(`winning number is: ${number}`)
                  console.log(`number of players are: ${players}`)
                  console.log(`unix time is ${time}`)
                  console.log(`total fund is : ${total}`)
                  console.log(`potmoney is : ${potmoney}`)
                  console.log(`adminfund is : ${adminfund}`)
                  assert.equal(await winner.toString(), player3.address)
              })
              it("adjust funds if winner is picked", async () => {
                  await lottery3.enterLottery(509, { value: lotteryEntranceFee })
                  const tx = await lottery.performUpkeep("0x")
                  const txReceipt = await tx.wait(1)
                  await vrfCoordinatorV2Mock.fulfillRandomWords(
                      txReceipt!.events![1].args!.requestId,
                      lottery.address
                  )
                  const total = (await lottery.getTotalBalance()).toString()
                  const potmoney = (await lottery.getPotMoney()).toString()
                  const adminfund = (await lottery.getAdminFund()).toString()
                  console.log(`total fund is : ${total}`)
                  console.log(`potmoney is : ${potmoney}`)
                  console.log(`adminfund is : ${adminfund}`)
                  await expect(potmoney).to.equal("0")
              })
              it("emit event if winner picked", async () => {
                  await lottery3.enterLottery(509, { value: lotteryEntranceFee })
                  const tx = await lottery.performUpkeep("0x")
                  const txReceipt = await tx.wait(1)
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt!.events![1].args!.requestId,
                          lottery.address
                      )
                  ).to.emit(lottery, "WinnerPicked")
              })
          })
          describe("withdrawAdminFund", () => {
              beforeEach(async () => {
                  await lottery.enterLottery(888, { value: lotteryEntranceFee })
                  await lottery2.enterLottery(889, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("only Owner can withdraw and adminFund to zero after", async () => {
                  await lotteryDeployer.withdrawAdminFund()
                  const total = (await lottery.getTotalBalance()).toString()
                  const potmoney = (await lottery.getPotMoney()).toString()
                  const adminfund = (await lottery.getAdminFund()).toString()
                  console.log(`total fund is : ${total}`)
                  console.log(`potmoney is : ${potmoney}`)
                  console.log(`adminfund is : ${adminfund}`)
                  assert.equal(await adminfund.toString(), "0")
              })
          })
      })

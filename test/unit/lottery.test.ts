import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { deployments, ethers, network } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { LotteryTrio, VRFCoordinatorV2Mock } from "../../typechain-types"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", () => {
          let lottery: LotteryTrio
          let lotteryContract: LotteryTrio
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let lotteryEntranceFee: BigNumber
          let interval: number
          let accounts: SignerWithAddress[]
          let player: SignerWithAddress
          let playersNumber: number = 888

          beforeEach(async () => {
              accounts = await ethers.getSigners() //could also be done with getNamedAccounts
              // deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["mocks", "raffle"])
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              lotteryContract = await ethers.getContract("LotteryTrio")
              lottery = lotteryContract.connect(player)
              lotteryEntranceFee = await lottery.getEntranceFee()
              interval = (await lottery.getInterval()).toNumber()
          })
          describe("constructor", () => {
              it("initializes the raffle correctly", async () => {
                  console.log(network.config.chainId)
                  // Ideally, we'd separate these out so that only 1 assert per "it" block
                  // And ideally, we'd make this check everything
                  const lotteryState = (await lottery.getLotteryState()).toString()
                  assert.equal(lotteryState, "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId!]["keepersUpdateInterval"]
                      //check more constructor to test
                  )
              })
          })
          describe("enterLottery", () => {
              it("reverts when you don't pay enough", async () => {
                  await expect(lottery.enterLottery(playersNumber)).to.be.revertedWith(
                      "Lottery_Not_enough_ETH_paid"
                  )
              })
              it("reverts when rafflestate is closed || can't enter when lotter is calculating", async () => {
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  // pretend to be a keeper
                  await lottery.performUpkeep([])
                  await expect(
                      lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  ).to.be.revertedWith("Lottery__NotOpen")
              })
              it("reverts when your number is already taken", async () => {
                  //player 1 enter
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  //initlialize player 2
                  const lottery2 = lotteryContract.connect(accounts[2])
                  //will expect error player 2 enter with same number
                  await expect(
                      lottery2.enterLottery(888, { value: lotteryEntranceFee })
                  ).to.be.revertedWith("Lottery__NumberAlreadyTaken")
              })
              it("properly saves players address and number", async () => {
                  //player 1 enter
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  // const contractPlayer = await lottery.getPlayersNumberbyIndex(0)
                  //check if entered number and address saved
                  // assert(contractPlayer == 888)//TODO check 888 is saved
              })
              it("emits event on enter", async () => {
                  await expect(
                      lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  ).to.emit(lottery, "RaffleEnter")
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
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  await lottery.performUpkeep([])
                  const raffleState = await lottery.getLotteryState()
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval - 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x")
                  assert(upkeepNeeded)
              })
          })
          describe("performUpkeep", () => {
              it("can only run if checkupkeep is true", async () => {
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const tx = await lottery.performUpkeep("0x")
                  assert(tx)
              })
              it("reverts if checkup is false", async () => {
                  await expect(lottery.performUpkeep("0x")).to.be.revertedWith(
                      "Reffle__UpKeepNotNeeded"
                  )
              })
              it("updates the raffle state and emits a requestId", async () => {
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
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
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("can only be called after performupkeep", async () => {
                  //reserve
              })
              it("reverts if no one picked the winning number", async () => {
                  //reserve
              })
              it("adjust potMoney and adminFund even if no winner", async () => {
                  //reserve
              })
              it("emit event even if no winner", async () => {
                  //reserve
              })
              it("picks a winner, resets, and sends money", async () => {
                  //reserve
              })
          })
          describe("withdrawAdminFund", () => {
              it("only Owner can withdraw and adminFund to zero after", async () => {
                  //reserve
              })
          })
      })

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { isAddress } from "ethers/lib/utils"
import { deployments, ethers, network } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { LotteryTrio, VRFCoordinatorV2Mock } from "../../typechain-types"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Unit Test", () => {
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
                  const playerAddress = await lottery.s_playersEntry(playersNumber) // mapping
                  //   const number = await lottery.s_playersNumber(0)//TODO check 888 is saved
                  //check if entered number and address saved
                  assert.equal(playerAddress, player.address)
                  //   assert.equal(lottery.getPlayersNumberbyIndex(0), number)//TODO check 888 is saved
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
                  await network.provider.send("evm_increaseTime", [interval + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("can only be called after performupkeep", async () => {
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
                  ).to.be.revertedWith("nonexistent request")
              })
              it("reverts if no one picked the winning number", async () => {
                  //player 1 and 2 send transaction
                  const player1Number = 80
                  const player2Number = 8
                  const lottery2 = lotteryContract.connect(accounts[2])
                  await lottery.enterLottery(player1Number, { value: lotteryEntranceFee })
                  await lottery2.enterLottery(player2Number, { value: lotteryEntranceFee })
                  //no match for winning number(TODO:recentWinner should be address(0))
                  await expect(lotteryContract.getRecentWinner()).to.be.revertedWith(
                      "Lottery__NoOnePickedWinningNumber"
                  )
              })
              it("adjust potMoney and adminFund even if no winner", async () => {
                  const player1Number = 80
                  const player2Number = 8
                  const lottery2 = lotteryContract.connect(accounts[2])
                  await lottery.enterLottery(player1Number, { value: lotteryEntranceFee })
                  await lottery2.enterLottery(player2Number, { value: lotteryEntranceFee })
                  //check value of potMoney and adminFund after no winner below
              })
              it("emit event even if no winner", async () => {
                  const player1Number = 80
                  const player2Number = 8
                  const lottery2 = lotteryContract.connect(accounts[2])
                  await lottery.enterLottery(player1Number, { value: lotteryEntranceFee })
                  await lottery2.enterLottery(player2Number, { value: lotteryEntranceFee })
                  //emit event below TODO
              })
              it("picks a winner, resets, and sends money", async () => {
                  const player2Number = 8
                  const lottery2 = lotteryContract.connect(accounts[2])
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  await lottery2.enterLottery(player2Number, { value: lotteryEntranceFee })
                  //TODO long test
                  //check winner wallet balance, potmoney balance(0) and adminFund balance below
              })
              it("adjust potMoney and adminFund after winner is picked", async () => {
                  const player2Number = 8
                  const lottery2 = lotteryContract.connect(accounts[2])
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  await lottery2.enterLottery(player2Number, { value: lotteryEntranceFee })
                  //TODO check if same as above
              })
              it("emit event if winner is picked", async () => {
                  const player2Number = 8
                  const lottery2 = lotteryContract.connect(accounts[2])
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  await lottery2.enterLottery(player2Number, { value: lotteryEntranceFee })
                  //TODO
              })
          })
          describe("withdrawAdminFund", () => {
              it("only Owner can withdraw and adminFund to zero after", async () => {
                  await lottery.enterLottery(playersNumber, { value: lotteryEntranceFee })
                  // Arrange(TODO: adjust)
                  const startingFundMeBalance = await lottery.provider.getBalance(lottery.address)
                  const startingDeployerBalance = await lottery.provider.getBalance(player.address)
                  //Act(TODO:FIX below change withdraw to deployer address)
                  const transactionResponse = await lottery.withdrawAdminFund()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await lottery.provider.getBalance(lottery.address)
                  const endingDeployerBalance = await lottery.provider.getBalance(player.address)
                  // Assert
                  assert.equal(endingFundMeBalance.toString(), "0")
                  assert.equal(
                      startingFundMeBalance.add(startingDeployerBalance).toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })
          })
      })
//TODO FIX based on fails:
//line 103, 157, 208

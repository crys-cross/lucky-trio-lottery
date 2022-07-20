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
          let raffleEntranceFee: BigNumber
          let interval: number
          let accounts: SignerWithAddress[]
          let player: SignerWithAddress

          beforeEach(async () => {
              accounts = await ethers.getSigners() //could also be done with getNamedAccounts
              // deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["mocks", "raffle"])
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              lotteryContract = await ethers.getContract("LotteryTrio")
              lottery = lotteryContract.connect(player)
              raffleEntranceFee = await lottery.getEntranceFee()
              interval = (await lottery.getInterval()).toNumber()
          })
          describe("constructor", () => {
              it("initializes the raffle correctly", async () => {
                  console.log(network.config.chainId)
                  // Ideally, we'd separate these out so that only 1 assert per "it" block
                  // And ideally, we'd make this check everything
                  const raffleState = (await lottery.getRaffleState()).toString()
                  assert.equal(raffleState, "0")
                  assert.equal(
                      interval.toString(),
                      networkConfig[network.config.chainId!]["keepersUpdateInterval"]
                      //check more constructor to cheack
                  )
              })
          })
          describe("enterLottery", () => {
              it("reverts when you don't pay enough", async () => {
                  //reserve
              })
              it("reverts when rafflestate is closed || can't enter when lotter is calculating", async () => {
                  //reserve
              })
              it("reverts when your number is already taken", async () => {
                  //reserve
              })
              it("properly saves players address and number", async () => {
                  //reserve
              })
              it("emits event on enter", async () => {
                  //reserve
              })
          })
          describe("checkUpkeep", () => {
              it("returns false if people haven't sent any ETH", async () => {
                  //reserve
              })
              it("returns false if raffle isn't open", async () => {
                  //reserve
              })
              it("returns false if enough time hasn't passed", async () => {
                  //reserve
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  //reserve
              })
          })
          describe("performUpkeep", () => {
              it("can only run if checkupkeep is true", async () => {
                  //reserve
              })
              it("reverts if checkup is false", async () => {
                  //reserve
              })
              it("updates the raffle state and emits a requestId", async () => {
                  //reserve
              })
          })
          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  //reserve
              })
              it("can only be called after performupkeep", async () => {
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

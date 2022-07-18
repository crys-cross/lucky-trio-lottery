import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { deployments, ethers, network } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
// import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", () => {
          let raffle, VRFCoordinatorV2Mock, raffleEntranceFee, deployer, interval
          const chainId = network.config.chainId

          beforeEach(async () => {
              accounts = await ethers.getSigners() //counld also be done with getNAmedAccounts
              // deployer = accounts[0]
          })
      })

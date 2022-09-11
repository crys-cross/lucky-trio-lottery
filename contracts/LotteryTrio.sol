// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error Lottery_Not_enough_ETH_paid();
error Lottery__NotOpen();
error Lottery__NumberAlreadyTaken();
error Lottery__UpKeepNotNeeded(uint256 currentBalance, uint256 playersNum, uint256 LotteryState);
error Lottery__TransferFailed();
error Lottery__NoOnePickedWinningNumber();

/**
 *  @title LUCKY-TRIO-LOTTERY
 *  @author crys
 *  @notice This contract is to demo a sample funding contract
 *  @dev This is a Decentralized Lottery Game using Chainlink VRF
 *  for generating randomness in choosing the winning number
 *  submitted by the players. In the spirit of Decentralization
 *  I chose not to make a withdraw function all funds function but
 *  Admin/Owner may only withdraw the AdminFunds(10%) which is added
 *  on every draw. Directly sending this contract ETH will be considered
 *  a contribution thus will directly go to AdminFunds
 **/

contract LotteryTrio is VRFConsumerBaseV2, KeeperCompatibleInterface, Ownable, ReentrancyGuard {
    /*Type declarations*/
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    /*State Variables */
    uint256[] private s_playersNumber;
    uint256 private immutable i_entranceFee;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    /*LotteryVariables*/
    address private s_recentWinner;
    uint256 private s_recentWinningNumber;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_keepersUpdateInterval;
    uint256 private s_potMoney;
    uint256 private s_adminFunds;
    uint256 private s_TotalBalance;
    address public s_owner;

    //mapping
    mapping(uint256 => address) public s_playersEntry;

    /*Events*/
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed player);
    event NoWinner(uint256 winningNumber);
    event Log(string func, address sender, uint256 value, bytes data);

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_lotteryState = LotteryState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_keepersUpdateInterval = interval;
        s_owner = msg.sender;
    }

    receive() external payable {
        s_adminFunds += msg.value;
        emit Log("receive", msg.sender, msg.value, "");
    }

    fallback() external payable {
        s_adminFunds += msg.value;
        emit Log("receive", msg.sender, msg.value, msg.data);
    }

    function enterLottery(uint256 playersNumber) public payable {
        if (msg.value < i_entranceFee) {
            revert Lottery_Not_enough_ETH_paid();
        }
        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery__NotOpen();
        }
        if (s_playersEntry[playersNumber] != address(0)) {
            revert Lottery__NumberAlreadyTaken();
        }
        s_playersNumber.push(playersNumber);
        s_playersEntry[playersNumber] = payable(msg.sender);
        s_TotalBalance = address(this).balance;
        uint256 cut = (s_TotalBalance - s_adminFunds) / 10;
        s_adminFunds = cut + s_adminFunds;
        s_potMoney = s_TotalBalance - s_adminFunds;
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that the Chainlink Keeper nodes call
     * they look for `upkeepNeeded` to return True. Conditions below.
     * Please don't forget to fund LINK on subscription
     */
    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /*performData*/
        )
    {
        bool isOpen = (LotteryState.OPEN == s_lotteryState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_keepersUpdateInterval);
        bool hasPlayers = (s_playersNumber.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery__UpKeepNotNeeded(
                address(this).balance,
                s_playersNumber.length,
                uint256(s_lotteryState)
            );
        }
        s_lotteryState = LotteryState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, //keyHash(named gasLane)
            i_subscriptionId, //s_subscriptionId(named i_subscriptionId)
            REQUEST_CONFIRMATIONS, //requestConfirmations(named REQUEST_CONFIRMATIONS)
            i_callbackGasLimit, //callbackGasLimit(named i_callbackGasLimit)
            NUM_WORDS //numWords(named NUM_WORDS)
        );
        // Quiz... is this redundant?
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        s_recentWinningNumber = randomWords[0] % 999; //players can only choose 1-999
        s_recentWinner = s_playersEntry[s_recentWinningNumber];
        if (s_recentWinner == address(0)) {
            uint256[] memory numbers = s_playersNumber;
            for (uint256 numberIndex = 0; numberIndex < numbers.length; numberIndex++) {
                uint256 index = numbers[numberIndex];
                s_playersEntry[index] = payable(address(0));
            }
            s_playersNumber = new uint256[](0);
            s_lotteryState = LotteryState.OPEN;
            s_lastTimeStamp = block.timestamp;
            emit NoWinner(s_recentWinningNumber);
            // revert Lottery__NoOnePickedWinningNumber();
        } else {
            // address payable recentWinner = s_players[indexOfWinner];
            s_lotteryState = LotteryState.OPEN;
            //function to delete s_playersNumber[] && s_playersEntry mapping
            uint256[] memory numbers = s_playersNumber;
            for (uint256 numberIndex = 0; numberIndex < numbers.length; numberIndex++) {
                uint256 index = numbers[numberIndex];
                s_playersEntry[index] = payable(address(0));
            }
            s_playersNumber = new uint256[](0);
            // s_players = new address payable[](0);
            s_lotteryState = LotteryState.OPEN;
            s_lastTimeStamp = block.timestamp;
            uint256 amount = s_potMoney;
            s_potMoney = 0;
            (bool success, ) = s_recentWinner.call{value: amount}("");
            if (!success) {
                revert Lottery__TransferFailed();
            }
            s_TotalBalance = address(this).balance;
            emit WinnerPicked(s_recentWinner);
        }
    }

    /*withdraw function for admin*/
    function withdrawAdminFund() public payable onlyOwner nonReentrant {
        uint256 amount = s_adminFunds;
        s_adminFunds = 0;
        payable(msg.sender).transfer(amount);
    }

    // /*emergency withdraw*/
    // function withdrawAdminFund() public payable onlyOwner {
    //     payable(msg.sender).transfer(address(this).balance);
    //     s_adminFunds = 0;
    // }

    /*View/Pure Functions*/
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRecentWinningNumber() public view returns (uint256) {
        return s_recentWinningNumber;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getPlayersNumberbyIndex(uint256 index) public view returns (uint256) {
        return s_playersNumber[index];
    }

    function getNumberofPlayers() public view returns (uint256) {
        return s_playersNumber.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_keepersUpdateInterval;
    }

    function getAdminFund() public view returns (uint256) {
        return s_adminFunds;
    }

    function getPotMoney() public view returns (uint256) {
        return s_potMoney;
    }

    function getTotalBalance() public view returns (uint256) {
        return s_TotalBalance;
    }
}

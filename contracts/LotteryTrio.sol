//TODO 1
//map player address to their chosen number/s(array or mapping)✅
//function to choose lucky number(fulfillRandomWords)✅
//array to get addresses who chose the lucky number✅
//TODO 2
//TBA: priceconverter to enter lottery with $10 worth of ETH(or less)
//function check players number is not taken✅
//add adminFunds(from fulfillRandomWords) and fix withdraw function{value: adminFunds}✅ for testing
//add variable and view function for potMoney✅
//finalize variables
//group helper config variables same to constructor and edits for other networks
//fix/finalize hardat config, helper and .env(mainline and testnet address)
//conclude unit test(and internal auditing)
//check coverage and make 100%
//finish front end

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
// import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
// import "./PriceConverter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error Lottery_Not_enough_ETH_paid();
error Lottery__NotOpen();
error Lottery__NumberAlreadyTaken(); //for checking number
error Reffle__UpKeepNotNeeded(uint256 currentBalance, uint256 playersNum, uint256 LotteryState);
error Raffle__TransferFailed();
error Lottery__NoOnePickedWinningNumber();

contract LotteryTrio is VRFConsumerBaseV2, KeeperCompatibleInterface, Ownable, ReentrancyGuard {
    /*Library*/
    // using PriceConverter for uint256

    /*Type declarations*/
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    /*State Variables */
    uint256[] private s_playersNumber;
    // address payable[] private s_players;
    uint256 private immutable i_entranceFee;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    /*LotteryVariables*/
    address private s_recentWinner;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_keepersUpdateInterval;
    uint256 private s_potMoney;
    uint256 private s_adminFunds;
    address public s_owner;

    /*Price Converter Variable*/
    // AggregatorV3Interface public s_priceFeed;

    //mapping
    mapping(uint256 => address) public s_playersEntry;

    /*Events*/
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed player);
    event NoWinner(uint256 winningNumber);

    constructor(
        address vrfCoordinatorV2, //contract
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval // address priceFeed   //also contract
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_lotteryState = LotteryState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_keepersUpdateInterval = interval;
        // s_priceFeed = AggregatorV3Interface(priceFeed);
        s_owner = msg.sender;
    }

    //function to enter lottery and store player"s address and number
    function enterLottery(uint256 playersNumber) public payable {
        // require(msg.value > i_entranceFee, "Not enough ETH")
        if (msg.value < i_entranceFee) {
            revert Lottery_Not_enough_ETH_paid();
        }
        ////For testing with priceConverter below to replace above
        //  if (msg.value.getConversionRate(s_priceFeed) < i_entranceFee) {
        //     revert Lottery_Not_enough_ETH_paid();
        // }
        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery__NotOpen();
        }
        if (s_playersEntry[playersNumber] != address(0)) {
            revert Lottery__NumberAlreadyTaken();
        }
        // s_players.push(payable(msg.sender));
        s_playersNumber.push(playersNumber);
        s_playersEntry[playersNumber] = payable(msg.sender); //push players address and chosen number to mapping
        // Emit an event when we update a dynamic array or mapping
        // Named events with the function name reversed
        emit RaffleEnter(msg.sender);
    }

    //check to see if time to draw
    /**
     * @dev This is the function that the Chainlink Keeper nodes call
     * they look for `upkeepNeeded` to return True.
     * the following should be true for this to return true:
     * 1. The time interval has passed between raffle runs.
     * 2. The lottery is open.
     * 3. The contract has ETH.
     * 4. Implicity, your subscription is funded with LINK.
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

    //start draw if above conditions met
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        // require(upkeepNeeded, "Upkeep not needed");
        if (!upkeepNeeded) {
            revert Reffle__UpKeepNotNeeded(
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

    //pick winning number, TODO deduct value to add to s_adminFunds
    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        //s_players[] size 10
        //randomNumber 202
        //202 % 10 = 2
        uint256 winningNumber = randomWords[0] % 999; //players can only choose 1-999
        address recentWinner = s_playersEntry[winningNumber];
        s_recentWinner = recentWinner;
        if (s_recentWinner == address(0)) {
            s_adminFunds = ((address(this).balance) - (s_adminFunds)) / 10 + (s_adminFunds);
            s_potMoney = (address(this).balance) - (s_adminFunds);
            uint256[] memory numbers = s_playersNumber;
            for (uint256 numberIndex = 0; numberIndex < numbers.length; numberIndex++) {
                uint256 index = numbers[numberIndex];
                s_playersEntry[index] = payable(address(0));
            }
            s_playersNumber = new uint256[](0);
            s_lotteryState = LotteryState.OPEN;
            s_lastTimeStamp = block.timestamp;
            emit NoWinner(winningNumber);
            revert Lottery__NoOnePickedWinningNumber();
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
            s_adminFunds = ((address(this).balance) - (s_adminFunds)) / 10 + (s_adminFunds);
            s_potMoney = (address(this).balance) - (s_adminFunds);
            (bool success, ) = recentWinner.call{value: s_potMoney}("");
            //require success
            if (!success) {
                revert Raffle__TransferFailed();
            }
            emit WinnerPicked(recentWinner);
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

    // function getPlayers(uint256 index) public view returns (address) {
    //     return s_players[index];
    // }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
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

    // experimental to get playersNumber by address
    // function getsPlayersEntry() public view returns (string[] memory, address[] memory) {
    //     string[] memory ms_playersNumber = new string[](s_playersNumber.length);
    //     address[] memory mPlayers = new address[](s_playersNumber.length);
    //     for (uint256 i = 0; i < s_playersNumber.length; i++) {
    //         ms_playersNumber[i] = s_playersNumber[i];
    //         mPlayers[i] = s_playersEntry[s_playersNumber[i]];
    //     }
    //     return (ms_playersNumber, mPlayers);
    // }

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
}

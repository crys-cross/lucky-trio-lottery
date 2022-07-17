//TODO
//map player address to their chosen number/s(array or mapping)
//function to choose lucky number(fulfillRandomWords)
//array to get addresses who chose the lucky number
//function to divide potmoney and send to all winners

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Lottery_Not_enough_ETH_paid();
error Raffle__NotOpen();
error Reffle__UpKeepNotNeeded(uint256 currentBalance, uint256 numpPlayers, uint256 raffleState);
error Raffle__TransferFailed();

contract LotteryTrio is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /*Type declarations*/
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /*State Variables */
    uint256[] private s_playersNumber; //1
    address payable[] private s_players; //
    uint256 private immutable i_entranceFee;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    /*LotteryVariables*/
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    //mapping
    mapping(uint256 => address) public s_playersEntry;

    /*Events*/
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed player);

    constructor(
        address vrfCoordinatorV2, //contract
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
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    //function to enter lottery and store player"s address and number
    function enterRaffle(uint256 playersNumber) public payable {
        // require(msg.value > i_entranceFee, "Not enough ETH")
        if (msg.value < i_entranceFee) {
            revert Lottery_Not_enough_ETH_paid();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        s_playersNumber.push(playersNumber);
        s_playersEntry[playersNumber] = msg.sender; //push players address and chosen number to mapping
        // Emit an event when we update a dynamic array or mapping
        // Named events with the function name reversed
        emit RaffleEnter(msg.sender);
    }

    //check to see if time to draw
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
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
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
                s_players.length,
                uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
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

    //pick winning number, TODO delete all entries after a draw
    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        //s_players[] size 10
        //randomNumber 202
        //202 % 10 = 2
        uint256 indexOfWinner = randomWords[0] % 999; //players can only choose 1-999
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        //require success
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    /*View/Pure Functions*/
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberofPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}

////V1 draft
// /*is VRFConsumerBaseV2, KeeperCompatibleInterface*/
// contract Lottery {
//     //Lottery Variable
//     uint256 private s_playersNumber; //1
//     // address payable[] private s_players; //2
//     uint256 private s_entryCounter;

//     // Chainlink Variables
//     uint256 private immutable i_entranceFee;
//     VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
//     bytes32 private immutable i_gasLane;
//     uint64 private immutable i_subscriptionId;
//     uint32 private immutable i_callbackGasLimit;
//     uint16 private constant REQUEST_CONFIRMATIONS = 3;
//     uint32 private constant NUM_WORDS = 1;

//     //Struct
//     struct Entries {
//         //3
//         uint256 s_playersNumber;
//         address s_players; //2;
//     }

//     //Array
//     // Entries[] public entries;

//     //Mapping
//     mapping(uint256 => Entries) public s_playersEntry;

//     constructor(
//         address vrfCoordinatorV2,
//         uint256 entranceFee,
//         bytes32 gasLane,
//         uint64 subscriptionId,
//         uint32 callbackGasLimit,
//         uint256 interval
//     ) VRFConsumerBaseV2(vrfCoordinatorV2) {
//         i_entranceFee = entranceFee;
//         i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
//         i_gasLane = gasLane;
//         i_subscriptionId = subscriptionId;
//         i_callbackGasLimit = callbackGasLimit;
//     }

//     //function to enter lottery and store player"s address and number
//     function enterLottery(address player, uint256 playersNumber) public {
//         if (msg.value < i_entranceFee) {
//             revert Lottery_Not_enough_ETH_paid();
//         }
//         uint256 newEntryNumber = s_entryCounter;
//         s_entryCounter += s_entryCounter;
//         s_players.push(payable(msg.sender)); //to push data into //2
//         s_playersEntry[newEntryNumber] = Entries(playersNumber, player); //to push data into //3 and into mapping
//     }

//     //function to choose winning number
//     function fulfillRandomWords(uint256, uint256[] memory randomWords) internal override {
//         //to follow
//     }

//     // function getEntry(uint256 playersNumber, address player) internal {
//     //     s_playersChosenNumber[player] = playersNumber;
//     // }

//     // function storeNumber(uint256 playersNumber) public {
//     //     s_playersNumber = playersNumber;
//     // }
// }

//TODO
//map player address to their chosen number/s(array or mapping)
//function to choose lucky number(fulfillRandomWords)
//array to get addresses who chose the lucky number
//function to divide potmoney and send to all winners

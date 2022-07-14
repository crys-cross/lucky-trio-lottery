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
error Raffle__TransferFailed();

contract LotteryTrio {
    /*Type declarations*/
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    //lottery variable
    uint256[] private s_playersNumber; //1
    address payable[] private s_players; //
    uint256 private immutable i_entranceFee;
    // RaffleState private s_raffleState;

    //mapping
    mapping(uint256 => address) public s_playersEntry;

    /*Events*/
    event RaffleEnter(address indexed player);
    event WinnerPicked(address indexed player);

    // constructor(
    //     address vrfCoordinatorV2, //contract
    //     uint256 entranceFee,
    //     bytes32 gasLane,
    //     uint64 subscriptionId,
    //     uint32 callbackGasLimit,
    //     uint256 interval
    // ) VRFConsumerBaseV2(vrfCoordinatorV2) {
    //     i_entranceFee = entranceFee;
    //     i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    //     i_gasLane = gasLane;
    //     i_subscriptionId = subscriptionId;
    //     i_callbackGasLimit = callbackGasLimit;
    //     s_raffleState = RaffleState.OPEN;
    //     s_lastTimeStamp = block.timestamp;
    //     i_interval = interval;
    // }

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
        s_playersEntry[s_playersNumber] = s_players;
        // Emit an event when we update a dynamic array or mapping
        // Named events with the function name reversed
        emit RaffleEnter(msg.sender);
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

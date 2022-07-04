// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

/*is VRFConsumerBaseV2, KeeperCompatibleInterface*/
contract Lottery {
    //Lottery Variable
    uint256 private s_playersNumber;
    address private s_players;

    //Chainlink Variables
    // uint256 private immutable i_entranceFee;
    // address payable[] private s_players;
    // VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    // bytes32 private immutable i_gasLane;
    // uint64 private immutable i_subscriptionId;
    // uint32 private immutable i_callbackGasLimit;
    // uint16 private constant REQUEST_CONFIRMATIONS = 3;
    // uint32 private constant NUM_WORDS = 1;

    //Struct
    struct Entries {
        uint256 s_playersNumber;
        address s_player;
    }

    //Array
    Entries[] public entries;

    //Mapping
    mapping(address => uint256) public s_playersChosenNumber;

    // constructor(
    //     address vrfCoordinatorV2,
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
    // }
    function getEntry(uint256 playersNumber, address player) internal {
        s_playersChosenNumber[player] = playersNumber;
    }

    function storeNumber(uint256 playersNumber) public {
        s_playersNumber = playersNumber;
    }

    function storePlayer(address players) public {
        s_players = address(payable(msg.sender));
    }

    //     function addEntry(address player, uint256 playersNumber) public {
    //         entries.push(Entries(playersNumber, msg.sender));
    //         s_playersChosenNumber[player] = playersNumber;
    //     }
}

//todo
//map player address to number
//function to choose lucky number
//array to get addresses who chose the lucky number
//function to divide potmoney and send to all winners

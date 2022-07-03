// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    //Raffle Variable
   uint256 s_playersNumber; 

   //Struct
   struct Entries {
    uint256 s_playersNumber;
    address s_player;
   }

   //Array
   Entries[] public entries;

   //Mapping
   mapping(address => uint256) public s_numberOfPlayers

    constructor() VRFConsumerBaseV2(vrfCoordinatorV2) {}

    function storeNumber(uint256 playersNumber) public {
        s_playersNumber = playersNumber
    }

    function addPerson(string memory player, uint256 playersNumber) public {
        entries.push(People(playersNumber, player));
        s_numberOfPlayers[player] = playersNumber;
    }
}

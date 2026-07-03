// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DesignRegistry {
    struct Design {
        address artisan;
        uint256 timestamp;
        string productId;
        string imageUrl;
    }

    mapping(bytes32 => Design) public designs;

    event DesignRegistered(bytes32 indexed designHash, address indexed artisan, string productId, uint256 timestamp);

    function registerDesign(bytes32 designHash, string calldata productId, string calldata imageUrl) external {
        require(designs[designHash].timestamp == 0, "Design already registered");
        designs[designHash] = Design(msg.sender, block.timestamp, productId, imageUrl);
        emit DesignRegistered(designHash, msg.sender, productId, block.timestamp);
    }

    function verifyDesign(bytes32 designHash) external view returns (address, uint256, string memory, string memory) {
        Design memory d = designs[designHash];
        require(d.timestamp != 0, "Design not found");
        return (d.artisan, d.timestamp, d.productId, d.imageUrl);
    }
}

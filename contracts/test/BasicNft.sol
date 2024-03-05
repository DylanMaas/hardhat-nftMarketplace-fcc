// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BasicNft is ERC721 {
    string public constant TOKEN_URI =
        "ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json"; // This is a constant, so that everyone who mints this NFT, get's the same pug image
    uint256 private s_tokenCounter;

    event BasicNft__NftMinted(uint256 indexed tokenId);

    constructor() ERC721("Pug the Pug", "PUG") {
        s_tokenCounter = 0;
    }

    function mintNft() public {
        _safeMint(msg.sender, s_tokenCounter);
        emit BasicNft__NftMinted(s_tokenCounter);
        s_tokenCounter = s_tokenCounter + 1;
    }

    function tokenURI(uint256 /*tokenId*/) public pure override returns (string memory) {
        return TOKEN_URI;
        // WHY NO INPUT? We need to input tokencounter, to know who has access right?
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}

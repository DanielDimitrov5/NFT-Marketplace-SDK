# NFTMarketplaceSDK

The `NFTMarketplaceSDK` class provides methods for interacting with an [NFT Marketplace](https://github.com/DanielDimitrov5/NFT-Marketplace-Project).

# NFT Marketplace SDK Installation Guide

The NFT Marketplace SDK (`nft-mp-sdk`) can be easily installed using npm, which is a package manager for the JavaScript programming language.

## Prerequisites

Before installing the `nft-mp-sdk`, ensure that you have Node.js and npm installed. If you do not have them installed, download and install [Node.js](https://nodejs.org/) which comes with npm.

## Installation

To install the NFT Marketplace SDK, open a terminal and run the following command (use only the latest version):

`npm install nft-mp-sdk`

## Example Usage

```javascript
import { ethers } from "ethers";
import NFTMarketplaceSDK from "nft-mp-sdk";

// Initialize SDK
const sdk = new NFTMarketplaceSDK(
    new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/YOUR_INFURA_KEY"),
    "0xMarketplaceContractAddress",
    marketplaceABI,
    nftABI,
    nftBytecode,
    "https://ipfs.infura.io/ipfs/"
);
```

## Class: NFTMarketplaceSDK

This class encapsulates various functions to interact with the NFT Marketplace.

### constructor(provider, marketplaceContractAddress, nftABI, marketplaceABI, ipfsProvider)

The constructor for creating a new instance of the NFTMarketplaceSDK class.

- **provider**: The web3 provider.
- **marketplaceContractAddress**: The contract address of the marketplace.
- **nftABI**: The ABI of the NFT contract.
- **marketplaceABI**: The ABI of the marketplace contract.
- **ipfsProvider**: The IPFS provider for storing files.

### async connectSigner()

Connects to the user's Ethereum wallet.

### async isSignerConnected()

Checks if the signer is connected.

- **Returns**: `boolean` - `true` if the signer is connected, otherwise `false`.

### async loadItems()

Loads and returns all the items listed in the NFT marketplace.
Each item is returned with its metadata such as name, image, and description.

- **Returns**: `Promise` - Resolves with an object containing `items` and `metadataArrModified` arrays with details of the items and their metadata respectively.

### async getItem(id)

Retrieves a single item from the NFT marketplace by its ID.

- **id**: The ID of the item you want to retrieve.
- **Returns**: `Promise` - Resolves with an object with `item` and `metadata` containing details of the item and its metadata respectively.

### async loadCollections()

Loads and returns all the collections in the NFT marketplace.
Each collection returned will have its name, symbol, and address.

- **Returns**: `Promise` - Resolves with an array of collections.
- **Note**: In case of an error, it logs the error message to the console.

### async loadItemsForAdding(collectionAddress, owner)

Retrieves items that can be added to the marketplace for a particular collection.

- **collectionAddress**: The address of the NFT collection contract.
- **owner**: The address of the owner of the NFTs.
- **Returns**: `Promise` - Resolves with an array of items, each having metadata including name, image, description, NFT contract address, and tokenId.
- **Note**: In case of an error, it logs the error message to the console.

### async getItemsTokenIds(collectionAddress, owner)

Retrieves the token IDs of the items owned by the specified address for a particular collection.

- **collectionAddress**: The address of the NFT collection contract.
- **owner**: The address of the owner of the NFTs.
- **Returns**: `Promise` - Resolves with an array of token IDs.

### async addItemToMarketplace(collectionAddress, tokenId, metadata)

Adds an item to the NFT marketplace.

- **collectionAddress**: The address of the NFT collection contract.
- **tokenId**: The token ID of the item.
- **metadata**: An object containing metadata such as name, image, and description.
- **Returns**: `Promise` - Resolves with the transaction result.

### async loadItemsForListing(owner)

Loads and returns all the items available for listing in the NFT marketplace that belong to the specified owner and have a price of 0.

- **owner**: The address of the owner of the NFTs.
- **Returns**: `Promise` - Resolves with an object containing `filteredItems` and `nfts` arrays with details of the items and their metadata respectively.

### async listItemForSale(collectionAddress, tokenId, price)

Lists an item for sale in the NFT marketplace.

- **collectionAddress**: The address of the NFT collection contract.
- **tokenId**: The token ID of the item.
- **price**: The price for which the item is to be listed.
- **Returns**: `Promise` - Resolves with the transaction result.

### async checkApproval(collectionAddress, tokenId)

Checks if the item is approved for sale in the NFT marketplace.

- **collectionAddress**: The address of the NFT collection contract.
- **tokenId**: The token ID of the item.
- **Returns**: `Promise` - Resolves with the address of the contract that the item is approved for. Returns the marketplace address if it is approved, otherwise returns a different address.

### async approveToken(collectionAddress, tokenId)

Approves an item to be listed for sale in the NFT marketplace.

- **collectionAddress**: The address of the NFT collection contract.
- **tokenId**: The token ID of the item.
- **Returns**: `Promise` - Resolves with the transaction result.

### async buyItem(itemId, price)

Allows a user to purchase an item from the NFT marketplace.

- **itemId**: The ID of the item to be purchased.
- **price**: The price at which the item is listed.
- **Returns**: `Promise` - Resolves with the transaction result.

### async addExistingCollection(collectionAddress)

Adds an existing NFT collection to the marketplace.

- **collectionAddress**: The address of the NFT collection contract.
- **Returns**: `Promise` - Resolves with the transaction result.

### async infuraIpfsClient(projectId, projectSecret)

Creates an Infura IPFS client instance and returns an object with methods for uploading to IPFS and minting NFTs.

- **projectId**: The project ID for the Infura IPFS service.
- **projectSecret**: The project secret for the Infura IPFS service.
- **Returns**: An object with methods:
  - `uploadToIPFS(file)` - Uploads a file to IPFS.
    - **file**: The file to be uploaded.
    - **Returns**: `Promise` - Resolves with the IPFS URI of the uploaded file.
  - `mintNFT(collectionAddress, metadata)` - Mints a new NFT.
    - **collectionAddress**: The address of the NFT collection contract.
    - **metadata**: An object containing metadata such as name, image, and description.
    - **Returns**: `Promise` - Resolves with the transaction status.

### async placeOffer(itemId, price)

Places an offer for an item in the NFT marketplace.

- **itemId**: The ID of the item.
- **price**: The price of the offer.
- **Returns**: `Promise` - Resolves with the transaction result.

### async getOffers(itemId)

Retrieves all offers for a particular item from the NFT marketplace.

- **itemId**: The ID of the item.
- **Returns**: `Promise` - Resolves with an array of offers.

### async acceptOffer(itemId, offerer)

Accepts an offer for an item in the NFT marketplace.

- **itemId**: The ID of the item.
- **offerer**: The address of the user making the offer.
- **Returns**: `Promise` - Resolves with the transaction result.

### async getAccountsOffers(account)

Retrieves all the offers made by a specific account.

- **account**: The address of the account whose offers you want to retrieve.
- **Returns**: `Promise` - Resolves with an array of offers.

### async getOffer(itemId, offerer)

Retrieves a specific offer for an item in the NFT marketplace.

- **itemId**: The ID of the item.
- **offerer**: The address of the user making the offer.
- **Returns**: `Promise` - Resolves with the offer details.

### async claimItem(itemId, price)

Claims an item in the NFT marketplace for which the user previously made an offer that has been accepted.

- **itemId**: The ID of the item.
- **price**: The price at which the item was offered.
- **Returns**: `Promise` - Resolves with the transaction result.

### async isMarketplaceOwner(address)

Checks if the provided address is the owner of the marketplace.

- **address**: The address to check.
- **Returns**: `Promise` - Resolves with a boolean indicating if the address is the owner of the marketplace.

### async withdrawMoney()

Withdraws the balance from the contract to the owner's address.

- **Returns**: `Promise` - Resolves with the transaction result.

### async getMarketplaceBalance()

Retrieves the balance of the marketplace contract.

- **Returns**: `Promise` - Resolves with the balance in wei.

### async deployNFTCollection(name, symbol)

Deploys a new NFT collection contract.

- **name**: The name of the NFT collection.
- **symbol**: The symbol of the NFT collection.
- **Returns**: `Promise` - Resolves with the deployed contract instance.

### async approveToken(collectionAddress, tokenId)

Approves the marketplace contract to manage a token on behalf of the token's owner.

- **collectionAddress**: The address of the NFT collection contract.
- **tokenId**: The ID of the token.
- **Returns**: `Promise` - Resolves with the transaction result.
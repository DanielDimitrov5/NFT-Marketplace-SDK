import { ethers } from "ethers";
import marketplaceABI from "../NFT-Marketplace-SDK/contractData/abi/NFTMarketplace.json" assert { type: 'json' };
import nftABI from "../NFT-Marketplace-SDK/contractData/abi/NFT.json" assert { type: 'json' };
import axios from "axios";
import { infuraIpfsClient } from "./ipfsClient.js";

import dotenv from 'dotenv';
dotenv.config();

class NFTMarketplaceSDK {
    constructor(signerOrProvider, contractAddress) {
        this.signerOrProvider = signerOrProvider;
        this.marketplace = {
            address: contractAddress,
            abi: marketplaceABI,
        };
        this.marketplaceContract = new ethers.Contract(this.marketplace.address, this.marketplace.abi, this.signerOrProvider);
    }

    async loadItems() {
        try {
            const contract = this.marketplaceContract;

            const count = await contract.itemCount();

            const countArr = Array.from({ length: count.toNumber() }, (_, i) => i + 1);

            const itemsPromises = countArr.map((item) => contract.items(item));

            const items = await Promise.all(itemsPromises);

            const URIPromises = items.map((item) => {
                const nftContract = new ethers.Contract(
                    item.nftContract,
                    nftABI,
                    contract.provider,
                );
                const tokenUri = nftContract.tokenURI(item.tokenId.toNumber());
                return tokenUri;
            });


            const URIs = await Promise.all(URIPromises);

            const URIsModified = URIs.map((uri) => {
                return uri.replace('ipfs://', process.env.REACT_APP_IPFS_PROVIDER);
            });

            const metadataPromises = URIsModified.map((uri) => {
                return axios.get(uri);
            });

            const metadataArr = await Promise.all(metadataPromises);

            const metadataArrModified = metadataArr.map((metadata) => {
                return {
                    ...metadata,
                    name: metadata.data.name,
                    image: metadata.data.image.replace('ipfs://', process.env.REACT_APP_IPFS_PROVIDER),
                    description: metadata.data.description,
                    nft: metadata.data.nft,
                    tokenId: items[metadataArr.indexOf(metadata)].tokenId,
                    owner: items[metadataArr.indexOf(metadata)].owner,
                };
            });

            return { items, metadataArrModified };
        } catch (error) {
            console.log(error);
        }
    }

    async getItem(id) {
        const contract = this.marketplaceContract;

        try {
            const item = await contract.items(id);

            const nftContract = new ethers.Contract(item.nftContract, nftABI, this.signerOrProvider);

            const tokenUri = (await nftContract.tokenURI(item.tokenId)).replace('ipfs://', process.env.REACT_APP_IPFS_PROVIDER);

            const metadata = await axios.get(tokenUri);

            metadata.data.image = metadata.data.image.replace('ipfs://', process.env.REACT_APP_IPFS_PROVIDER);

            return { item, metadata };
        }
        catch (err) {
            console.log(err);
        }
    }

    async loadCollections() {
        try {
            const contract = this.marketplaceContract;

            const count = await contract.collectionCount();
            const countArr = Array.from({ length: count.toNumber() }, (_, i) => i + 1);
            const collectionsPromises = countArr.map((collection) => contract.collections(collection));

            const collections = await Promise.all(collectionsPromises);

            const collectionContractPromises = collections.map((collection) => {
                const collectionContract = new ethers.Contract(
                    collection,
                    nftABI,
                    this.signerOrProvider,
                );


                return [collectionContract.name(), collectionContract.symbol(), collectionContract.address];
            });

            const resolvedCollections = await Promise.all(
                collectionContractPromises.map(async (collectionPromises) => {
                    const [namePromise, symbolPromise, addressPromise] = collectionPromises;
                    const [name, symbol, address] = await Promise.all([namePromise, symbolPromise, addressPromise]);
                    return { name, symbol, address };
                })
            );

            return resolvedCollections;

        } catch (err) {
            console.log(err);
        }
    }

    async loadItemsForAdding(collectionAddress, owner) {
        const contract = new ethers.Contract(collectionAddress, nftABI, this.signerOrProvider);

        const itemsMarketplaceItemsIds = (await this.loadItems()).items.filter((item) => {
            return item.nftContract === collectionAddress;
        }).map((item) => parseInt(item.tokenId));

        const ids = (await this.getItemsTokenIds(contract)).filter((id) => {
            return !itemsMarketplaceItemsIds.includes(id);
        });

        const promisesOwners = ids.map((id) => {
            return contract.ownerOf(id);
        });

        const owners = await Promise.all(promisesOwners);

        const idsFiltered = ids.filter((id, i) => {
            return owners[i] === owner;
        });

        const promises = idsFiltered.map((id) => {
            return contract.tokenURI(id);
        });

        const URIs = (await Promise.all(promises)).map((uri) => {
            return uri.replace('ipfs://', process.env.REACT_APP_IPFS_PROVIDER);
        });

        const metadataPromises = URIs.map((uri) => {
            return axios.get(uri);
        });

        const metadataArr = await Promise.all(metadataPromises);

        const metadataArrModified = metadataArr.map((metadata, i) => {
            return {
                ...metadata,
                name: metadata.data.name,
                image: metadata.data.image.replace('ipfs://', process.env.REACT_APP_IPFS_PROVIDER),
                description: metadata.data.description,
                nft: metadata.data.nft,
                tokenId: ids[i]
            };
        });

        return metadataArrModified;
    }

    async getItemsTokenIds(contract) {
        const eventFilter = contract.filters.Transfer([ethers.constants.AddressZero]);
        const events = await contract.queryFilter(eventFilter);
    
        const arrIds = events.map((event) => {
            return event.args.tokenId.toNumber();
        });
    
        return arrIds;
    }

    async addItemToMarketplace(collectionAddress, tokenId) {
        try {
            const contract = this.marketplaceContract;
    
            const eventFilter = contract.filters.LogCollectionAdded();
            const collectionid = (await contract.queryFilter(eventFilter)).filter((event) => event.args.nftCollection === collectionAddress)[0].args.id;
    
            const transaction = await contract.addItem(collectionid, tokenId, { gasLimit: 300000 });
    
            const tx = await transaction.wait();
            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }

    async loadItemsForListing(owner) {
        try {
            const { items, metadataArrModified } = await this.loadItems();
    
            const filteredItems = items.filter(item => item.owner === owner && parseInt(item.price) === 0);
    
            const nfts = metadataArrModified.filter((item) => {
                return filteredItems.some((item2) => {
                    return parseInt(item.tokenId) === parseInt(item2.tokenId) && item.nft === item2.nftContract;
                });
            });
    
            return { filteredItems, nfts };
        } catch (error) {
            console.log(error);
        }
    }

    async listItemForSale(collectionAddress, tokenId, price) {
        try {
            const isApproved = await this.checkApproval(collectionAddress, tokenId);
    
            if (isApproved !== this.marketplace.address) {
                await this.approveToken(collectionAddress, tokenId);
            }

            const contract = this.marketplaceContract;
    
            const items = await this.loadItems();
    
            const itemId = parseInt(items.items.filter(item => item.nftContract === collectionAddress && parseInt(item.tokenId) === parseInt(tokenId))[0].id);
    
            const transaction = await contract.listItem(itemId, price, { gasLimit: 300000 });
    
            const tx = await transaction.wait();
    
            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }

    async checkApproval(collectionAddress, tokenId) {
        try {
            const contract = new ethers.Contract(collectionAddress, nftABI, this.signerOrProvider);
    
            const approved = await contract.getApproved(tokenId);
    
            return approved;
        } catch (error) {
            console.log(error);
        }
    }

    async approveToken(collectionAddress, tokenId) {
        try {
            const contract = new ethers.Contract(collectionAddress, nftABI, this.signerOrProvider);
    
            const transaction = await contract.approve(this.marketplace.address, tokenId, { gasLimit: 300000 });
    
            const tx = await transaction.wait();
    
            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }

    async buyItem(itemId, price) {
        try {
            const contract = this.marketplaceContract;
    
            const transaction = await contract.buyItem(itemId, { value: price, gasLimit: 300000 });
    
            const tx = await transaction.wait();
    
            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }

    async addExistingCollection(collectionAddress){
        try {
            const contract = this.marketplaceContract;
    
            const transaction = await contract.addCollection(collectionAddress, { gasLimit: 300000 });
    
            const tx = await transaction.wait();
    
            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }

    async mintNFT(collectionAddress, metadata) {

        const { image } = metadata;
    
        let imageHash = 'ipfs://' + "QmcZcBrDxzXogmpGoh1jU3AjSjGTqHVoM4pNtejAEeMc5J";
    
        if (image) {
            imageHash = await this.uploadToIPFS(image);
        }
    
        metadata.image = imageHash;
        metadata.nft = collectionAddress;
    
        try {
            const contract = new ethers.Contract(collectionAddress, nftABI, this.signerOrProvider);
    
            const metadataURI = await this.uploadToIPFS(JSON.stringify(metadata));
    
            const transaction = await contract.mint(metadataURI, { gasLimit: 300000 });
    
            const tx = await transaction.wait();
    
            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }
    
    async uploadToIPFS(data) {
        try {
            const addedFile = await infuraIpfsClient.add(data);
            const hash = addedFile.path;
    
            return 'ipfs://' + hash;
        } catch (err) {
            console.log(err);
            return;
        }
    }

    async placeOffer(itemId, price) {
        try {
            const contract = this.marketplaceContract;
    
            const transaction = await contract.placeOffer(itemId, price, { gasLimit: 300000 });
    
            const tx = await transaction.wait();
    
            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }
}

export default NFTMarketplaceSDK;

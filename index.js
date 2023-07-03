import { ethers } from "ethers";

import axios from "axios";
import ipfsClient from "./ipfsClient.js";

class NFTMarketplaceSDK {
    constructor(signerOrProvider, contractAddress, marketplaceABI, nftABI, nftBytecode, ipfsProvider) {
        this.signerOrProvider = signerOrProvider;
        this.provider = signerOrProvider.provider || signerOrProvider;
        this.ipfsProvider = ipfsProvider;
        this.marketplace = {
            address: contractAddress,
            abi: marketplaceABI,
        };
        this.nftABI = nftABI;
        this.nftBytecode = nftBytecode;
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
                    this.nftABI,
                    contract.provider,
                );
                const tokenUri = nftContract.tokenURI(item.tokenId.toNumber());
                return tokenUri;
            });


            const URIs = await Promise.all(URIPromises);

            const URIsModified = URIs.map((uri) => {
                return uri.replace('ipfs://', this.ipfsProvider);
            });

            const metadataPromises = URIsModified.map((uri) => {
                return axios.get(uri);
            });

            const metadataArr = await Promise.all(metadataPromises);

            const metadataArrModified = metadataArr.map((metadata) => {
                return {
                    ...metadata,
                    name: metadata.data.name,
                    image: metadata.data.image.replace('ipfs://', this.ipfsProvider),
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

            const nftContract = new ethers.Contract(item.nftContract, this.nftABI, this.signerOrProvider);

            const tokenUri = (await nftContract.tokenURI(item.tokenId)).replace('ipfs://', this.ipfsProvider);

            const metadata = await axios.get(tokenUri);

            metadata.data.image = metadata.data.image.replace('ipfs://', this.ipfsProvider);

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
                    this.nftABI,
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
        const contract = new ethers.Contract(collectionAddress, this.nftABI, this.signerOrProvider);

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
            return uri.replace('ipfs://', this.ipfsProvider);
        });

        const metadataPromises = URIs.map((uri) => {
            return axios.get(uri);
        });

        const metadataArr = await Promise.all(metadataPromises);

        const metadataArrModified = metadataArr.map((metadata, i) => {
            return {
                ...metadata,
                name: metadata.data.name,
                image: metadata.data.image.replace('ipfs://', this.ipfsProvider),
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
            const contract = new ethers.Contract(collectionAddress, this.nftABI, this.signerOrProvider);

            const approved = await contract.getApproved(tokenId);

            return approved;
        } catch (error) {
            console.log(error);
        }
    }

    async approveToken(collectionAddress, tokenId) {
        try {
            const contract = new ethers.Contract(collectionAddress, this.nftABI, this.signerOrProvider);

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

    async addExistingCollection(collectionAddress) {
        try {
            const contract = this.marketplaceContract;

            const transaction = await contract.addCollection(collectionAddress, { gasLimit: 300000 });

            const tx = await transaction.wait();

            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }

    infuraIpfsClient(projectId, projectSecret) {

        const client = new ipfsClient(projectId, projectSecret);

        const nftABI = this.nftABI;
        const signerOrProvider = this.signerOrProvider;

        return {
            async uploadToIPFS(file) {
                const added = await client.addFile(file);

                return "ipfs://" + added;
            },

            async mintNFT (collectionAddress, metadata) {
                const { image } = metadata;

                let imageHash = 'ipfs://' + "QmcZcBrDxzXogmpGoh1jU3AjSjGTqHVoM4pNtejAEeMc5J";

                if (image) {
                    imageHash = await this.uploadToIPFS(image);
                }

                metadata.image = imageHash;
                metadata.nft = collectionAddress;

                try {
                    const contract = new ethers.Contract(collectionAddress, nftABI, signerOrProvider);

                    const metadataURI = await this.uploadToIPFS(JSON.stringify(metadata));

                    const transaction = await contract.mint(metadataURI, { gasLimit: 300000 });

                    const tx = await transaction.wait();

                    return tx.status;
                } catch (error) {
                    console.log(error);
                }
            }
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

    async getOffers(itemId) {
        try {
            const contract = this.marketplaceContract;

            const offerers = [...new Set(await contract.getOfferers(itemId))];

            const offerssPromises = offerers.map(async (offerer) => {
                return contract.offers(itemId, offerer);
            });

            const offers = await Promise.all(offerssPromises);

            const offersModified = offers.map((offer, i) => {
                return {
                    offerer: offerers[i],
                    price: offer.price,
                    isAccepted: offer.isAccepted,
                    seller: offer.seller
                }
            });

            return offersModified;
        } catch (error) {
            console.log(error);
        }
    }

    async acceptOffer(itemId, offerer) {
        try {

            const item = (await this.getItem(itemId)).item;
            const nftContractAddress = item.nftContract;
            const tokenId = item.tokenId;

            const approve = await this.checkApproval(nftContractAddress, tokenId);

            if (approve != this.marketplace.address) {
                const aprrovalTx = await this.approveToken(nftContractAddress, tokenId);

                if (aprrovalTx !== 1) {
                    alert('Approval failed');
                    return;
                }
            }

            const contract = this.marketplaceContract;

            const transaction = await contract.acceptOffer(itemId, offerer, { gasLimit: 300000 });

            const tx = await transaction.wait();

            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }

    async getAccountsOffers(address) {
        try {
            const contract = this.marketplaceContract;

            const itemCount = await contract.itemCount();

            const itemCountArr = [...Array(parseInt(itemCount)).keys()].map(i => i + 1);

            const getOffersPromises = itemCountArr.map(async (id) => {
                const offer = contract.offers(id, address);
                return offer;
            });

            const offers = (await Promise.all(getOffersPromises)).filter(offer => offer.itemId.toNumber() !== 0);

            const itemIds = offers.map(offer => offer.itemId.toNumber());

            const itemsPromises = itemIds.map(async (id) => {
                const item = contract.items(id);
                return item;
            });

            const items = (await Promise.all(itemsPromises));

            const itemsOwners = items.map(item => item.owner);

            const offersModified = offers.filter((offer, i) => offer.seller === itemsOwners[i] && items[i].price.toNumber() === 0);

            return offersModified;
        }
        catch (error) {
            console.log(error);
        }
    }

    async getOffer(itemId, offerer) {
        try {
            const contract = this.marketplaceContract;

            const offer = await contract.offers(itemId, offerer);
            return offer;
        }
        catch (error) {
            console.log(error);
        }
    }

    async claimItem(itemId, price) {
        try {
            const contract = this.marketplaceContract;

            const transaction = await contract.claimItem(itemId, { value: price, gasLimit: 300000 });

            const tx = await transaction.wait();

            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }

    async isMarketplaceOwner(address) {
        try {
            const contract = this.marketplaceContract;

            const owner = await contract.owner();

            return owner === address;
        } catch (error) {
            console.log(error);
        }
    }

    async withdrawMoney() {
        try {
            const contract = this.marketplaceContract;

            const transaction = await contract.withdraw({ gasLimit: 300000 });

            const tx = await transaction.wait();

            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }

    async getMarketplaceBalance() {
        try {
            const balance = await this.provider.getBalance(this.marketplace.address);

            return balance;
        } catch (error) {
            console.log(error);
        }
    }

    async deployNFTCollection(name, symbol) {
        try {
            const factory = new ethers.ContractFactory(this.nftABI, this.nftBytecode, this.signerOrProvider);

            const contract = await factory.deploy(name, symbol);

            await contract.deployed();

            return contract;
        } catch (error) {
            console.log(error);
        }
    }

    async approveToken(collectionAddress, tokenId) {
        try {
            const contract = new ethers.Contract(collectionAddress, this.nftABI, this.signerOrProvider);

            const transaction = await contract.approve(this.marketplace.address, tokenId, { gasLimit: 300000 });

            const tx = await transaction.wait();

            return tx.status;
        } catch (error) {
            console.log(error);
        }
    }
}

export default NFTMarketplaceSDK;

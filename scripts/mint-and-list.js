const { ethers, deployments } = require("hardhat")

const PRICE = ethers.parseEther("0.1")

async function mintAndList() {
    const accounts = await ethers.getSigners()
    signer = accounts[0]

    const nftMarketplaceDeployment = await deployments.get("NftMarketplace")
    nftMarketplace = await ethers.getContractAt(
        nftMarketplaceDeployment.abi,
        nftMarketplaceDeployment.address,
        signer,
    )

    const basicNftDeployment = await deployments.get("BasicNft")
    basicNft = await ethers.getContractAt(
        basicNftDeployment.abi,
        basicNftDeployment.address,
        signer,
    )

    console.log("Minting...")
    const mintTx = await basicNft.mintNft()
    const mintTxReceipt = await mintTx.wait(1)
    const tokenId = mintTxReceipt.logs[0].args.tokenId
    console.log("Minted!")
    console.log("----------------------------------------------")

    console.log("Approving...")
    const approvalTx = await basicNft.approve(nftMarketplace.target, tokenId)
    await approvalTx.wait(1)
    console.log("Approved!")
    console.log("----------------------------------------------")

    console.log("Listing...")
    const listTx = await nftMarketplace.listItem(basicNft.target, tokenId, PRICE)
    await listTx.wait(1)
    console.log("Listed!")
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

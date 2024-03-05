const { deployments, ethers, network } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")
const { TransactionReceipt } = require("ethers")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function () {
          let nftMarketplace, basicNft, signer, user1
          const PRICE = ethers.parseEther("0.1")
          const TOKEN_ID = 0

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              signer = accounts[0]
              user1 = accounts[1]
              await deployments.fixture(["all"])

              const nftMarketplaceDeployment = await deployments.get("NftMarketplace")
              nftMarketplace = await ethers.getContractAt(
                  nftMarketplaceDeployment.abi,
                  nftMarketplaceDeployment.address,
                  signer,
              )
              // If you want to connect another player instead of deployer to the contract, you can do this via:
              // NameOfContractAssociatedWithGetContractAt().connect(userx)

              const basicNftDeployment = await deployments.get("BasicNft")
              basicNft = await ethers.getContractAt(
                  basicNftDeployment.abi,
                  basicNftDeployment.address,
                  signer,
              )
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.target, TOKEN_ID)
          })
          it("contracts are deployed", async () => {
              assert(basicNft.target)
              assert(nftMarketplace.target)
          })

          describe("ListItem", function () {
              it("emits an event after listing an item", async () => {
                  expect(await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)).to.emit(
                      "ItemListed",
                  )
              })
              it("exclusively allows items that haven't been listed", async () => {
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__AlreadyListed")
              })
              it("exclusively allows owners to list items", async () => {
                  nftMarketplace = nftMarketplace.connect(user1)
                  await basicNft.approve(user1, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
              })
              it("needs approval to list item", async () => {
                  user2 = "0x0000000000000000000000000000000000000000"
                  await basicNft.approve(user2, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotApprovedForMarketplace",
                  )
              })
              it("updates the listing with seller and price", async () => {
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                  assert.equal(listing.price.toString(), PRICE)
                  assert.equal(listing.seller.toString(), signer.address)
              })
              it("reverts if the price is 0", async () => {
                  const ZERO_PRICE = ethers.parseEther("0")
                  await expect(
                      nftMarketplace.listItem(basicNft.target, TOKEN_ID, ZERO_PRICE),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero",
                  )
              })
          })

          describe("buyItem", function () {
              it("reverts if the item isn't listed", async () => {
                  await expect(
                      nftMarketplace.buyItem(basicNft.target, TOKEN_ID, { value: PRICE }),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("emits an event after buying an item", async () => {
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  expect(
                      await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {
                          value: PRICE,
                      }),
                  ).to.emit(nftMarketplace, "ItemBought")
              })
              it("reverts if the price is not met", async () => {
                  lowPrice = ethers.parseEther("0.01")
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.buyItem(basicNft.target, TOKEN_ID, { value: lowPrice }),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__PriceNotMet")
              })
              it("updates the proceeds array", async () => {
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, { value: PRICE })
                  const proceeds = await nftMarketplace.getProceeds(signer)
                  assert.equal(proceeds, PRICE)
              })
              it("correctly transfers the NFT from buyer to", async () => {
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  nftMarketplace = nftMarketplace.connect(user1)
                  await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, { value: PRICE })
                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  assert.equal(newOwner.toString(), user1.address)
              })
              it("deletes the listing", async () => {
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, { value: PRICE })
                  const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                  assert.equal(listing.seller.toString(), 0)
              })
          })
          describe("updateItem", function () {
              it("must be owner and listed", async () => {
                  await expect(
                      nftMarketplace.updateItem(basicNft.target, TOKEN_ID, PRICE),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("must be owner", async () => {
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  nftMarketplace = nftMarketplace.connect(user1)
                  await expect(
                      nftMarketplace.updateItem(basicNft.target, TOKEN_ID, PRICE),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
              })
              it("reverts if the price is 0", async () => {
                  ZERO_PRICE = ethers.parseEther("0")
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.updateItem(basicNft.target, TOKEN_ID, ZERO_PRICE),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero",
                  )
              })
              it("updates the price and emits an event", async () => {
                  newPrice = ethers.parseEther("0.2")
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  expect(
                      await nftMarketplace.updateItem(basicNft.target, TOKEN_ID, newPrice),
                  ).to.emit(nftMarketplace, "ItemBought")
                  const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                  assert.equal(listing.price, newPrice)
              })
          })
          describe("cancelItem", function () {
              it("reverts if the item is not listed", async () => {
                  await expect(
                      nftMarketplace.cancelItem(basicNft.target, TOKEN_ID),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("reverts if not the owner of the item", async () => {
                  await nftMarketplace.listItem(basicNft, TOKEN_ID, PRICE)
                  nftMarketplace = nftMarketplace.connect(user1)
                  await expect(
                      nftMarketplace.cancelItem(basicNft.target, TOKEN_ID),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
              })
              it("cancels the item and emits an event", async () => {
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  expect(await nftMarketplace.cancelItem(basicNft.target, TOKEN_ID)).to.emit(
                      nftMarketplace,
                      "ItemCanceled",
                  )
              })
          })
          describe("withdrawProceeds", function () {
              it("reverts if proceeds are 0", async () => {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NoProceeds",
                  )
              })
              it("withdraws the proceeds correctly", async () => {
                  await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  nftMarketplace = nftMarketplace.connect(user1)
                  await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, { value: PRICE })
                  nftMarketplace = nftMarketplace.connect(signer)

                  const signerProceedsBefore = await nftMarketplace.getProceeds(signer)
                  const signerBalanceBefore = await ethers.provider.getBalance(signer)
                  // console.log(signerBalanceBefore)
                  const txResponse = await nftMarketplace.withdrawProceeds()
                  const txReceipt = await txResponse.wait(1)
                  const { gasUsed, gasPrice } = txReceipt
                  const gasCost = gasUsed * gasPrice
                  const signerBalanceAfter = await ethers.provider.getBalance(signer)

                  assert.equal(
                      signerBalanceAfter + gasCost,
                      signerBalanceBefore + signerProceedsBefore,
                  )
              })
          })
      })

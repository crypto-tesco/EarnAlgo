import { Application, arc4, assert, Box, Contract, Global, itxn, Txn, uint64 } from '@algorandfoundation/algorand-typescript'
import { Address, Uint64 } from '@algorandfoundation/algorand-typescript/arc4'
import { gloadBytes } from '@algorandfoundation/algorand-typescript/op'

export class AppState extends arc4.Struct<{
  poolApp: Uint64
  lastPurchaser: Address
  lastPurchaseTime: Uint64
  threshold: Uint64
  distributionInterval: Uint64
}> {}

export class RewardDistributor extends Contract {
  
  appState =  Box<AppState>({key: "appState"})

  /**
   *
   * Initialize a new contract, setting poolApp
   *
   * @param poolApp The Application representing the liquidity pool
   */
  @arc4.abimethod()
  public initialize(poolApp: Application): void {
    assert(!this.appState.exists, 'Already initialized')
    assert(Txn.sender === Global.creatorAddress, 'Only the creator can initialize')

    this.appState.value = new AppState({
      poolApp: new Uint64(poolApp.id),
      lastPurchaser: new Address(Global.zeroAddress),
      lastPurchaseTime: new Uint64(0),
      threshold: new Uint64(1_000_000),
      distributionInterval: new Uint64(60), // 1 minute
      // distributionInterval: new Uint64(60 * 60), // 1 hour
    })
  }

  /**
   *
   * Update contract settings, specifically threshold for purchases and distribution interval
   *
   * @param appState New application state with updated settings
   */
  @arc4.abimethod()
  public updateSettings(appState: AppState): void {
    assert (this.appState.exists, 'Not initialized')
    assert(Txn.sender === Global.creatorAddress, 'Only the creator can update settings')

    this.appState.value.threshold = appState.threshold
    this.appState.value.distributionInterval = appState.distributionInterval
  }

  /**
   *
   * Log a purchase made by a user
   *
   * @param purchaser The address of the purchaser
   * @param purchaseAmount The amount of the purchase in microAlgos
   */
  @arc4.abimethod()
  public addPurchase(purchaser: Address, purchaseAmount: Uint64): void {
    assert (this.appState.exists, 'Not initialized')
    assert(this.appState.value.poolApp !== new Uint64(0), 'Not initialized')
    const poolApp: Application = Application(this.appState.value.poolApp.asUint64())
    assert(Txn.sender === poolApp.address, 'Only the pool app can log purchases')

    // Update last purchaser and time if purchaseAmount exceeds threshold
    if(purchaseAmount.asUint64() > 1_000_000) {
      this.appState.value.lastPurchaser = purchaser
      this.appState.value.lastPurchaseTime = new Uint64(Global.latestTimestamp)
    }
  }

  /**
   *
   * Log a purchase made by a user
   *
   * @param purchaser The address of the purchaser
   * @param purchaseAmount The amount of the purchase in microAlgos
   */
  @arc4.abimethod()
  public claimWinner(purchaser: Address): void {
    assert (this.appState.exists, 'Not initialized')
    assert(this.appState.value.lastPurchaser.native !== Global.zeroAddress, 'No purchaser stored')
    assert(this.appState.value.lastPurchaser.native === purchaser.native, 'Only the last purchaser can claim reward')

    const currentTime: uint64 = Global.latestTimestamp
    assert(currentTime >= (this.appState.value.lastPurchaseTime.asUint64() + this.appState.value.distributionInterval.asUint64()), 'Distribution interval has not passed')

    const balance: uint64 = Global.currentApplicationAddress.balance - Global.currentApplicationAddress.minBalance
    const rewardAmount: uint64 = Math.floor(balance / 2) // 50% reward
    assert(rewardAmount > 0, 'No funds to distribute')

    itxn.payment({
      receiver: purchaser.native,
      amount: rewardAmount,
    }).submit()

    // Reset last purchaser and time
    this.appState.value.lastPurchaser = new Address(Global.zeroAddress)
    this.appState.value.lastPurchaseTime = new Uint64(0)
  }

}

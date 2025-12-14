import { Application, arc4, assert, Box, Contract, Global, Txn } from '@algorandfoundation/algorand-typescript'
import { Address, Uint64 } from '@algorandfoundation/algorand-typescript/arc4'
import { RewardDistributor } from './contract.algo'

export class AppState extends arc4.Struct<{
  distributorApp: Uint64
}> {}

export class DummyPool extends Contract {
  
  appState =  Box<AppState>({key: "appState"})

  /**
   *
   * Initialize a new contract, setting poolApp
   *
   * @param distributorApp The Application representing the liquidity pool
   */
  @arc4.abimethod()
  public initialize(distributorApp: Application): void {
    assert(!this.appState.exists, 'Already initialized')
    assert(Txn.sender === Global.creatorAddress, 'Only the creator can initialize')

    this.appState.value = new AppState({
      distributorApp: new Uint64(distributorApp.id),
    })
  }

  /**
   *
   * Log a purchase made by a user
   *
   * @param purchaser The address of the purchaser
   * @param purchaseAmount The amount of the purchase in microAlgos
   */
  @arc4.abimethod()
  public callAddPurchase(purchaser: Address, purchaseAmount: Uint64): void {
    assert (this.appState.exists, 'Not initialized')
    assert(this.appState.value.distributorApp !== new Uint64(0), 'Not initialized')
    const distributorApp: Application = Application(this.appState.value.distributorApp.asUint64())
    assert(Txn.sender === distributorApp.address, 'Only the distributor app can log purchases')

    const distributorAppId = this.appState.value.distributorApp.asUint64()
    arc4.abiCall({appId:distributorAppId, method: RewardDistributor.prototype.addPurchase, args: [purchaser, purchaseAmount],})
  }


}

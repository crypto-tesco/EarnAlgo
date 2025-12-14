import { TestExecutionContext } from '@algorandfoundation/algorand-typescript-testing'
import { beforeEach, describe, expect, it, test } from 'vitest'
import { RewardDistributor } from './contract.algo'
import { Application, arc4, Global, Uint64, uint64 } from '@algorandfoundation/algorand-typescript'
import * as algotesting from '@algorandfoundation/algokit-utils/testing';
import { Address } from '@algorandfoundation/algorand-typescript/arc4';
import { DummyPool } from './dummy.pool.contract.algo';

describe('RewardDistributor contract', () => {
  const ctx = new TestExecutionContext()
  const fixture = algotesting.algorandFixture();

  beforeEach(fixture.newScope, 10_000);

  it('Initializes', () => {
    const contract = ctx.contract.create(RewardDistributor)

    const appId: uint64 = 1234
    contract.initialize(Application(appId))

    const initializedState = contract.appState.value
    expect(initializedState.lastPurchaser.native.bytes).toStrictEqual(Global.zeroAddress.bytes)
    expect(initializedState.lastPurchaseTime.asUint64()).toStrictEqual(Uint64(0))
    expect(initializedState.threshold.asUint64()).toStrictEqual(Uint64(1_000_000))
    expect(initializedState.poolApp.asUint64()).toStrictEqual(Uint64(appId))
  })

  it("updates settings", () => {
    const contract = ctx.contract.create(RewardDistributor)

    const appId: uint64 = 1234
    contract.initialize(Application(appId))

    const newThreshold = Uint64(2_000_000)
    const newState = contract.appState.value

    newState.threshold = new arc4.Uint64(newThreshold)

    contract.updateSettings(newState)

    const updatedState = contract.appState.value
    expect(updatedState.threshold.asUint64()).toStrictEqual(newThreshold)
  })

  it("adds purchase", () => {

    const poolContract = ctx.contract.create(DummyPool)
    const poolApp = ctx.ledger.getApplicationForContract(poolContract)
    console.log(poolApp.creator);
    
    const rewardContract = ctx.contract.create(RewardDistributor)
    const rewardApp = ctx.ledger.getApplicationForContract(rewardContract)
    console.log(poolApp.creator);

    rewardContract.initialize(poolApp)
    poolContract.initialize(rewardApp)

    const purchaser = ctx.any.account()

    const purchaserAddress = new arc4.Address(purchaser)
    const purchaseAmount = new arc4.Uint64(1_500_000)

    poolContract.callAddPurchase(purchaserAddress, purchaseAmount)

    const stateAfterPurchase = rewardContract.appState.value
    expect(stateAfterPurchase.lastPurchaser.native.bytes).toStrictEqual(purchaserAddress.native.bytes)
    expect(stateAfterPurchase.lastPurchaseTime.asUint64()).toBeGreaterThan(Uint64(0))
  })
})

/** Unit tests for SnapbackSM module */

const assert = require('assert')
const proxyquire = require('proxyquire')

const DBManager = require('../dbManager.js')
const { logger } = require('../logging.js')

const {
  SyncMode,
  computeSyncModeForUserAndReplica
} = require('./computeSyncModeForUserAndReplica.js')
describe('Test computeSyncModeForUserAndReplica()', function () {
  let primaryClock,
    secondaryClock,
    primaryFilesHash,
    secondaryFilesHash,
    primaryFilesHashMock

  // Can be anything for test purposes
  const wallet = 'wallet'

  it('Throws if missing or invalid params', async function () {
    primaryClock = 10
    secondaryClock = 10
    primaryFilesHash = undefined
    secondaryFilesHash = undefined

    try {
      await computeSyncModeForUserAndReplica({
        wallet,
        primaryClock,
        secondaryClock,
        primaryFilesHash,
        secondaryFilesHash
      })
    } catch (e) {
      assert.strictEqual(
        e.message,
        '[computeSyncModeForUserAndReplica] Error: Missing or invalid params'
      )
    }
  })

  it('Returns SyncMode.None if clocks and filesHashes equal', async function () {
    primaryClock = 10
    secondaryClock = primaryClock
    primaryFilesHash = '0x123'
    secondaryFilesHash = primaryFilesHash

    const syncMode = await computeSyncModeForUserAndReplica({
      wallet,
      primaryClock,
      secondaryClock,
      primaryFilesHash,
      secondaryFilesHash
    })

    assert.strictEqual(syncMode, SyncMode.None)
  })

  it('Returns SyncMode.PrimaryShouldSync if clocks equal and filesHashes unequal', async function () {
    primaryClock = 10
    secondaryClock = primaryClock
    primaryFilesHash = '0x123'
    secondaryFilesHash = '0x456'

    const syncMode = await computeSyncModeForUserAndReplica({
      wallet,
      primaryClock,
      secondaryClock,
      primaryFilesHash,
      secondaryFilesHash
    })

    assert.strictEqual(syncMode, SyncMode.PrimaryShouldSync)
  })

  it('Returns SyncMode.PrimaryShouldSync if primaryClock < secondaryClock', async function () {
    primaryClock = 5
    secondaryClock = 10
    primaryFilesHash = '0x123'
    secondaryFilesHash = '0x456'

    const syncMode = await computeSyncModeForUserAndReplica({
      wallet,
      primaryClock,
      secondaryClock,
      primaryFilesHash,
      secondaryFilesHash
    })

    assert.strictEqual(syncMode, SyncMode.PrimaryShouldSync)
  })

  it('Returns SyncMode.SecondaryShouldSync if primaryClock > secondaryClock & secondaryFilesHash === null', async function () {
    primaryClock = 10
    secondaryClock = 5
    primaryFilesHash = '0x123'
    secondaryFilesHash = null

    const syncMode = await computeSyncModeForUserAndReplica({
      wallet,
      primaryClock,
      secondaryClock,
      primaryFilesHash,
      secondaryFilesHash
    })

    assert.strictEqual(syncMode, SyncMode.SecondaryShouldSync)
  })

  describe('primaryClock > secondaryClock', function () {
    it('Returns SyncMode.SecondaryShouldSync if primaryFilesHashForRange = secondaryFilesHash', async function () {
      primaryClock = 10
      secondaryClock = 5
      primaryFilesHash = '0x123'
      secondaryFilesHash = '0x456'

      // Mock DBManager.fetchFilesHashFromDB() to return `secondaryFilesHash` for clock range
      const DBManagerMock = DBManager
      DBManagerMock.fetchFilesHashFromDB = async () => {
        return secondaryFilesHash
      }
      proxyquire('./computeSyncModeForUserAndReplica.js', {
        '../dbManager.js': DBManagerMock
      })

      const syncMode = await computeSyncModeForUserAndReplica({
        wallet,
        primaryClock,
        secondaryClock,
        primaryFilesHash,
        secondaryFilesHash
      })

      assert.strictEqual(syncMode, SyncMode.SecondaryShouldSync)
    })

    it('Returns SyncMode.PrimaryShouldSync if primaryFilesHashForRange != secondaryFilesHash', async function () {
      primaryClock = 10
      secondaryClock = 5
      primaryFilesHash = '0x123'
      secondaryFilesHash = '0x456'
      primaryFilesHashMock = '0x789'

      // Mock DBManager.fetchFilesHashFromDB() to return different filesHash for clock range
      const DBManagerMock = DBManager
      DBManagerMock.fetchFilesHashFromDB = async () => {
        return primaryFilesHashMock
      }
      proxyquire('./computeSyncModeForUserAndReplica.js', {
        '../dbManager.js': DBManagerMock
      })

      const syncMode = await computeSyncModeForUserAndReplica({
        wallet,
        primaryClock,
        secondaryClock,
        primaryFilesHash,
        secondaryFilesHash
      })

      assert.strictEqual(syncMode, SyncMode.PrimaryShouldSync)
    })

    it("Throws error primaryFilesHashForRange can't be retrieved", async function () {
      // Increase mocha test timeout from default 2s to accommodate `async-retry` runtime
      this.timeout(30000) // 30s

      primaryClock = 10
      secondaryClock = 5
      primaryFilesHash = '0x123'
      secondaryFilesHash = '0x456'

      // Mock DBManager.fetchFilesHashFromDB() to throw error
      const DBManagerMock = require('../dbManager.js')
      DBManagerMock.fetchFilesHashFromDB = async () => {
        throw new Error('Mock - Failed to fetch filesHash')
      }
      proxyquire('./computeSyncModeForUserAndReplica.js', {
        '../dbManager.js': DBManagerMock
      })

      try {
        await computeSyncModeForUserAndReplica({
          wallet,
          primaryClock,
          secondaryClock,
          primaryFilesHash,
          secondaryFilesHash,
          logger
        })
      } catch (e) {
        assert.strictEqual(
          e.message,
          '[computeSyncModeForUserAndReplica] Error: failed DBManager.fetchFilesHashFromDB() - Mock - Failed to fetch filesHash'
        )
      }
    })
  })
})
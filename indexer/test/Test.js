
const assert = require("assert");
const { TestHelpers } = require("generated");
const { MockDb, Safe } = TestHelpers;

describe("Safe contract AddedOwner event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Safe contract AddedOwner event
  const event = Safe.AddedOwner.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("Safe_AddedOwner is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Safe.AddedOwner.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualSafeAddedOwner = mockDbUpdated.entities.Safe_AddedOwner.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedSafeAddedOwner = {
      id:`${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner: event.params.owner,
      prevOwner: event.params.prevOwner,
      threshold: event.params.threshold,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(
      actualSafeAddedOwner,
      expectedSafeAddedOwner,
      "Actual SafeAddedOwner should be the same as the expectedSafeAddedOwner"
    );
  });
});

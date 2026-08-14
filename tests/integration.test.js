/**
 * Arcange AI Assistant — Integration Tests
 * 
 * These tests verify the core integration points of the application.
 * Run with: npm test
 */

const assert = require('assert');

// Test conversation store
function testConversationStore() {
  const { ConversationStore } = require('../backend');
  const store = new ConversationStore('/tmp/arcange-test');
  
  // Clean start
  store.clear();
  assert.strictEqual(store.getAll().length, 0, 'Should start empty');
  
  // Add conversation
  const conv = store.add({ id: 'test-1', title: 'Test Chat', messages: [] });
  assert.strictEqual(store.getAll().length, 1, 'Should have 1 conversation');
  assert.strictEqual(conv.id, 'test-1', 'Should preserve ID');
  
  // Update conversation
  store.update('test-1', { title: 'Updated Title' });
  assert.strictEqual(store.getById('test-1').title, 'Updated Title', 'Should update title');
  
  // Delete conversation
  store.delete('test-1');
  assert.strictEqual(store.getAll().length, 0, 'Should be empty after delete');
  
  console.log('✓ ConversationStore tests passed');
}

// Test workflow manager
function testWorkflowManager() {
  const { WorkflowManager } = require('../backend');
  const mgr = new WorkflowManager('/tmp/arcange-test');
  
  // Clean start
  const all = mgr.getAll();
  for (const wf of all) {
    mgr.delete(wf.id);
  }
  assert.strictEqual(mgr.getAll().length, 0, 'Should start empty');
  
  // Create workflow
  const wf = mgr.create({
    name: 'Test Workflow',
    description: 'A test workflow',
    steps: [
      { action: 'open_application', params: { name: 'VS Code' } },
      { action: 'open_application', params: { name: 'Chrome' } },
    ],
  });
  assert.strictEqual(mgr.getAll().length, 1, 'Should have 1 workflow');
  assert.strictEqual(wf.enabled, false, 'Should be disabled by default');
  assert(wf.id, 'Should have an ID');
  
  // Toggle
  mgr.toggle(wf.id, true);
  assert.strictEqual(mgr.getAll()[0].enabled, true, 'Should be enabled');
  
  // Update
  mgr.update(wf.id, { name: 'Updated Workflow' });
  assert.strictEqual(mgr.getAll()[0].name, 'Updated Workflow', 'Should update name');
  
  // Delete
  mgr.delete(wf.id);
  assert.strictEqual(mgr.getAll().length, 0, 'Should be empty after delete');
  
  console.log('✓ WorkflowManager tests passed');
}

// Test audit logger
function testAuditLogger() {
  const { AuditLogger } = require('../backend');
  const logger = new AuditLogger('/tmp/arcange-test');
  
  logger.clear();
  assert.strictEqual(logger.getAll().length, 0, 'Should start empty');
  
  logger.log('file:delete', { path: '/test/file.txt' });
  logger.log('terminal:execute', { command: 'dir' });
  
  assert.strictEqual(logger.getAll().length, 2, 'Should have 2 log entries');
  assert(logger.getAll()[0].timestamp, 'Should have timestamp');
  
  logger.clear();
  assert.strictEqual(logger.getAll().length, 0, 'Should be empty after clear');
  
  console.log('✓ AuditLogger tests passed');
}

// Run all tests
function runTests() {
  console.log('\n🧪 Arcange AI Assistant — Integration Tests\n');
  
  try {
    testConversationStore();
    testWorkflowManager();
    testAuditLogger();
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err.message, '\n');
    process.exit(1);
  }
}

runTests();

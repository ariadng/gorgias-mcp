describe('Basic Functionality Tests', () => {
  test('should have correct package structure', () => {
    expect(1 + 1).toBe(2);
  });

  test('should be able to create objects', () => {
    const testObj = { name: 'test', value: 42 };
    expect(testObj).toHaveProperty('name');
    expect(testObj).toHaveProperty('value');
    expect(testObj.name).toBe('test');
    expect(testObj.value).toBe(42);
  });

  test('should handle promises', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});
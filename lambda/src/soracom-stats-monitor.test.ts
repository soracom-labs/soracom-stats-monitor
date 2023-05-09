
import {handler} from './soracom-stats-monitor';

describe('soracom-stats-monitor', () => {
  test('handler', async () => {
    const result = await handler({})
    expect(result).toBeUndefined()
  })
});
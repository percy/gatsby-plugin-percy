import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import helpers from '@percy/sdk-utils/test/helpers';
import plugin from '../gatsby-node.js';

describe('Gatsby Plugin - Percy', () => {
  let activity, reporter, graphql, store;
  let directory = path.join(import.meta.url, '../.tmp');

  function run(options = {}) {
    return plugin.onPostBuild({ reporter, graphql, store }, options);
  }

  beforeEach(async () => {
    await helpers.setupTest();
    fs.mkdirSync(`${directory}/public`, { recursive: true });

    activity = {
      start: jasmine.createSpy('activity.start'),
      setStatus: jasmine.createSpy('activity.setStatus'),
      end: jasmine.createSpy('activity.end')
    };

    reporter = {
      error: jasmine.createSpy('reporter.error'),
      activityTimer: jasmine.createSpy('reporter.activityTimer')
        .and.returnValue(activity)
    };

    graphql = jasmine.createSpy('graphql')
      .and.resolveTo({ data: { allSitePage: { nodes: [] } } });

    store = {
      getState: jasmine.createSpy('store.getState')
        .and.returnValue({ program: { directory } })
    };

    await helpers.test('reset');
  });

  afterEach(done => rimraf(`${directory}/public`, () => done()));

  it('does nothing when the healthcheck fails', async () => {
    await helpers.test('disconnect', '/percy/healthcheck');
    await run();

    expect(reporter.activityTimer).toHaveBeenCalledWith('Percy');
    expect(activity.setStatus).toHaveBeenCalledWith('Disabled, skipping snapshots');
    expect(activity.end).toHaveBeenCalled();
    expect(graphql).not.toHaveBeenCalled();
  });

  it('errors when the graphql query errors', async () => {
    let err = new Error('test');
    graphql.and.resolveTo({ errors: [err] });
    await run();

    expect(graphql).toHaveBeenCalled();
    expect(activity.setStatus).toHaveBeenCalledWith('Querying pages...');
    expect(reporter.error).toHaveBeenCalledWith('Error taking snapshots:\n', (
      jasmine.objectContaining(err)));
    expect(activity.setStatus).not.toHaveBeenCalledWith('Taking snapshots...');
    expect(activity.end).toHaveBeenCalled();
  });

  it('throws an error when a bad query is passed', async () => {
    graphql.and.resolveTo({ data: { allOtherPage: { nodes: [{ uri: '/test' }] } } });
    await run();

    expect(reporter.error).toHaveBeenCalledWith('Error taking snapshots:\n', (
      jasmine.objectContaining({ message: 'Could not find query data at `allSitePage.nodes`. Fix the custom `query` or provide a custom `resolvePages` function.' })));
    expect(activity.end).toHaveBeenCalled();
  });

  it('can provide a custom graphql query to retrieve pages', async () => {
    graphql.and.resolveTo({ data: { allOtherPage: { nodes: [{ uri: '/test-other/' }] } } });
    let resolvePages = data => data.allOtherPage.nodes.map(({ uri }) => uri);
    await run({ resolvePages });

    expect(activity.setStatus).toHaveBeenCalledWith('Querying pages...');
    expect(activity.setStatus).toHaveBeenCalledWith('Taking snapshots...');
    expect(activity.setStatus).toHaveBeenCalledWith('Done');
    expect(activity.end).toHaveBeenCalled();
    expect(graphql).toHaveBeenCalled();

    expect(await helpers.get('logs')).toEqual(jasmine.arrayContaining([
      'Snapshot found: /test-other/'
    ]));
  });

  it('errors when there are no snapshots to capture', async () => {
    await run();

    expect(reporter.error).toHaveBeenCalledWith('Error taking snapshots:\n', (
      jasmine.objectContaining({ message: 'No snapshots found' })));
    expect(activity.end).toHaveBeenCalled();
  });

  it('takes snapshots of pages', async () => {
    let nodes = ['/test-a/', '/test-b/', '/test-c/'].map(path => ({ path }));
    graphql.and.resolveTo({ data: { allSitePage: { nodes } } });
    await run();

    expect(activity.setStatus).toHaveBeenCalledWith('Querying pages...');
    expect(activity.setStatus).toHaveBeenCalledWith('Taking snapshots...');
    expect(activity.setStatus).toHaveBeenCalledWith('Done');
    expect(activity.end).toHaveBeenCalled();
    expect(graphql).toHaveBeenCalled();

    let logs = await helpers.get('logs', i => i);

    expect(await helpers.get('logs')).toEqual(jasmine.arrayContaining([
      'Snapshot found: /test-a/',
      'Snapshot found: /test-b/',
      'Snapshot found: /test-c/'
    ]));
  });
});

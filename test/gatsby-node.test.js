const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const plugin = require('../gatsby-node');

fdescribe('Gatsby Plugin - Percy', () => {
  let activity, reporter, graphql, store, request;
  const addr = 'http://localhost:5338';
  const get = p => request(`${addr}${p}`);
  const post = (p, body) => request(`${addr}${p}`, { method: 'post', body });

  let directory = path.join(__dirname, '.tmp/public');
  beforeAll(async () => ({ request } = await import('@percy/client/utils')));
  beforeEach(() => fs.mkdirSync(directory, { recursive: true }));
  afterEach(done => rimraf(directory, () => done()));

  function run(options = {}) {
    return plugin.onPostBuild({ reporter, graphql, store }, options);
  }

  beforeEach(async () => {
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
        .and.returnValue({ program: { directory: path.join(__dirname, '.tmp') } })
    };

    await post('/test/api/reset');
  });

  xit('does nothing when the healthcheck fails', async () => {
    await post('/test/api/disconnect', '/percy/healthcheck');
    await run();

    expect(reporter.activityTimer).toHaveBeenCalledWith('Percy');
    expect(activity.setStatus).toHaveBeenCalledWith('Disabled, skipping snapshots');
    expect(activity.end).toHaveBeenCalled();
    expect(graphql).not.toHaveBeenCalled();
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

    let { logs } = await get('/test/logs');

    expect(logs).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ message: 'Snapshot found: /test-other/' })
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

    let { logs } = await get('/test/logs');

    expect(logs).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ message: 'Snapshot found: /test-a/' }),
      jasmine.objectContaining({ message: 'Snapshot found: /test-b/' }),
      jasmine.objectContaining({ message: 'Snapshot found: /test-c/' })
    ]));
  });
});

const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const helpers = require('@percy/sdk-utils/test/helpers');
const plugin = require('../gatsby-node');

describe('Gatsby Plugin - Percy', () => {
  let activity, reporter, graphql, store;

  let directory = path.join(__dirname, '.tmp');
  beforeEach(() => fs.mkdirSync(directory));
  afterEach(done => rimraf(directory, () => done()));

  function run(options = {}) {
    return plugin.onPostBuild({ reporter, graphql, store }, options);
  }

  beforeEach(async () => {
    await helpers.setup();

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
  });

  it('does nothing when the healthcheck fails', async () => {
    await helpers.testFailure('/percy/healthcheck');

    await run();

    expect(reporter.activityTimer).toHaveBeenCalledWith('Percy');
    expect(activity.setStatus).toHaveBeenCalledWith('Disabled, skipping snapshots');
    expect(activity.end).toHaveBeenCalled();
    expect(graphql).not.toHaveBeenCalled();
  });

  it('serves pages and posts snapshots to the local percy server', async () => {
    let nodes = ['/test-a/', '/test-b/', '/test-c/'].map(path => ({ path }));
    graphql.and.resolveTo({ data: { allSitePage: { nodes } } });
    await run();

    expect(reporter.activityTimer).toHaveBeenCalledWith('Percy');
    expect(activity.setStatus).toHaveBeenCalledWith('Fetching config...');
    expect(activity.setStatus).toHaveBeenCalledWith('Serving build output...');
    expect(activity.setStatus).toHaveBeenCalledWith('Querying pages...');
    expect(activity.setStatus).toHaveBeenCalledWith('Taking snapshots...');
    expect(activity.setStatus).toHaveBeenCalledWith('Done');
    expect(activity.end).toHaveBeenCalled();
    expect(graphql).toHaveBeenCalled();

    await expectAsync(helpers.getRequests()).toBeResolvedTo([
      ['/percy/healthcheck'],
      ['/percy/config', {
        clientInfo: jasmine.stringMatching(/gatsby-plugin-percy\/.+/),
        environmentInfo: jasmine.stringMatching(/gatsby\/.+/),
        static: {}
      }],
      ['/percy/snapshot?async=true', [{
        name: '/test-a/',
        url: jasmine.stringMatching('localhost:(.*?)/test-a/')
      }, {
        name: '/test-b/',
        url: jasmine.stringMatching('localhost:(.*?)/test-b/')
      }, {
        name: '/test-c/',
        url: jasmine.stringMatching('localhost:(.*?)/test-c/')
      }]]
    ]);
  });

  it('can provide a custom graphql query to retrieve pages', async () => {
    graphql.and.resolveTo({ data: { allOtherPage: { nodes: [{ uri: '/test-other/' }] } } });
    let resolvePages = data => data.allOtherPage.nodes.map(({ uri }) => uri);
    await run({ resolvePages });

    await expectAsync(helpers.getRequests()).toBeResolvedTo(
      jasmine.arrayContaining([['/percy/snapshot?async=true', [{
        name: '/test-other/',
        url: jasmine.stringMatching('localhost:(.*?)/test-other/')
      }]]])
    );
  });

  it('errors when there are no pages to snapshot', async () => {
    await run();

    expect(activity.setStatus).toHaveBeenCalledWith('Taking snapshots...');
    expect(reporter.error).toHaveBeenCalledWith('Error taking snapshots:\n', (
      jasmine.objectContaining({ message: 'No snapshots found' })));
    expect(activity.end).toHaveBeenCalled();
  });

  it('errors when the graphql query errors', async () => {
    let err = new Error('test');
    graphql.and.resolveTo({ errors: [err] });
    await run();

    expect(graphql).toHaveBeenCalled();
    expect(activity.setStatus).toHaveBeenCalledWith('Querying pages...');
    expect(reporter.error).toHaveBeenCalledWith('Error querying pages:\n', [err]);
    expect(activity.setStatus).not.toHaveBeenCalledWith('Taking snapshots...');
    expect(activity.end).toHaveBeenCalled();
  });

  it('errors when a custom graphql query is not an expected format', async () => {
    graphql.and.resolveTo({ data: { allOtherPage: { nodes: [{ uri: '/test' }] } } });
    await run();

    let expectedMessage = 'Could not find query data at `allSitePage.nodes`. ' +
      'Fix the custom `query` or provide a custom `resolvePages` function.';

    expect(reporter.error).toHaveBeenCalledWith('Error querying pages:\n', (
      jasmine.objectContaining({ message: expectedMessage })));
  });

  it('handles unexpected errors', async () => {
    let err = new Error('test');
    store.getState.and.throwError(err);
    await run();

    expect(graphql).not.toHaveBeenCalled();
    expect(activity.setStatus).toHaveBeenCalledWith('Serving build output...');
    expect(reporter.error).toHaveBeenCalledWith('Error serving build output:\n', err);
    expect(activity.end).toHaveBeenCalled();
  });
});

// Gather client and env info
const pkg = require('./package.json');
const gatsbyPkg = require('gatsby/package.json');
const CLIENT_INFO = `${pkg.name}/${pkg.version}`;
const ENV_INFO = `${gatsbyPkg.name}/${gatsbyPkg.version}`;

// Returns helpers for common activity tasks
function activityHelper(name, reporter) {
  let activity = reporter.activityTimer(name);
  let context = {};

  // helper to set the status and end the activity
  context.end = status => {
    if (status && !context.error) {
      activity.setStatus(status);
    }

    activity.end();
  };

  // helper to execute a callback when there is no error and catch & log any thrown error
  context.try = async (status, fn, fail) => {
    try {
      if (context.error) return;
      activity.setStatus(`${status}...`);
      return await fn();
    } catch (err) {
      reporter.error(`Error ${status.toLowerCase()}:\n`, err);
      context.error = err;
    }
  };

  // auto-start the activity
  activity.start();
  return context;
}

// After building, start Percy, query pages, serve build output, and take snapshots
exports.onPostBuild = async ({ reporter, graphql, store }, {
  // gatsby specific options
  query = '{ allSitePage { nodes { path } } }',
  resolvePages = ({ allSitePage }) => {
    if (allSitePage) return allSitePage.nodes.map(n => n.path);
    throw new Error('Could not find query data at `allSitePage.nodes`. ' + (
      'Fix the custom `query` or provide a custom `resolvePages` function.'));
  },
  // static snapshot options
  ...staticOptions
}) => {
  let activity = activityHelper('Percy', reporter);

  // lazily required to not bloat the process when not building
  let { serve, mapStaticSnapshots } = require('@percy/cli-snapshot/dist/utils');
  let utils = require('@percy/sdk-utils');

  if (!(await utils.isPercyEnabled())) {
    return activity.end('Disabled, skipping snapshots');
  }

  // update and fetch static config options
  let config = await activity.try('Fetching config', () => {
    return utils.request.post('/percy/config', {
      clientInfo: CLIENT_INFO,
      environmentInfo: ENV_INFO,
      static: staticOptions
    }).then(({ body }) => {
      return body.config.static;
    });
  });

  // serve static build output
  let server = await activity.try('Serving build output', () => {
    return serve(store.getState().program.directory, config);
  });

  // query and resolve pages to snapshot
  let pages = await activity.try('Querying pages', async () => {
    let result = await graphql(query);
    if (result.errors) throw result.errors;
    return resolvePages(result.data);
  });

  // map static options and take snapshots async
  await activity.try('Taking snapshots', () => {
    let snapshots = mapStaticSnapshots(pages, { ...config, server });
    if (!snapshots.length) throw new Error('No snapshots found');
    return utils.postSnapshot(snapshots, { async: true });
  });

  // clean up
  if (server) await server.close();
  activity.end('Done');
};

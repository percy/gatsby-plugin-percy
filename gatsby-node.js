// Gather client and env info
const pkg = require('./package.json');
const gatsbyPkg = require(require.resolve('gatsby/package.json', { paths: [process.cwd()] }));
const CLIENT_INFO = `${pkg.name}/${pkg.version}`;
const ENV_INFO = `${gatsbyPkg.name}/${gatsbyPkg.version}`;

// After building, start Percy, query pages, serve build output, and take snapshots
exports.onPostBuild = async ({ reporter, graphql, store }, {
  // gatsby specific options
  query = '{ allSitePage { nodes { path } } }',
  resolvePages = ({ allSitePage }) => {
    if (allSitePage) return allSitePage.nodes.map(n => n.path);
    throw new Error('Could not find query data at `allSitePage.nodes`. ' + (
      'Fix the custom `query` or provide a custom `resolvePages` function.'));
  },
  // snapshot server options
  ...options
}) => {
  let activity = reporter.activityTimer('Percy');
  let utils = require('@percy/sdk-utils');

  if (!(await utils.isPercyEnabled())) {
    activity.setStatus('Disabled, skipping snapshots');
    return activity.end();
  }

  try {
    // query for pages
    activity.setStatus('Querying pages...');

    let result = await graphql(query);
    if (result.errors) throw result.errors;

    // resolve pages to snapshots
    let snapshots = await resolvePages(result.data);
    if (!snapshots.length) throw new Error('No snapshots found');

    // take snapshots async
    activity.setStatus('Taking snapshots...');

    await utils.postSnapshot({
      // always serve the `public` dir since it's non-configurable
      // see: https://github.com/gatsbyjs/gatsby/blob/97433ec6d3022dc80c272687e51cdbe0de501224/packages/gatsby/src/services/initialize.ts#L260
      serve: `${store.getState().program.directory}/public`,
      clientInfo: CLIENT_INFO,
      environmentInfo: ENV_INFO,
      snapshots,
      ...options
    }, { async: true });

    // wait for percy to idle before finishing
    await utils.waitForPercyIdle();
  } catch (err) {
    reporter.error('Error taking snapshots:\n', err);
  }

  // percy will continue to process snapshots in the background
  activity.setStatus('Done');
  activity.end();
};

# gatsby-plugin-percy

A Gatsby plugin for automatically taking Percy snapshots after a build.

## Install

```session
$ npm install --save-dev @percy/cli gatsby-plugin-percy
```

## Usage

First, add the Percy plugin to your `gatsby-config.js` file:

```javascript
module.exports = {
  plugins: [`gatsby-plugin-percy`]
}
```

Now when running `gatsby build`, the plugin will first check if Percy is running before querying for
pages using Gatsby's graphQL functions and sebsequently take snapshots of discovered pages. If Percy
is not running, the plugin will not do anything.

You can run Percy around the build command using [`percy
exec`](https://github.com/percy/cli/tree/master/packages/cli-exec#percy-exec) along with your Percy
project's `PERCY_TOKEN`:

```sh-session
$ export PERCY_TOKEN=[your-project-token]
$ percy exec -- gatsby build
[percy] Percy has started!
[percy] Created build #1: https://percy.io/[your-project]
[percy] Running "gatsby build"
... other gatsby logs will be shown here
[percy] Snapshot taken: /
[percy] Snapshot taken: /about/
[percy] Snapshot taken: /other-page/
... other gatsby logs will be shown here
[percy] Finalized build #1: https://percy.io/[your-project]
[percy] Done!
```

## Options

Options are not required. The following are accepted plugin options within your `gatsby-config.js` file:

- `query` - The GraphQL query used when retrieving pages to snapshot. If querying without using the
  `allSitePage.nodes` query structure, you will also need to set a custom `resolvePages` function.
- `resolvePages` - A function given data retrieved by the query and returns an array of page paths.
- `...` - Any additional [`static` snapshot
  options](https://docs.percy.io/docs/cli-snapshot#static-options).

Percy also searches the current working directory and up for a [matching Percy config
file](https://docs.percy.io/docs/cli-configuration#files).

### Example

```javascript
// In your gatsby-config.js
module.exports = {
  plugins: [{
    resolve: `gatsby-plugin-percy`,
    options: {
      // gatsby specific options
      query: `{
        allSitePage { nodes { path } }
        allOtherPage { nodes { path } }
      }`,
      resolvePages: ({
        allSitePage: { nodes: allPages },
        allOtherPage: { nodes: otherPages }
      }) => {
        return [...allPages, ...otherPages]
          .map(({ path }) => path);
      },
      // percy static snapshot options
      exclude: [
        '/dev-404-page/',
        '/offline-plugin-app-shell-fallback/'
      ],
      overrides: [{
        include: '/foobar/',
        waitForSelector: '.done-loading',
        additionalSnapshots: [{
          suffix: ' - after btn click'
          execute: () => document.querySelector('.btn').click()
        }]
      }]
    }
  }]
}
```

## Upgrading

Versions of this plugin prior to `1.0` depended on and invoked the `snapshot` command from the now
deprecated `@percy/agent` package. The new [`@percy/cli`](https://github.com/percy/cli), the core
for all Percy SDKs, must now be installed explicitly. The new plugin no longer invokes any commands
automatically, but will detect if the CLI is running and send pages to it for snapshotting.

After upgrading this plugin, install `@percy/cli`:

``` sh-session
$ npm install --save-dev @percy/cli
```
See [usage](#usage) above for running with Percy.

### Migrating Options

All previous plugin options were provided to the `snapshot` command as flags. These options have now
been removed. If using any of the previous plugin options, replace them with the below alternatives:

- `config` - Use the CLI `--config` flag instead (`percy exec --config ... -- gatsby build`)
- `files` - Use the [`include` static option](https://docs.percy.io/docs/cli-snapshot#static-options)
  (can be provided as a plugin option)
- `ignore` - Use the [`exclude` static option](https://docs.percy.io/docs/cli-snapshot#static-options)
  (can be provided as a plugin option)

See [options](#options) above for all accepted options.

### Migrating Config

If you have a previous Percy configuration file, migrate it to the newest version with the
[`config:migrate`](https://github.com/percy/cli/tree/master/packages/cli-config#percy-configmigrate-filepath-output) command:

```sh-session
$ percy config:migrate
```

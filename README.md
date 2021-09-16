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

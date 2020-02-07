# gatsby-plugin-percy

A Gatsby plugin for automatically taking Percy snapshots after a build.

### Dependencies

- [@percy/agent](https://github.com/percy/percy-agent)

## Install

```shell
$ npm install --save @percy/agent gatsby-plugin-percy
```

## Usage

```javascript
// In your gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: `gatsby-plugin-percy`,
      options: {
        // example options:
        // files: [`dir/*.html`],
        // ignore: [`ignore/*.html`],
        // config: `config/.percy.yaml`,
      },
    },
  ],
}
```

## Options

Options are not required. Percy searches the current working directory and up
for a [matching config file](https://docs.percy.io/docs/sdk-configuration#section-configuration-files).
The `files` and `ignore` options can be specified within a
[`static-snapshots` section](https://docs.percy.io/docs/sdk-configuration#section-static-snapshots)
of your Percy config file as `snapshot-files` and `ignore-files` respectively.

- `files` - A single file glob or array of file globs to snapshot within the `public` directory
- `ignore` - A single file glob or array of file globs to ignore within the `public` directory
- `config` - Path to a [Percy config file](https://docs.percy.io/docs/sdk-configuration)

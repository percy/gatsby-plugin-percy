# Releasing

1. Create a new branch and bump the version in `package.json`
2. Commit changes, Open a PR, and merge
3. Create a new tag for the version, `git tag vX.X.X`
4. Push the tag to GitHub, `git push --tags`
5. Ensure tests have passed on that tag
6. [Create a new release](https://github.com/percy/gatsby-plugin-percy/releases) on GitHub
7. Wait for the publish workflow to complete (triggered via a new release)
8. [Visit npm](https://www.npmjs.com/package/gatsby-plugin-percy) and see the new version is live

* Announce the new release, making sure to say "thank you" to the contributors who helped shape this version!

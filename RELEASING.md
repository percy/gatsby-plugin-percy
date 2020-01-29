# Releasing

1. Create a new tag for the version `git tag vX.X.X`
2. Push the tag to GitHub `git push --tags`
3. Ensure tests have passed on that tag
4. [Create a new release](https://github.com/percy/gatsby-plugin-percy/releases) on GitHub
5. Wait for the publish workflow to complete (triggered via a new release)
6. [Visit npm](https://www.npmjs.com/package/gatsby-plugin-percy) and see the new version is live

* Announce the new release, making sure to say "thank you" to the contributors who helped shape this version!

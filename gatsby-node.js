const path = require('path')
const { execSync } = require('child_process')
const which = require('which')
const { isArray } = Array

exports.onPostBuild = ({ store }, { files, ignore, config }) => {
  let { program: { useYarn, directory } } = store.getState()

  let manager = which.sync(useYarn ? 'yarn' : 'npm')
  let cmd = [manager, 'run', 'percy', 'snapshot', path.resolve(directory, 'public')]

  if (files) {
    cmd = cmd.concat('--snapshot-files', [].concat(files).join(','))
  }

  if (ignore) {
    cmd = cmd.concat('--ignore-files', [].concat(ignore).join(','))
  }

  if (config) {
    cmd = cmd.concat('--config', config)
  }

  execSync(cmd.join(' '), { stdio: 'inherit' })
}

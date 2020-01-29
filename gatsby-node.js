const path = require('path')
const { execSync } = require('child_process')
const { isArray } = Array

exports.onPostBuild = ({ store }, { files, ignore, config }) => {
  let { program: { useYarn, directory } } = store.getState()
  let cmd = [useYarn ? 'yarn' : 'npm', 'percy', 'snapshot', path.resolve(directory, 'public')]

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

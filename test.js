const expect = require('expect')
const mock = require('mock-require')
const which = require('which')

function execSyncMock(...args) {
  (execSyncMock.calls = execSyncMock.calls || []).push(args)
}

mock('child_process', { execSync: execSyncMock })
// we don't need to actually resolve paths for tests
mock('path', { resolve: (...p) => p.filter(Boolean).join('/') })
// required after mocking so we don't have to re-require
const { onPostBuild } = require('./gatsby-node')

describe('onPostBuild', () => {
  let program, store = { getState: () => ({ program }) }
  let yarn = which.sync('yarn')
  let npm = which.sync('npm')

  beforeEach(() => {
    delete execSyncMock.calls
    program = {}
  })

  it('calls `percy snapshot` with npm using the public path', () => {
    onPostBuild({ store }, {})
    expect(execSyncMock.calls).toHaveLength(1)
    expect(execSyncMock.calls[0][0]).toBe(`${npm} run percy snapshot public`)
  })

  it('calls `percy snapshot` with yarn using the public path', () => {
    program.useYarn = true
    onPostBuild({ store }, {})
    expect(execSyncMock.calls).toHaveLength(1)
    expect(execSyncMock.calls[0][0]).toBe(`${yarn} run percy snapshot public`)
  })

  it('calls `percy snapshot` with the resolved public path', () => {
    program.directory = 'some/project/path'
    onPostBuild({ store }, {})
    expect(execSyncMock.calls).toHaveLength(1)
    expect(execSyncMock.calls[0][0]).toBe(`${npm} run percy snapshot some/project/path/public`)
  })

  it('calls `percy snapshot` with the `snapshot-files` option', () => {
    onPostBuild({ store }, { files: '*.html' })
    expect(execSyncMock.calls).toHaveLength(1)
    expect(execSyncMock.calls[0][0]).toBe(`${npm} run percy snapshot public --snapshot-files *.html`)

    onPostBuild({ store }, { files: ['*.html', '*.htm'] })
    expect(execSyncMock.calls).toHaveLength(2)
    expect(execSyncMock.calls[1][0]).toBe(`${npm} run percy snapshot public --snapshot-files *.html,*.htm`)
  })

  it('calls `percy snapshot` with the `ignore-files` option', () => {
    onPostBuild({ store }, { ignore: '*.html' })
    expect(execSyncMock.calls).toHaveLength(1)
    expect(execSyncMock.calls[0][0]).toBe(`${npm} run percy snapshot public --ignore-files *.html`)

    onPostBuild({ store }, { ignore: ['*.html', '*.htm'] })
    expect(execSyncMock.calls).toHaveLength(2)
    expect(execSyncMock.calls[1][0]).toBe(`${npm} run percy snapshot public --ignore-files *.html,*.htm`)
  })

  it('calls `percy snapshot` with the `config` option', () => {
    onPostBuild({ store }, { config: 'path/to/.percy.yml' })
    expect(execSyncMock.calls).toHaveLength(1)
    expect(execSyncMock.calls[0][0]).toBe(`${npm} run percy snapshot public --config path/to/.percy.yml`)
  })

  it('calls `percy snapshot` with multiple options', () => {
    program.directory = 'some/project/path'
    program.useYarn = true

    onPostBuild({ store }, {
      files: ['*.html'],
      ignore: ['*.htm'],
      config: 'path/to/.percy.yml'
    })

    expect(execSyncMock.calls).toHaveLength(1)
    expect(execSyncMock.calls[0][0]).toBe([
      `${yarn} run percy snapshot some/project/path/public`,
      '--snapshot-files *.html',
      '--ignore-files *.htm',
      '--config path/to/.percy.yml'
    ].join(' '))
  })
})

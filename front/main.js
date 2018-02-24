const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const path = require('path')
const console = require('console');
const request = require('request');


/*************************************************************
 * py process
 *************************************************************/

const PY_DIST_FOLDER = 'mtgatracker_dist'
const PY_FOLDER = 'app'
const PY_MODULE = 'main' // without .py suffix

let pyProc = null
let pyPort = null

let debug = false;
let no_server = false;
let server_killed = false;
global.debug = debug;

const guessPackaged = () => {
  const fullPath = path.join(__dirname, PY_DIST_FOLDER)
  return require('fs').existsSync(fullPath)
}

const getScriptPath = () => {
  if (!guessPackaged()) {
    return path.join(__dirname, "..", PY_FOLDER, PY_MODULE + '.py')
  }
  if (process.platform === 'win32') {
    return path.join(__dirname, "..", "..", PY_DIST_FOLDER, PY_MODULE, PY_MODULE + '.exe')
  }
  return path.join(__dirname, "..", "..", PY_DIST_FOLDER, PY_MODULE, PY_MODULE)
}

const getPyBinPath = () => {
  if (process.platform === 'win32') {
    return path.join(__dirname, "..", "venv", "Scripts", "python.exe")
  } else {
    return path.join(__dirname, "..", "venv", "bin", "python")
  }
}

const getLogFilePath = () => {
    // TODO: make this cmd-line configurable
    return path.join(__dirname, "..", "example_logs", "output_log.txt")
}

const selectPort = () => {
  pyPort = 8089
  return pyPort
}

port = selectPort()
logPath = getLogFilePath()
noFollow = false;
readFullFile = true;

const generateArgs = () => {
    var args = ["-p", port, "-i", logPath]
    if (noFollow) {
        args.push('-nf')
    }
    if (readFullFile) {
        args.push('-f')
    }
    return args
}


const createPyProc = () => {
  let script = getScriptPath()

  if (guessPackaged()) {
    pyProc = require('child_process').execFile(script, generateArgs())
  } else {
    pyProc = require('child_process').spawn(getPyBinPath(), [script].concat(generateArgs()), {shell: true})
    console.log(getPyBinPath(), [script].concat(generateArgs()))
  }

  if (pyProc != null) {
    console.log('child process success on port ' + port)
  }
}

if (!no_server) {
    app.on('ready', createPyProc)
}


/*************************************************************
 * window management
 *************************************************************/

let mainWindow = null

let window_width = 354;
if (debug) {
    window_width = 1220;
}
if (!debug) {
    app.disableHardwareAcceleration()
}
const createWindow = () => {
  mainWindow = new BrowserWindow({width: window_width,
                                  height: 200,
                                  show: false,
                                  transparent: !debug,
                                  resizable: debug,
                                  frame: debug,
                                  alwaysOnTop: true,
                                  toolbar: false,
                                  titlebar: false,
                                  title: false,
                                  maximizable: false})
  mainWindow.loadURL(require('url').format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  if (debug) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    console.timeEnd('init')
  })
}

const killServer = () => {
    if (!no_server && !server_killed) {
       console.log("killing server")
       request.get({
        url: "http://localhost:8089/die",
        json: true,
        headers: {'User-Agent': 'request'}
      }, (err, res, data) => {
        console.log("doop");
        console.log(err, res, data)
        pyProc.kill()
        pyProc = null
        pyPort = null
        app.quit()
      })
    } else {
        app.quit()
    }
}

app.on('ready', createWindow)

app.on('before-quit', function() {
  console.log("boutta quit")
  killServer()
})

app.on('will-quit', function() {
  console.log("quitting")
  killServer()
})

app.on('window-all-closed', () => {
    killServer()
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

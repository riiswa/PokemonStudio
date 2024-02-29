/* eslint global-require: off, no-console: off */

import crypto from 'crypto';
import path from 'path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import log, { FileTransport, PathVariables } from 'electron-log';
import MenuBuilder from './menu';
import { autoUpdater } from 'electron-updater';
import { getPSDKBinariesPath, getPSDKVersion } from '../services/getPSDKVersion';
import { getLastPSDKVersion } from '../services/getLastPSDKVersion';
import { updatePSDK } from '../services/updatePSDK';
import { startPSDK, startPSDKDebug, startPSDKTags, startPSDKWorldmap } from '../services/startPSDK';
import { registerElectronProtocolWhenAppRead } from '../utils/electronProtocol';
import { registerGetStudioVersion } from '../backendTasks/getStudioVersion';
import { registerChooseProjectFileToOpen } from '../backendTasks/chooseProjectFileToOpen';
import { registerWriteProjectMetadata } from '../backendTasks/writeProjectMetadata';
import { registerReadProjectMetadata } from '../backendTasks/readProjectMetadata';
import { registerReadProjectConfigs } from '../backendTasks/readProjectConfigs';
import { registerReadProjectData } from '../backendTasks/readProjectData';
import { registerReadProjectTexts } from '../backendTasks/readProjectTexts';
import { registerMigrateData } from '../backendTasks/migrateData';
import { registerFileExists } from '../backendTasks/fileExists';
import { registerChooseFolder } from '../backendTasks/chooseFolder';
import { registerExtractNewProject } from '../backendTasks/extractNewProject';
import { registerConfigureNewProject } from '../backendTasks/configureNewProject';
import { registerSaveProjectData } from '../backendTasks/saveProjectData';
import { registerSaveProjectConfigs } from '../backendTasks/saveProjectConfigs';
import { registerSaveProjectTexts } from '../backendTasks/saveProjectTexts';
import { registerProjectStudioFile } from '../backendTasks/projectStudioFile';
import { registerChooseFile } from '../backendTasks/chooseFile';
import { registerShowItemInFolder } from '../backendTasks/showFileInFolder';
import { registerCopyFile } from '../backendTasks/copyFile';
import { registerUpdateTextInfos } from '@src/backendTasks/updateTextInfos';
import { registerSaveTextInfos } from '@src/backendTasks/saveTextInfos';
import { registerReadCsvFile } from '@src/backendTasks/readCsvFile';
import { registerOpenStudioLogsFolder } from '@src/backendTasks/openStudioLogsFolder';
import { registerCheckMapsModified } from '@src/backendTasks/checkMapsModified';
import { registerConvertTiledMapToTileMetadata } from '@src/backendTasks/convertTiledMapToTileMetadata';
import { registerSaveMapInfo } from '@src/backendTasks/saveMapInfo';
import { registerStartupStudioFile, startupFiles } from '@src/backendTasks/startupStudioFile';
import { registerGetFilePathsFromFolder } from '@src/backendTasks/getFilePathsFromFolder';
import { registerCopyTiledFiles } from '@src/backendTasks/copyTiledFiles';
import { registerRMXP2StudioMapsSync } from '@src/backendTasks/RMXP2StudioMapsSync';
import { registerReadRMXPMapInfo } from '@src/backendTasks/readRMXPMapInfo';
import { registerReadRMXPMap } from '@src/backendTasks/readRMXPMap';
import { registerReadMaps } from '@src/backendTasks/readMaps';
import { registerSaveRMXPMapInfo } from '@src/backendTasks/saveRMXPMapInfo';
import { registerOpenTiled } from '@src/backendTasks/openTiled';
import { registerDownloadFile } from '@src/backendTasks/downloadFile';
import { registerRequestJson } from '@src/backendTasks/requestJson';
import { registerCheckDownloadNewProject } from '@src/backendTasks/checkDownloadNewProject';

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Setup the log renderer
log.initialize({ preload: true });

const resolvePathFn = (vars: PathVariables) => {
  return path.join(vars.libraryDefaultDir, `renderer.log`);
};
const rendererLog = log.create({ logId: 'renderer' });
const fileTransport: FileTransport = <FileTransport>rendererLog.transports.file;
fileTransport.resolvePathFn = resolvePathFn;

let mainWindow: BrowserWindow | null = null;

const createWindow = async () => {
  const RESOURCES_PATH = app.isPackaged ? path.join(process.resourcesPath, 'assets') : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  registerElectronProtocolWhenAppRead();

  mainWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 640,
    useContentSize: true,
    icon: getAssetPath('icon.png'),
    titleBarStyle: process.platform === 'win32' ? 'hidden' : 'default',
    autoHideMenuBar: process.platform === 'linux',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      if (process.platform === 'win32') mainWindow.maximize();
      mainWindow.focus();
    }

    // When Studio is opened by clicking on project.studio file.
    const startupFile = process.argv.find((arg) => arg.endsWith('.studio'));
    if (startupFile) startupFiles.push(startupFile);
  });

  mainWindow.on('close', (event) => {
    mainWindow?.webContents.send('request-window-close');
    event.preventDefault();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Updater
  if (app.isPackaged) {
    autoUpdater.logger = log;
    autoUpdater.on('update-available', () => {
      mainWindow?.webContents.send('request-update-available');
    });
    autoUpdater.on('update-downloaded', () => {
      mainWindow?.webContents.send('request-update-downloaded');
    });
  }
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Note: We don't have to follow Darwin Convention, this is fucking stupid and unintuitive
  app.quit();
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', (event) => {
  const wins = BrowserWindow.getAllWindows();
  if (wins.length) {
    wins.forEach((win) => win.webContents.send('request-window-close'));
    event.preventDefault();
  }
});

ipcMain.on('window-minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;
  if (window.isMaximized()) window.unmaximize();
  else window.maximize();
});

ipcMain.on('window-close', (event) => {
  event.sender.send('request-window-close');
});

ipcMain.on('window-safe-close', (event, forceQuit) => {
  BrowserWindow.fromWebContents(event.sender)?.destroy();
  if (forceQuit) app?.quit();
});

ipcMain.on('window-is-maximized', (event) => {
  event.returnValue = BrowserWindow.fromWebContents(event.sender)?.isMaximized();
});

ipcMain.handle('get-psdk-binaries-path', () => getPSDKBinariesPath());
ipcMain.handle('get-psdk-version', () => getPSDKVersion());
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.once('studio-check-update', () => app.isPackaged && autoUpdater.checkForUpdates());
ipcMain.on('get-last-psdk-version', getLastPSDKVersion);
ipcMain.on('update-psdk', updatePSDK);
ipcMain.on('start-psdk', (_, projectPath: string) => startPSDK(projectPath));
ipcMain.on('start-psdk-debug', (_, projectPath: string) => startPSDKDebug(projectPath));
ipcMain.on('start-psdk-tags', (_, projectPath: string) => startPSDKTags(projectPath));
ipcMain.on('start-psdk-worldmap', (_, projectPath: string) => startPSDKWorldmap(projectPath));
registerGetStudioVersion(ipcMain);
registerChooseProjectFileToOpen(ipcMain);
registerWriteProjectMetadata(ipcMain);
registerReadProjectMetadata(ipcMain);
registerReadProjectConfigs(ipcMain);
registerReadProjectData(ipcMain);
registerReadProjectTexts(ipcMain);
registerReadCsvFile(ipcMain);
registerMigrateData(ipcMain);
registerFileExists(ipcMain);
registerChooseFolder(ipcMain);
registerExtractNewProject(ipcMain);
registerConfigureNewProject(ipcMain);
registerSaveProjectData(ipcMain);
registerSaveProjectConfigs(ipcMain);
registerSaveProjectTexts(ipcMain);
registerProjectStudioFile(ipcMain);
registerChooseFile(ipcMain);
registerShowItemInFolder(ipcMain);
registerCopyFile(ipcMain);
registerUpdateTextInfos(ipcMain);
registerSaveTextInfos(ipcMain);
registerOpenStudioLogsFolder(ipcMain);
registerCheckMapsModified(ipcMain);
registerConvertTiledMapToTileMetadata(ipcMain);
registerSaveMapInfo(ipcMain);
registerStartupStudioFile(ipcMain);
registerGetFilePathsFromFolder(ipcMain);
registerCopyTiledFiles(ipcMain);
registerRMXP2StudioMapsSync(ipcMain);
registerReadRMXPMapInfo(ipcMain);
registerReadRMXPMap(ipcMain);
registerReadMaps(ipcMain);
registerSaveRMXPMapInfo(ipcMain);
registerOpenTiled(ipcMain);
registerDownloadFile(ipcMain);
registerRequestJson(ipcMain);
registerCheckDownloadNewProject(ipcMain);

ipcMain.on('get-md5-hash', (event, value: string) => (event.returnValue = crypto.createHash('md5').update(value, 'utf8').digest().toString('hex')));
app.whenReady().then(createWindow).catch(log.error);

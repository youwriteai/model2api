/* eslint-disable no-console */
/* eslint-disable import/no-cycle */
/* eslint-disable new-cap */
/* eslint-disable no-use-before-define */
/* eslint-disable import/first */
/* eslint-disable no-plusplus */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-case-declarations */
/* eslint-disable import/no-mutable-exports */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

import fs from 'fs/promises';
import fss from 'fs';
import path from 'path';

// import { OggOpusDecoder } from 'ogg-opus-decoder';
import Models from '../consts/models';
import { DefaultSettings } from './services/types';

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

const exePath = process.argv[0];

const homePath = isDevelopment
  ? path.join(process.cwd(), './release/app/dist')
  : path.join(exePath, '..');

export const tempPath = path.join(homePath, './temp');

try {
  fss.statSync(tempPath);
} catch {
  fss.mkdirSync(tempPath);
}

export const modelsDir = path.join(homePath, './models');

export const configPath = path.join(homePath, './config.json');

// eslint-disable-next-line prefer-const
export let defaultSettings: DefaultSettings = {
  port: 3005,
  activeLimit: 4,
  queuedLimit: -1,
  gui: true,
  starting: ['embeddings'],
  servicesConfig: {
    embeddings: {
      selectedModel: Models[0],
      modelAliases: {
        'gpt*': 0,
      },
    },
    whisper: {
      modelAliases: {
        'whisper-*': 0,
      },
    },
  },
};

export async function getConfig() {
  try {
    await fs.stat(configPath);
    return JSON.parse(
      await fs.readFile(configPath, 'utf8')
    ) as typeof defaultSettings;
  } catch {
    await fs.writeFile(
      configPath,
      JSON.stringify(defaultSettings, null, 2),
      'utf8'
    );
    return defaultSettings;
  }
}

export async function saveConfig(newConf: Partial<DefaultSettings>) {
  const oldConf = await getConfig();

  await fs.writeFile(
    configPath,
    JSON.stringify(
      {
        ...oldConf,
        ...newConf,
      },
      null,
      2
    ),
    'utf8'
  );
}

// eslint-disable-next-line import/prefer-default-export
export async function getAvailableModels() {
  const folderPaths: Record<string, true> = {};
  try {
    const absoluteRootDir = path.resolve(modelsDir); // Ensure we have an absolute path

    const items = await fs.readdir(absoluteRootDir);

    for (const item of items) {
      const itemsPath = path.join(absoluteRootDir, item);
      const items2 = await fs.readdir(itemsPath);

      for (const item2 of items2) {
        folderPaths[`${item}/${item2}`] = true;
      }
    }
  } catch {
    console.log('nothing here');
  }

  return folderPaths;
}

const { platform } = process;

export async function tryGussingFfmpegLoc() {
  const listofPossiblePaths: string[] = [];

  if (platform === 'win32') {
    const paths = (process.env.path || '')?.split(';');
    paths.forEach((p) => {
      if (
        p.toLowerCase().includes(`ffmpeg`) &&
        p.toLowerCase().includes(`bin`)
      ) {
        listofPossiblePaths.push(path.join(p, './ffmpeg.exe'));
      }
    });
  } else {
    const { default: ffmpegPath } = await import('@ffmpeg-installer/ffmpeg');
    listofPossiblePaths.push(
      ffmpegPath.path?.replace('app.asar', 'app.asar.unpacked') ||
        `/usr/bin/ffmpeg`
    );
  }
  return listofPossiblePaths[0];
}

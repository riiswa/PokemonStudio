import { linkResourcesToCreatures } from '@src/migrations/linkResourcesToCreatures';
import { migrateMapLinks } from '@src/migrations/migrateMapLinks';
import { IpcMainEvent, IpcMain } from 'electron';
import log from 'electron-log';

export type MigrationTask = (event: IpcMainEvent, projectPath: string) => Promise<void>;

const MIGRATIONS: Record<string, MigrationTask[]> = {
  '1.0.0': [migrateMapLinks, linkResourcesToCreatures], // Don't forget to extend those array with the new tasks that gets added by the time!
  '1.0.1': [migrateMapLinks, linkResourcesToCreatures],
  '1.0.2': [migrateMapLinks, linkResourcesToCreatures],
  '1.1.0': [linkResourcesToCreatures],
  '1.1.1': [linkResourcesToCreatures],
  '1.2.0': [linkResourcesToCreatures],
  '1.3.0': [linkResourcesToCreatures], // Don't forget to add the official version coming up
};

const MIGRATION_STEP_TEXTS: Record<string, string[]> = {
  '1.0.0': ['Migrate MapLinks', 'Link the resources to the Pokémon'], // Don't forget to extend those array with the new tasks that gets added by the time!
  '1.0.1': ['Migrate MapLinks', 'Link the resources to the Pokémon'],
  '1.0.2': ['Migrate MapLinks', 'Link the resources to the Pokémon'],
  '1.1.0': ['Link the resources to the Pokémon'],
  '1.1.1': ['Link the resources to the Pokémon'],
  '1.2.0': ['Link the resources to the Pokémon'],
  '1.3.0': ['Link the resources to the Pokémon'], // Don't forget to add the official version coming up
};

const migrateData = async (event: IpcMainEvent, payload: { projectPath: string; projectVersion: string }) => {
  log.info('migrate-data', payload.projectVersion);
  try {
    const dataToMigrate = MIGRATIONS[payload.projectVersion];
    const stepTexts = MIGRATION_STEP_TEXTS[payload.projectVersion];
    if (dataToMigrate && stepTexts) {
      log.info('migrate-data', `Found ${dataToMigrate.length} migrations`);
      await dataToMigrate.reduce(async (prev, curr, index) => {
        await prev;
        event.sender.send('migrate-data/progress', { step: index + 1, total: dataToMigrate.length, stepText: stepTexts[index] });
        await curr(event, payload.projectPath);
      }, Promise.resolve());
    } else {
      log.info('migrate-data', 'No data to migrate found!');
    }
    log.info('migrate-data/success');
    event.sender.send('migrate-data/success', {});
  } catch (error) {
    log.error('migrate-data/failure', error);
    event.sender.send('migrate-data/failure', { errorMessage: `${error instanceof Error ? error.message : error}` });
  }
};

export const registerMigrateData = (ipcMain: IpcMain) => {
  ipcMain.on('migrate-data', migrateData);
};

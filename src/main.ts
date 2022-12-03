import * as fs from 'fs/promises';
import {existsSync} from 'fs'
import * as path from 'path';
import * as util from 'util';
import {createConnection} from 'mysql';
import {CONFIG} from './configuration';
import {exec, ExecException} from 'child_process';
import {pack} from '7zip-min';
import {SingleBar, Presets, Bar} from 'cli-progress';
const execPromise = util.promisify(exec);

const connection = createConnection({
  host: CONFIG.mysql.host,
  user: CONFIG.mysql.user,
  password: CONFIG.mysql.password,
  database: CONFIG.mysql.database,
});





async function startCreateBackup(compress = true) {
    const currentTimestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFilename = `${CONFIG.mysql.database}-${currentTimestamp}.sql`;
    let pb = new SingleBar({
        format: 'Creating backup file [{bar}] {percentage}% | {value}/{total} | Duration: {duration}s'
    }, Presets.shades_classic);
    let backupFilePath = path.join(__dirname, '../', CONFIG.backupPath, backupFilename);
    try {
        pb.start(1, 0);
        let result = await createBackupFile(backupFilePath);
        
            
        pb.update(1)
        pb.stop();
        if(!compress) {
            console.log('\nBackup created');
            return;
        }

        if (result) {
            try {
                await compressFile(backupFilePath);
            } catch (err) {
                throw err;
            }
        } else {
            throw new Error('Failed to create backup file');
        }
    } catch (err) {
        pb.stop();
        fs.access(backupFilePath).then(() => {
            fs.rm(backupFilePath);
        })
        console.error(`Failed to create backup directory: ${err}`);
        return;
    }

}

async function createBackupFile(backupFilepath: string): Promise<boolean | undefined> {
    let data;
    const mySqlDump = CONFIG.mysqldumpPath ?? 'mysqldump';
    const dumpCommand = `${mySqlDump} --routines --add-drop-table --user=${connection.config.user} --password=${connection.config.password} ${connection.config.database} > ${backupFilepath}`;
    try {
        let {stdout, stderr} = await execPromise(dumpCommand);
    }
    catch (error) {
        throw new Error(`Failed to create database backup: ${error}`);
    }
            if (CONFIG.anonymization.enabled) {
                let anonymizationScript: string;
                if (CONFIG.anonymization.scriptType === 'embedded') anonymizationScript = CONFIG.anonymization.script;

                if (CONFIG.anonymization.scriptType === 'file') {
                    try {
                        anonymizationScript = await fs.readFile(CONFIG.anonymization.scriptPath, 'utf8');
                    } catch(err) {
                        throw new Error(`Failed to read anonymization script: ${err}`);
                    }
                }
                 
                // Write anonymized backup to file
                try {
                    await fs.appendFile(backupFilepath, `\n${anonymizationScript}`);
                    return true;
                } catch (err) {
                    throw new Error(`Failed to write anonymized backup to file: ${err}`);
                }
            } else {
                return true;
            }
}

async function compressFile(filepath: string) {
    let pb = new SingleBar({
        format: 'Compressing backup file [{bar}] {percentage}% | {value}/{total} | Duration: {duration}s'
    }, Presets.shades_classic);
    pb.start(1, 0)
    try {
        await fs.access(filepath);
    } catch (err) {
        console.error(`Failed to read file: ${err}`);
        return;
    }
    const outputFilename = `${path.basename(filepath)}.7z`;
    const outputFilepath = path.join(path.dirname(filepath), outputFilename);
  
        pack(filepath, outputFilepath, (err) => {
            pb.update(1);
            pb.stop();
            console.log('\n')
            if (err) {
                console.error(`Failed to compress file: ${err}`);
            } else {
                console.log(`Compressed file: ${outputFilename}`);
            fs.rm(filepath);
            }
      });
  }



startCreateBackup(false);

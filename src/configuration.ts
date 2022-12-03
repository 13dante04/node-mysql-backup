


export const CONFIG: Config = {
    mysql: {
         host: 'localhost',
         user: 'root',
         password: 'root',
         database: '<db_name>',
    },
    anonymization: {
        enabled: true,
        scriptType: 'file',
        scriptPath : './sql/anonymize.sql',
    },
    backupPath: 'backups',
    mysqldumpPath: null,
}


export interface Config {
    mysql: MySqlConfig;
    mysqldumpPath?: string;
    backupPath: string;
    anonymization: AnonymizationConfig;
}


export interface MySqlConfig { 
    host: string;
    user: string;
    password: string;
    database: string;
}

export interface AnonymizationConfig {
    enabled: boolean;
    scriptType: 'embedded' | 'file';
    script?: string;
    scriptPath?: string;
}
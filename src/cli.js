// Suprimir advertencias de deprecación específicas
process.noDeprecation = true;

const program = require('commander');
const colors = require('colors/safe');
const Config = require('./config/config');
const ScannerFactory = require('./scanners/ScannerFactory');
const { ProxyUtils } = require('./utils/utils');

const nameProject = "Postman Collection Scanner";

// Configurar manejo de advertencias
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, type, code, ...args) => {
    // Suprimir advertencias específicas de NODE_TLS_REJECT_UNAUTHORIZED
    if (typeof warning === 'string' && warning.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
        return;
    }

    // Suprimir advertencias de deprecación DEP0176 (fs.F_OK)
    if (code === 'DEP0176' || (typeof warning === 'string' && warning.includes('DEP0176'))) {
        return;
    }

    // Suprimir todas las advertencias de deprecación si es necesario
    if (type === 'DeprecationWarning') {
        return;
    }

    originalEmitWarning.call(process, warning, type, code, ...args);
};

/**
 * Clase principal de la aplicación CLI
 */
class CollectionScannerCLI {
    constructor() {
        this.config = new Config();
        this.setupCommander();
    }

    /**
     * Configura commander.js con las opciones disponibles
     */
    setupCommander() {
        program
            .version('1.0.0')
            .description(nameProject)
            .option('-c, --collection <type>', 'Path to the Postman collection')
            .option('-e, --environment <type>', 'Path to the Postman environment')
            .option('-A, --authorization <type>', 'Token to use for authentication')
            .option('-x, --proxy <type>', 'Proxy to use for requests (format: http://proxy:port or http://user:pass@proxy:port)')
            .option('-s, --scan <type>', 'Scan type, please choice: {run, extract-urls, no-auth, cors, ratelimit}')
            .option('-r, --response <type>', 'Show response body with character limit (0 = no limit)')
            .option('-t, --threads <type>', 'Number of concurrent threads (default: 1)')
            .option('--repeat <type>', 'Number of times to repeat each request (for ratelimit scan, default: 1)')
            .option('-k, --insecure', 'Allow insecure server connections')
            .option('-v, --verbose', 'Verbose output')
            .action((cmdObj) => {
                this.updateConfigFromCommand(cmdObj);
            })
            .parse(process.argv);
    }

    /**
     * Actualiza la configuración con los valores de línea de comandos
     * @param {Object} cmdObj - Objeto con los valores de commander
     */
    updateConfigFromCommand(cmdObj) {
        this.config.update({
            collectionFile: cmdObj.collection,
            environmentPath: cmdObj.environment,
            token: cmdObj.authorization,
            proxyURL: cmdObj.proxy,
            scanType: cmdObj.scan,
            responseLimit: cmdObj.response ? parseInt(cmdObj.response) : null,
            threads: cmdObj.threads ? parseInt(cmdObj.threads) : 1,
            repeat: cmdObj.repeat ? parseInt(cmdObj.repeat) : 1,
            insecureReq: cmdObj.insecure,
            verbose: cmdObj.verbose
        });
    }

    /**
     * Configura el entorno antes de ejecutar el scanner
     */
    setupEnvironment() {
        // Configurar conexiones inseguras si se especifica
        if (this.config.insecureReq) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        }

        // Configurar proxy
        ProxyUtils.setupProxy(this.config.proxyURL, this.config.verbose);
    }

    /**
     * Valida la configuración antes de ejecutar
     * @returns {boolean} - true si la configuración es válida
     */
    validateConfig() {
        const validation = this.config.validate();

        if (!validation.isValid) {
            console.error(colors.red('[ERROR] Configuración inválida:'));
            validation.errors.forEach(error => {
                console.error(colors.red(`  - ${error}`));
            });
            return false;
        }

        return true;
    }

    /**
     * Muestra información de debug si está habilitada
     */
    displayDebugInfo() {
        if (this.config.verbose || this.config.proxyURL || this.config.threads > 1) {
            this.config.display();
        }
    }

    /**
     * Maneja errores de tipo de scanner inválido
     */
    handleInvalidScanType() {
        console.log(`${colors.red("[!] Invalid scan type")}, ${colors.yellow("please run command with --help flag to see available options")}`);
        console.log(colors.cyan("Available scan types:"));
        ScannerFactory.getAvailableScanTypes().forEach(type => {
            console.log(colors.cyan(`  - ${type}`));
        });
    }

    /**
     * Ejecuta el scanner especificado
     */
    async executeScanner() {
        try {
            const scanner = ScannerFactory.createScanner(this.config.scanType, this.config);

            console.log(colors.green(`>>> Running collection scanner: ${this.config.scanType}`));

            if (this.config.threads > 1) {
                console.log(colors.yellow(`>>> Using ${this.config.threads} parallel threads`));
            }

            if (this.config.proxyURL && this.config.verbose) {
                console.log(colors.yellow(`>>> Using proxy: ${this.config.proxyURL}`));
            }

            await scanner.run();

        } catch (error) {
            if (error.message.includes('Unknown scan type')) {
                this.handleInvalidScanType();
            } else {
                console.error(colors.red(`[ERROR] ${error.message}`));
                if (this.config.verbose) {
                    console.error(error.stack);
                }
            }
        }
    }

    /**
     * Ejecuta la aplicación principal
     */
    async run() {
        console.log(colors.bold("[+] Running " + nameProject + "\n"));

        // Validar configuración
        if (!this.validateConfig()) {
            process.exit(1);
        }

        // Configurar entorno
        this.setupEnvironment();

        // Mostrar información de debug
        this.displayDebugInfo();

        // Ejecutar scanner
        await this.executeScanner();
    }
}

// Función principal
async function main() {
    const cli = new CollectionScannerCLI();
    await cli.run();
}

// Ejecutar si este archivo es llamado directamente
if (require.main === module) {
    main().catch(error => {
        console.error(colors.red(`[FATAL ERROR] ${error.message}`));
        process.exit(1);
    });
}

module.exports = CollectionScannerCLI;
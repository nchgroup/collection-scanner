/**
 * Configuración centralizada de la aplicación
 */
const path = require('path');

class Config {
    constructor() {
        this.collectionFile = "";
        this.environmentPath = "";
        this.token = "";
        this.proxyURL = "";
        this.scanType = "";
        this.insecureReq = false;
        this.verbose = false;
        this.responseLimit = null;
        this.threads = 1;
        this.repeat = 1;
    }

    /**
     * Actualiza la configuración con los valores proporcionados
     * @param {Object} options - Opciones de configuración
     */
    update(options) {
        Object.keys(options).forEach(key => {
            if (this.hasOwnProperty(key)) {
                this[key] = options[key];
            }
        });
    }

    /**
     * Valida la configuración actual
     * @returns {Object} - Resultado de la validación
     */
    validate() {
        const errors = [];

        if (!this.collectionFile) {
            errors.push('Collection file is required');
        }

        if (!this.scanType) {
            errors.push('Scan type is required');
        }

        const validScanTypes = ['run', 'extract-urls', 'no-auth', 'cors', 'ratelimit'];
        if (this.scanType && !validScanTypes.includes(this.scanType)) {
            errors.push(`Invalid scan type. Valid types: ${validScanTypes.join(', ')}`);
        }

        if (this.threads < 1) {
            errors.push('Threads must be at least 1');
        }

        if (this.repeat < 1) {
            errors.push('Repeat must be at least 1');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Obtiene la configuración de Newman
     * @returns {Object} - Configuración para Newman
     */
    getNewmanConfig() {
        const config = {
            collection: require(path.resolve(this.collectionFile)),
            insecure: this.insecureReq,
            verbose: this.verbose
        };

        if (this.environmentPath) {
            config.environment = this.environmentPath;
        }

        return config;
    }

    /**
     * Muestra la configuración actual (para debug)
     */
    display() {
        const colors = require('colors/safe');
        console.log(colors.cyan("[DEBUG] Configuración:"));
        console.log(colors.cyan(`  - Collection: ${this.collectionFile}`));
        console.log(colors.cyan(`  - Environment: ${this.environmentPath}`));
        console.log(colors.cyan(`  - Proxy: ${this.proxyURL || 'No configurado'}`));
        console.log(colors.cyan(`  - Scan Type: ${this.scanType}`));
        console.log(colors.cyan(`  - Threads: ${this.threads}`));
        console.log(colors.cyan(`  - Repeat: ${this.repeat}`));
        console.log(colors.cyan(`  - Insecure: ${this.insecureReq}`));
        console.log(colors.cyan(`  - Response Limit: ${this.responseLimit !== null ? (this.responseLimit === 0 ? 'Sin límite' : this.responseLimit + ' caracteres') : 'Deshabilitado'}`));
        console.log("");
    }
}

module.exports = Config;
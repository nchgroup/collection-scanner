const RunScanner = require('./RunScanner');
const ExtractUrlScanner = require('./ExtractUrlScanner');
const NoAuthScanner = require('./NoAuthScanner');
const CorsScanner = require('./CorsScanner');
const RateLimitScanner = require('./RateLimitScanner');

/**
 * Factory para crear scanners según el tipo especificado
 */
class ScannerFactory {
    /**
     * Crea una instancia del scanner apropiado
     * @param {string} scanType - Tipo de scanner
     * @param {Config} config - Configuración de la aplicación
     * @returns {BaseScanner} - Instancia del scanner
     */
    static createScanner(scanType, config) {
        const scannerMap = {
            'run': RunScanner,
            'extract-urls': ExtractUrlScanner,
            'no-auth': NoAuthScanner,
            'cors': CorsScanner,
            'ratelimit': RateLimitScanner
        };

        const ScannerClass = scannerMap[scanType];

        if (!ScannerClass) {
            throw new Error(`Unknown scan type: ${scanType}`);
        }

        return new ScannerClass(config);
    }

    /**
     * Obtiene la lista de tipos de scanner disponibles
     * @returns {Array} - Array de tipos de scanner
     */
    static getAvailableScanTypes() {
        return ['run', 'extract-urls', 'no-auth', 'cors', 'ratelimit'];
    }
}

module.exports = ScannerFactory;
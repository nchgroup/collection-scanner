/**
 * Archivo índice principal para facilitar las importaciones
 */

// Configuración
const Config = require('./config/config');

// Utilidades
const {
    ResponseUtils,
    CollectionUtils,
    ConcurrencyUtils,
    ProxyUtils,
    HeaderUtils
} = require('./utils/utils');

// Core
const BaseScanner = require('./core/BaseScanner');

// Scanners
const RunScanner = require('./scanners/RunScanner');
const ExtractUrlScanner = require('./scanners/ExtractUrlScanner');
const NoAuthScanner = require('./scanners/NoAuthScanner');
const CorsScanner = require('./scanners/CorsScanner');
const RateLimitScanner = require('./scanners/RateLimitScanner');
const ScannerFactory = require('./scanners/ScannerFactory');

// CLI
const CollectionScannerCLI = require('./cli');

module.exports = {
    // Configuración
    Config,

    // Utilidades
    ResponseUtils,
    CollectionUtils,
    ConcurrencyUtils,
    ProxyUtils,
    HeaderUtils,

    // Core
    BaseScanner,

    // Scanners
    RunScanner,
    ExtractUrlScanner,
    NoAuthScanner,
    CorsScanner,
    RateLimitScanner,
    ScannerFactory,

    // CLI
    CollectionScannerCLI
};
const newman = require('newman');
const colors = require('colors/safe');
const { ResponseUtils, CollectionUtils, ConcurrencyUtils, HeaderUtils } = require('../utils/utils');

/**
 * Clase base para todos los scanners
 */
class BaseScanner {
    constructor(config) {
        this.config = config;
    }

    /**
     * Ejecuta el scanner
     * @abstract
     */
    async run() {
        throw new Error('run() method must be implemented by subclass');
    }

    /**
     * Ejecuta requests usando threads o de forma secuencial
     * @param {Array} requests - Array de requests
     * @param {Function} requestHandler - Función para manejar cada request
     */
    async executeRequests(requests, requestHandler) {
        if (this.config.threads <= 1) {
            // Ejecución secuencial con newman tradicional
            await this.executeSequential();
        } else {
            // Ejecución paralela con threads
            console.log(colors.cyan(`[INFO] Ejecutando ${requests.length} requests con ${this.config.threads} threads paralelos\n`));
            await ConcurrencyUtils.executeRequestsWithThreads(requests, requestHandler, this.config.threads);
            console.log(colors.green('\n[✓] Ejecución paralela completada'));
        }
    }

    /**
     * Ejecución secuencial tradicional con newman
     * @abstract
     */
    async executeSequential() {
        throw new Error('executeSequential() method must be implemented by subclass');
    }

    /**
     * Crea un handler para requests individuales en modo paralelo
     * @param {Object} collection - Colección original
     * @param {Function} onRequestCallback - Callback para manejar cada request
     * @returns {Function} - Handler function
     */
    createRequestHandler(collection, onRequestCallback) {
        return async (requestItem) => {
            return new Promise((resolve, reject) => {
                const singleRequestCollection = CollectionUtils.createSingleRequestCollection(collection, requestItem);

                newman.run({
                    collection: singleRequestCollection,
                    environment: this.config.environmentPath,
                    insecure: this.config.insecureReq,
                    verbose: false
                })
                    .on('request', (err, args) => {
                        if (err) {
                            console.error(`[-] Error en la solicitud: ${err}`);
                            resolve();
                            return;
                        }
                        if (!args.response) {
                            console.log(`[-] No se recibió ninguna respuesta para ${requestItem.name}`);
                            resolve();
                            return;
                        }

                        onRequestCallback(err, args, requestItem);
                    })
                    .on('done', () => {
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error(`[-] Error: ${err}`);
                        resolve();
                    });
            });
        };
    }

    /**
     * Modifica headers de autorización
     * @param {Array} headers - Headers originales
     * @returns {Array} - Headers modificados
     */
    modifyAuthHeaders(headers) {
        // Filtrar headers de autorización existentes
        const filteredHeaders = HeaderUtils.filterAuthorizationHeaders(headers);

        if (!Array.isArray(filteredHeaders)) {
            return [];
        }

        // Agregar token personalizado si se proporciona
        HeaderUtils.addAuthorizationHeader(filteredHeaders, this.config.token);

        return filteredHeaders;
    }

    /**
     * Muestra el response body si está habilitado
     * @param {*} responseStream - Stream de respuesta
     * @param {string} indent - Indentación
     */
    displayResponseBody(responseStream, indent = '\t\t') {
        ResponseUtils.displayResponseBody(responseStream, this.config.responseLimit, indent);
    }

    /**
     * Obtiene la configuración de Newman
     * @returns {Object} - Configuración de Newman
     */
    getNewmanConfig() {
        return this.config.getNewmanConfig();
    }
}

module.exports = BaseScanner;
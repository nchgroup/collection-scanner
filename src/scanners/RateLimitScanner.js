const newman = require('newman');
const colors = require('colors/safe');
const path = require('path');
const BaseScanner = require('../core/BaseScanner');
const { CollectionUtils } = require('../utils/utils');

/**
 * Scanner para pruebas de rate limit
 */
class RateLimitScanner extends BaseScanner {
    constructor(config) {
        super(config);
    }

    async run() {
        const collectionPath = path.resolve(this.config.collectionFile);
        const collection = require(collectionPath);
        const requests = CollectionUtils.extractRequestsFromCollection(collection);

        console.log(colors.cyan(`[INFO] Probando rate limit en ${requests.length} endpoints con ${this.config.repeat} repeticiones por endpoint`));

        if (this.config.threads > 1) {
            console.log(colors.cyan(`[INFO] Usando ${this.config.threads} threads paralelos para las repeticiones de cada endpoint\n`));
        } else {
            console.log(colors.cyan(`[INFO] Ejecución secuencial\n`));
        }

        // Procesar endpoints de forma secuencial
        for (const requestItem of requests) {
            await this.processEndpoint(collection, requestItem);
        }

        console.log(colors.green('\n[+] Prueba de rate limit completada'));
    }

    async processEndpoint(collection, requestItem) {
        console.log(colors.yellow(`\n>>> Probando endpoint: ${requestItem.fullName}`));
        const responseTimesList = [];
        let rateLimitDetected = false;
        const endpointStats = {
            startTime: null,
            endTime: null,
            endpoint: null,
            method: null,
            url: null
        };

        if (this.config.threads <= 1) {
            await this.processEndpointSequential(collection, requestItem, responseTimesList, rateLimitDetected, endpointStats);
        } else {
            await this.processEndpointParallel(collection, requestItem, responseTimesList, rateLimitDetected, endpointStats);
        }

        this.displayEndpointStatistics(requestItem, responseTimesList, rateLimitDetected, endpointStats);
    }

    async processEndpointSequential(collection, requestItem, responseTimesList, rateLimitDetected, endpointStats) {
        for (let i = 1; i <= this.config.repeat; i++) {
            if (rateLimitDetected) break;

            const result = await this.executeRequest(collection, requestItem, i);

            // Capturar información del primer request
            if (i === 1 && result.requestInfo) {
                endpointStats.startTime = result.requestInfo.startTime;
                endpointStats.endpoint = result.requestInfo.endpoint;
                endpointStats.method = result.requestInfo.method;
                endpointStats.url = result.requestInfo.url;
            }

            // Actualizar hora final en cada request exitoso
            if (result.requestInfo) {
                endpointStats.endTime = result.requestInfo.endTime;
            }

            if (result.responseTime && result.success) {
                responseTimesList.push(result.responseTime);
            }

            if (result.rateLimited) {
                rateLimitDetected = true;
                break;
            }
        }
    }

    async processEndpointParallel(collection, requestItem, responseTimesList, rateLimitDetected, endpointStats) {
        console.log(colors.cyan(`\tEjecutando ${this.config.repeat} repeticiones con ${this.config.threads} threads paralelos`));

        // Crear array de tareas para las repeticiones
        const repeatTasks = Array.from({ length: this.config.repeat }, (_, i) => i + 1);

        // Función para manejar cada repetición
        const repeatHandler = async (repeatIndex) => {
            if (rateLimitDetected) {
                return { skipped: true };
            }

            return await this.executeRequest(collection, requestItem, repeatIndex);
        };

        // Ejecutar las repeticiones en paralelo con control de concurrencia
        const results = await Promise.all(
            Array.from({ length: Math.min(this.config.threads, this.config.repeat) }, async (_, threadIndex) => {
                const taskResults = [];
                for (let i = threadIndex; i < repeatTasks.length; i += this.config.threads) {
                    if (rateLimitDetected) break;

                    const result = await repeatHandler(repeatTasks[i]);
                    taskResults.push(result);

                    // Capturar información del primer request
                    if (repeatTasks[i] === 1 && result.requestInfo) {
                        endpointStats.startTime = result.requestInfo.startTime;
                        endpointStats.endpoint = result.requestInfo.endpoint;
                        endpointStats.method = result.requestInfo.method;
                        endpointStats.url = result.requestInfo.url;
                    }

                    // Actualizar hora final en cada request exitoso
                    if (result.requestInfo) {
                        endpointStats.endTime = result.requestInfo.endTime;
                    }

                    if (result.responseTime && result.success) {
                        responseTimesList.push(result.responseTime);
                    }

                    if (result.rateLimited) {
                        rateLimitDetected = true;
                        break;
                    }
                }
                return taskResults;
            })
        );
    }

    async executeRequest(collection, requestItem, repeatIndex) {
        return new Promise((resolve) => {
            const singleRequestCollection = CollectionUtils.createSingleRequestCollection(collection, requestItem);
            const startTime = Date.now();

            newman.run({
                collection: singleRequestCollection,
                environment: this.config.environmentPath,
                insecure: this.config.insecureReq,
                verbose: false
            })
                .on('request', (err, args) => {
                    if (err) {
                        console.error(`[${repeatIndex}/${this.config.repeat}] Error en la solicitud: ${err}`);
                        resolve({ error: true });
                        return;
                    }

                    if (!args.response) {
                        console.log(`[${repeatIndex}/${this.config.repeat}] No se recibió ninguna respuesta`);
                        resolve({ error: true });
                        return;
                    }

                    const endTime = Date.now();
                    const responseTime = endTime - startTime;

                    // Información del request para estadísticas
                    const requestInfo = {
                        startTime: startTime,
                        endTime: endTime,
                        endpoint: `${args.request.method} ${args.request.url}`,
                        method: args.request.method,
                        url: args.request.url
                    };

                    console.log(`[${repeatIndex}/${this.config.repeat}] ${args.request.method} ${args.request.url} - ${args.response.code} ${args.response.status} (${responseTime}ms)`);

                    // Verificar si es 429 (Too Many Requests) - Rate limit activado
                    if (args.response.code === 429) {
                        console.log(colors.red(`\t[-] RATE LIMIT DETECTADO - Endpoint bloqueado por exceso de solicitudes`));
                        console.log(colors.yellow(`\t--> Pasando al siguiente endpoint...`));
                        resolve({ rateLimited: true, responseTime, requestInfo });
                        return;
                    }

                    // Mostrar response body si la opción -r está habilitada
                    this.displayResponseBody(args.response.stream, `[${repeatIndex}/${this.config.repeat}] `);

                    resolve({ responseTime, success: true, requestInfo });
                })
                .on('done', () => {
                    // El resolve ya se llamó en el 'request' event
                })
                .on('error', (err) => {
                    console.error(`[${repeatIndex}/${this.config.repeat}] Error: ${err}`);
                    resolve({ error: true });
                });
        });
    }

    displayEndpointStatistics(requestItem, responseTimesList, rateLimitDetected, endpointStats) {
        if (rateLimitDetected) {
            console.log(colors.red(`>>> ${requestItem.fullName}: RATE LIMIT ACTIVADO - No se completaron todas las repeticiones`));
        } else if (responseTimesList.length > 0) {
            const avgTime = responseTimesList.reduce((a, b) => a + b, 0) / responseTimesList.length;
            const minTime = Math.min(...responseTimesList);
            const maxTime = Math.max(...responseTimesList);

            console.log(colors.green(`>>> Estadísticas de ${requestItem.fullName}:`));
            console.log(colors.cyan(`\tTotal de solicitudes completadas: ${responseTimesList.length}/${this.config.repeat}`));
            console.log(colors.cyan(`\tTiempo promedio: ${avgTime.toFixed(2)}ms`));
            console.log(colors.cyan(`\tTiempo mínimo: ${minTime}ms`));
            console.log(colors.cyan(`\tTiempo máximo: ${maxTime}ms`));

            // Mostrar información de timing del endpoint
            if (endpointStats.startTime && endpointStats.endTime && endpointStats.endpoint) {
                const startTimeFormatted = new Date(endpointStats.startTime).toISOString();
                const endTimeFormatted = new Date(endpointStats.endTime).toISOString();

                console.log(colors.yellow(`\tHora inicial: ${startTimeFormatted}`));
                console.log(colors.yellow(`\tHora final: ${endTimeFormatted}`));
                console.log(colors.yellow(`\tEndpoint: curl -X ${endpointStats.method} "${endpointStats.url}"`));
            }
        }
    }

    // Rate limit scanner no usa ejecución secuencial tradicional
    async executeSequential() {
        throw new Error('RateLimitScanner uses custom sequential processing');
    }
}

module.exports = RateLimitScanner;
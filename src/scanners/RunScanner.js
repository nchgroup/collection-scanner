const newman = require('newman');
const colors = require('colors/safe');
const path = require('path');
const BaseScanner = require('../core/BaseScanner');
const { CollectionUtils, ResponseUtils } = require('../utils/utils');

/**
 * Scanner para ejecución normal de la colección
 */
class RunScanner extends BaseScanner {
    constructor(config) {
        super(config);
    }

    async run() {
        const collectionPath = path.resolve(this.config.collectionFile);
        const collection = require(collectionPath);
        const requests = CollectionUtils.extractRequestsFromCollection(collection);

        await this.executeRequests(requests, this.createRequestHandler(collection, this.handleRequest.bind(this)));
    }

    async executeSequential() {
        newman.run(this.getNewmanConfig())
            .on('start', (err, args) => {
                if (err) {
                    console.error('Error al iniciar: ', err);
                    return;
                }
            })
            .on('request', (err, args) => {
                this.handleRequest(err, args);
            });
    }

    handleRequest(err, args, requestItem = null) {
        if (err) {
            console.error('Error en la solicitud: ', err);
            return;
        }
        if (!args.response) {
            console.log('No se recibió ninguna respuesta');
            return;
        }

        const method = args.request.method;
        const url = args.request.url.toString();
        const responseCode = args.response.code;
        const responseStatus = args.response.status;

        if (this.config.jsonOutput && this.config.reporter) {
            const name = requestItem ? requestItem.name : (args.item ? args.item.name : url);
            const fullName = requestItem ? requestItem.fullName : name;

            this.config.reporter.addFinding({
                endpoint: { name, full_name: fullName, method, url },
                result: {
                    status: 'info',
                    http_code: responseCode,
                    http_status: responseStatus
                },
                response: ResponseUtils.getResponseBody(args.response.stream, this.config.responseLimit)
            });
            return;
        }

        console.log(`> ${method} ${url} - ${responseCode} ${responseStatus}`);

        // Mostrar response body si la opción -r está habilitada
        this.displayResponseBody(args.response.stream);
    }
}

module.exports = RunScanner;
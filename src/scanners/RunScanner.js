const newman = require('newman');
const colors = require('colors/safe');
const path = require('path');
const BaseScanner = require('../core/BaseScanner');
const { CollectionUtils } = require('../utils/utils');

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

        console.log(`> ${args.request.method} ${args.request.url} - ${args.response.code} ${args.response.status}`);

        // Mostrar response body si la opción -r está habilitada
        this.displayResponseBody(args.response.stream);
    }
}

module.exports = RunScanner;
const newman = require('newman');
const colors = require('colors/safe');
const path = require('path');
const BaseScanner = require('../core/BaseScanner');
const { CollectionUtils, HeaderUtils } = require('../utils/utils');

/**
 * Scanner para pruebas CORS
 */
class CorsScanner extends BaseScanner {
    constructor(config) {
        super(config);
    }

    async run() {
        const collectionPath = path.resolve(this.config.collectionFile);
        const collection = require(collectionPath);
        const requests = CollectionUtils.extractRequestsFromCollection(collection);

        console.log(colors.cyan(`[INFO] Probando CORS en ${requests.length} endpoints con ${this.config.threads} threads paralelos\n`));

        await this.executeRequests(requests, this.createRequestHandler(collection, this.handleRequest.bind(this)));
    }

    async executeSequential() {
        newman.run(this.getNewmanConfig())
            .on('request', (err, args) => {
                this.handleRequest(err, args);
            });
    }

    handleRequest(err, args, requestItem = null) {
        if (err) {
            console.error('Error en la solicitud: ', err);
            return;
        }

        // Modificar el header Origin y autorización
        args.request.headers = HeaderUtils.modifyOriginHeader(args.request.headers, "https://evil.tld");
        args.request.headers = this.modifyAuthHeaders(args.request.headers);

        if (!args.response) {
            console.log('[-] No se recibió ninguna respuesta');
            return;
        }

        const corsHeader = HeaderUtils.findHeader(args.response.headers, 'access-control-allow-origin');

        if (corsHeader && corsHeader.value === 'https://evil.tld') {
            console.log(colors.green(`+ Potencial CORS en el endpoint: ${args.request.url}`));
            this.displayResponseBody(args.response.stream);
        } else {
            const prefix = this.config.threads > 1 ? '\t\t' : '';
            console.log(colors.red(`${prefix}- No se encontró CORS en el endpoint: ${args.request.url}`));
            this.displayResponseBody(args.response.stream);
        }
    }
}

module.exports = CorsScanner;
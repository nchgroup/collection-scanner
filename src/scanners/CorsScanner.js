const newman = require('newman');
const colors = require('colors/safe');
const path = require('path');
const BaseScanner = require('../core/BaseScanner');
const { CollectionUtils, HeaderUtils, ResponseUtils } = require('../utils/utils');

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

        if (!this.config.jsonOutput) {
            console.log(colors.cyan(`[INFO] Probando CORS en ${requests.length} endpoints con ${this.config.threads} threads paralelos\n`));
        }

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

        const TEST_ORIGIN = 'https://evil.tld';

        // Modificar el header Origin y autorización
        args.request.headers = HeaderUtils.modifyOriginHeader(args.request.headers, TEST_ORIGIN);
        args.request.headers = this.modifyAuthHeaders(args.request.headers);

        if (!args.response) {
            console.log('[-] No se recibió ninguna respuesta');
            return;
        }

        const corsHeader = HeaderUtils.findHeader(args.response.headers, 'access-control-allow-origin');
        const isVulnerable = corsHeader && corsHeader.value === TEST_ORIGIN;

        if (this.config.jsonOutput && this.config.reporter) {
            const method = args.request.method;
            const url = args.request.url.toString();
            const name = requestItem ? requestItem.name : (args.item ? args.item.name : url);
            const fullName = requestItem ? requestItem.fullName : name;
            const responseCode = args.response.code;
            const responseStatus = args.response.status;

            this.config.reporter.addFinding({
                endpoint: { name, full_name: fullName, method, url },
                result: {
                    status: isVulnerable ? 'vulnerable' : 'protected',
                    severity: isVulnerable ? 'high' : 'none',
                    type: 'CORS_MISCONFIGURATION',
                    description: isVulnerable
                        ? `Server reflects attacker-controlled origin in Access-Control-Allow-Origin header`
                        : `No CORS misconfiguration detected`,
                    test_origin: TEST_ORIGIN,
                    reflected_origin: isVulnerable ? corsHeader.value : null,
                    http_code: responseCode,
                    http_status: responseStatus
                },
                response: ResponseUtils.getResponseBody(args.response.stream, this.config.responseLimit)
            });
            return;
        }

        if (isVulnerable) {
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
const newman = require('newman');
const colors = require('colors/safe');
const path = require('path');
const BaseScanner = require('../core/BaseScanner');
const { CollectionUtils } = require('../utils/utils');

/**
 * Scanner para pruebas sin autenticación
 */
class NoAuthScanner extends BaseScanner {
    constructor(config) {
        super(config);
    }

    async run() {
        const collectionPath = path.resolve(this.config.collectionFile);
        const collection = require(collectionPath);
        const requests = CollectionUtils.extractRequestsFromCollection(collection);

        console.log(colors.cyan(`[INFO] Probando ${requests.length} endpoints sin autenticación con ${this.config.threads} threads paralelos\n`));

        await this.executeRequests(requests, this.createRequestHandler(collection, this.handleRequest.bind(this)));
    }

    async executeSequential() {
        newman.run(this.getNewmanConfig())
            .on('start', (err, args) => {
                if (err) {
                    console.error(`Error al iniciar: ${err}`);
                    return;
                }
            })
            .on('request', (err, args) => {
                this.handleRequest(err, args);
            });
    }

    handleRequest(err, args, requestItem = null) {
        if (err) {
            console.error(`Error en la respuesta: ${err}`);
            return;
        }

        // Modificar headers de autorización
        args.request.headers = this.modifyAuthHeaders(args.request.headers);

        if (!args.response) {
            console.log('[-] No se recibió ninguna respuesta');
            return;
        }

        const responseCode = args.response.code;
        const responseStatus = args.response.status;

        // En el contexto de no-auth, códigos como 401, 403 son "buenos" resultados
        if (responseCode === 401 || responseCode === 403) {
            console.log(colors.green(`+ ${responseCode} ${responseStatus}`));
            this.displayCurlCommand(args);
            this.displayResponseBody(args.response.stream, '\t\t');
        } else if (responseCode >= 200 && responseCode < 300) {
            // Códigos 2xx son "malos" en este contexto porque indican acceso sin auth
            console.log(colors.red(`- ${responseCode} ${responseStatus}`));
            this.displayCurlCommand(args);
            this.displayResponseBody(args.response.stream, '\t\t');
        } else {
            // Otros códigos de error (4xx, 5xx excepto 401/403)
            console.log(colors.yellow(`? ${responseCode} ${responseStatus}`));
            this.displayCurlCommand(args);
            this.displayResponseBody(args.response.stream, '\t\t');
        }
    }

    displayCurlCommand(args) {
        const authHeader = args.request.headers.find(header => header.key.toLowerCase() === 'authorization');

        if (authHeader && authHeader.value !== "") {
            console.log(`\tcurl -X ${args.request.method} ${args.request.url.toString()} -H "Authorization: ${authHeader.value}"`);
        } else {
            console.log(`\tcurl -X ${args.request.method} ${args.request.url.toString()}`);
        }
    }
}

module.exports = NoAuthScanner;
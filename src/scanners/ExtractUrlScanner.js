const newman = require('newman');
const colors = require('colors/safe');
const path = require('path');
const BaseScanner = require('../core/BaseScanner');
const { CollectionUtils } = require('../utils/utils');

/**
 * Scanner para extracción de URLs de la colección
 */
class ExtractUrlScanner extends BaseScanner {
    constructor(config) {
        super(config);
        this.uniqueUrls = {};
    }

    async run() {
        const collectionPath = path.resolve(this.config.collectionFile);
        const collection = require(collectionPath);
        const requests = CollectionUtils.extractRequestsFromCollection(collection);

        await this.executeRequests(requests, this.createRequestHandler(collection, this.handleRequest.bind(this)));

        // Mostrar resultados finales
        this.displayResults();
    }

    async executeSequential() {
        newman.run(this.getNewmanConfig())
            .on('request', (err, args) => {
                this.handleRequest(err, args);
            })
            .once('done', () => {
                this.displayResults();
            });
    }

    handleRequest(err, args, requestItem = null) {
        if (err) {
            console.error('Error en la solicitud: ', err);
            return;
        }

        const url = args.request.url.toString();
        this.uniqueUrls[url] = (this.uniqueUrls[url] || 0) + 1;
    }

    displayResults() {
        const urls = Object.keys(this.uniqueUrls);

        if (this.config.threads > 1) {
            console.log(colors.green('\n[+] Extracción de URLs completada:'));
        }

        urls.forEach(url => console.info(`[+] ${url}`));
    }
}

module.exports = ExtractUrlScanner;
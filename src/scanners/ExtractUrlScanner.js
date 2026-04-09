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
        const method = args.request.method;
        const name = requestItem ? requestItem.name : (args.item ? args.item.name : url);
        const fullName = requestItem ? requestItem.fullName : name;

        if (!this.uniqueUrls[url]) {
            this.uniqueUrls[url] = { method, name, fullName, count: 0 };
        }
        this.uniqueUrls[url].count++;
    }

    displayResults() {
        const urls = Object.keys(this.uniqueUrls);

        if (this.config.jsonOutput && this.config.reporter) {
            urls.forEach(url => {
                const entry = this.uniqueUrls[url];
                this.config.reporter.addFinding({
                    endpoint: {
                        name: entry.name,
                        full_name: entry.fullName,
                        method: entry.method,
                        url
                    },
                    result: {
                        status: 'info',
                        type: 'URL_DISCOVERED',
                        description: 'Endpoint discovered in collection'
                    }
                });
            });
            return;
        }

        if (this.config.threads > 1) {
            console.log(colors.green('\n[+] Extracción de URLs completada:'));
        }

        urls.forEach(url => console.info(`[+] ${url}`));
    }
}

module.exports = ExtractUrlScanner;
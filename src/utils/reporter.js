/**
 * Accumulates scan findings and emits a structured JSON report.
 */
class ScanReporter {
    constructor(config) {
        this.config = config;
        this.findings = [];
        this.startedAt = new Date().toISOString();
        this.completedAt = null;
        this._startMs = Date.now();
        this._durationMs = null;
    }

    /**
     * Adds a finding to the report.
     * @param {Object} finding - Finding object (endpoint, result, response)
     */
    addFinding(finding) {
        finding.index = this.findings.length + 1;
        this.findings.push(finding);
    }

    /**
     * Marks the scan as complete and records elapsed time.
     */
    complete() {
        this.completedAt = new Date().toISOString();
        this._durationMs = Date.now() - this._startMs;
    }

    _buildSummary() {
        const summary = {
            total_endpoints: this.findings.length,
            vulnerable: 0,
            protected: 0,
            uncertain: 0,
            info: 0
        };

        for (const f of this.findings) {
            const status = f.result && f.result.status ? f.result.status : 'info';
            if (Object.prototype.hasOwnProperty.call(summary, status)) {
                summary[status]++;
            } else {
                summary.info++;
            }
        }

        return summary;
    }

    /**
     * Returns the full report as a plain object.
     * @returns {Object}
     */
    getReport() {
        return {
            scan: {
                type: this.config.scanType,
                collection: this.config.collectionFile,
                started_at: this.startedAt,
                completed_at: this.completedAt,
                duration_ms: this._durationMs,
                config: {
                    threads: this.config.threads,
                    repeat: this.config.repeat,
                    insecure: this.config.insecureReq,
                    proxy: this.config.proxyURL || null
                }
            },
            summary: this._buildSummary(),
            findings: this.findings
        };
    }

    /**
     * Writes the JSON report to stdout.
     */
    print() {
        process.stdout.write(JSON.stringify(this.getReport(), null, 2) + '\n');
    }
}

module.exports = ScanReporter;

const alerting = require('../analytics/alerting');
const expect = require("chai").expect;

describe("Availibility Alerting Logs", () => {
    it("preserves existing log messages", () => {
        const logMessages = [{
            type: 'up',
            availibility: 0.85}];
        const availibilityStats = {
            statusChanged: true,
            isAvailable: false,
            availibility: 0.7
        };
        const newLogMessages = alerting(logMessages,availibilityStats);

        //TEST PHASE
        expect(newLogMessages.length).to.equal(2);
    });’
});

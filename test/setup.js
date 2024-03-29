let { SpecReporter } = require('jasmine-spec-reporter');

// in some tests, storybook takes a little while to start
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(
  new SpecReporter({
    spec: { displayPending: true },
    summary: { displayPending: false }
  })
);

/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'opennext-cache-repro',
      removal: input.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: { region: 'us-east-1' },
      },
    };
  },
  async run() {
    new sst.aws.Nextjs('Site', {
      buildCommand: 'npx open-next build',
    });
  },
});

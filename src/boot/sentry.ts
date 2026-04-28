import * as Sentry from '@sentry/vue';
import { boot } from 'quasar/wrappers';
import { version } from '../../package.json';

export default boot(({ app, router }) => {
  const dsn = process.env.QUASAR_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    app,
    dsn,
    integrations: [Sentry.browserTracingIntegration({ router }), Sentry.replayIntegration()],
    environment: process.env.QUASAR_ENVIRONMENT,
    release: version,
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for tracing.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,

    // Set tracePropagationTargets to control for which URLs trace propagation should be enabled
    tracePropagationTargets: [
      'localhost',
      process.env.INTERACTION_INFRA_API as string,
      process.env.BACKEND_API as string,
      window.location.origin,
    ].filter((v) => !!v),

    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
});
export const setSentryUserInfo = (user: { id: string; name: string }) => {
  const dsn = process.env.QUASAR_SENTRY_DSN;
  if (!dsn) return;
  Sentry.setUser({ id: user.id, name: user.name });
};

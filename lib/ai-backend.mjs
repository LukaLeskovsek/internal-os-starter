/** Shared by the server and setup checker. Contains no credentials or model calls. */
export class AiSetupError extends Error {
  constructor(code) {
    super(code);
    this.name = 'AiSetupError';
    this.code = code;
  }
}

/** Explicit API selection is required off Vercel, including local production builds. */
export function aiBackend(env = process.env) {
  const backend = env.AI_BACKEND || (env.VERCEL ? 'openrouter' : 'local-claude');
  if (!['local-claude', 'openrouter'].includes(backend)) throw new AiSetupError('backend');
  if (env.VERCEL && backend === 'local-claude') throw new AiSetupError('hosted-local');
  return backend;
}

/** Keep the installed account login; remove environment credentials/providers.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {NodeJS.ProcessEnv}
 */
export function localClaudeEnv(env = process.env) {
  return /** @type {NodeJS.ProcessEnv} */ (Object.fromEntries(Object.entries(env).filter(([key]) =>
    !key.startsWith('ANTHROPIC_') && !key.startsWith('CLAUDE_CODE_USE_') &&
    key !== 'CLAUDE_CODE_OAUTH_TOKEN' && key !== 'OPENROUTER_API_KEY'
  )));
}

export function isSubscriptionAuth(status) {
  return status?.loggedIn === true && status?.authMethod === 'claude.ai' &&
    ['pro', 'max', 'team', 'enterprise'].includes(status?.subscriptionType);
}

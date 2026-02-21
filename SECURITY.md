# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly. **Do not open a public issue.**

### How to Report

Send an email to **security@klaps.space** with:

- A description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Suggested fix (optional)

### What to Expect

- **Acknowledgment** within 48 hours
- **Status update** within 7 days
- **Fix or mitigation** as soon as practically possible

We will coordinate disclosure with you and credit you (unless you prefer anonymity).

## Scope

The following are in scope:

- Authentication/authorization bypasses
- SQL injection or ORM query manipulation
- Sensitive data exposure (API keys, credentials, PII)
- Rate limiting bypass
- Denial of service via API abuse

The following are out of scope:

- Vulnerabilities in third-party dependencies (report those upstream)
- Issues requiring physical access to the server
- Social engineering

## Security Best Practices (for contributors)

- Never commit secrets (`.env`, API keys, credentials) to the repository
- Use `class-validator` for all DTO input validation
- Keep dependencies up to date (`yarn upgrade-interactive`)
- All write endpoints must be guarded by `InternalApiKeyGuard`

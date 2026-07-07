# Prototype security baseline

This is not a production deployment.

Still enforce:

- hashed local passwords;
- server-side role checks;
- customers can access only their own tickets;
- experts can access only their demo scope;
- managers can access only manager endpoints;
- direct invalid status transitions fail;
- secrets are not committed;
- logs do not contain passwords.

Deferred:

- real Active Directory hardening;
- production cookie policy;
- full TLS and reverse-proxy hardening;
- penetration testing;
- enterprise audit retention;
- external secret management.

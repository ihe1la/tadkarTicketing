# Evidence catalog

## Local references

| File                          | Purpose                                    | Trust boundary                                        |
| ----------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| `reference/env.js`            | Runtime frontend URLs                      | Direct deployment evidence                            |
| `reference/main.bundle.js`    | Compiled Angular application               | Behavior and string evidence only                     |
| `reference/scripts.bundle.js` | Third-party/global browser code            | Technology evidence only                              |
| `reference/session.har`       | Requests loaded during one browser session | Incomplete; may contain sensitive metadata            |
| `reference/acunetix.xml`      | Scanner surface and configuration findings | Scanner output; verify before operational conclusions |
| `reference/screenshots/`      | DevTools source-tree views                 | UI/module naming evidence                             |

## Scanner-discovered surface

The scanner file lists:

- `/`;
- `/assets/`;
- `/assets/dx-styles/`;
- `/assets/dx-styles/dx.dark.css`;
- `/assets/dx-styles/dx.light.css`;
- `/assets/dx-styles/icons/`;
- `/assets/env.js`;
- `/clientaccesspolicy.xml`;
- `/crossdomain.xml`;
- `/formbuilder/`;
- `/formbuilder/api`;
- production JavaScript bundles;
- production stylesheet;
- `robots.txt`.

## Scanner findings to turn into new-build requirements

- old TLS protocol support was reported;
- certificate-expiry monitoring was needed;
- CSP was absent on scanned pages;
- HSTS policy was weaker than scanner guidance;
- Permissions-Policy was absent.

Do not treat scanner severity as authoritative without validation. For the replacement, implement a modern baseline regardless.

## HAR limitation

The supplied HAR contains static assets and repeated localization requests. It does not contain a complete authenticated API workflow. Exact old backend contracts are therefore unknown.

## Evidence handling

- Never write cookies, authorization headers, passwords, or tokens into generated documentation.
- Strip query-string secrets.
- Do not contact the old deployment.
- Do not treat a bundle string as proof that a feature is reachable or authorized.

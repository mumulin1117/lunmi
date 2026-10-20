# Lunmi CI signing configuration

Configure these as individual variables in the CircleCI `lunmi` project's **Project Settings → Environment Variables**. Local `fastlane/.env` and `.p8` files are not committed or available on the CI machine.

- `FASTLANE_USER`: the Apple account identifier; this Fastfile also uses it as the Match certificate repository branch.
- `BUNDLE_ID`: the real application's identifier, currently `com.Lunmi.app`.
- `EXPORT_METHOD`: `ad-hoc` or `app-store`.
- `ASC_KEY_ID` and `ASC_ISSUER_ID`: the identifiers for the same App Store Connect key.
- `MATCH_PASSWORD`: the existing Match certificate repository password.
- `pgy_api_key`: required for the current `ad-hoc` upload lane.

Supply the private key in exactly one of these two variables:

- `ASC_KEY_CONTENT`: paste the complete downloaded `.p8` PEM contents, including the `BEGIN PRIVATE KEY` and `END PRIVATE KEY` lines. Do not paste an entire `.env` assignment.
- `ASC_KEY_CONTENT_BASE64`: Base64-encode the complete `.p8` file. This avoids multiline entry issues. On macOS, replace the path below with the newly downloaded key and copy the result directly to the clipboard:

```sh
base64 < /path/to/new-key.p8 | tr -d '\r\n' | pbcopy
```

Do not configure both key-content variables. When switching formats, remove the old variable. Do not commit private keys, encoded private keys or the local `.env` file.

The key loader accepts surrounding whitespace, an accidental matching quote pair, real or escaped newlines, and an optional UTF-8 BOM. It validates that the key is an EC P-256 private key before Fastlane creates its real token. This local check does not verify whether Apple has revoked the key, whether its identifiers match, or whether it has the required account permissions. No key contents are printed.

Changing CI code requires committing and pushing the new code before starting a pipeline for that commit. Rerunning a pipeline for an older commit does not include later Fastfile changes. Use a newly issued key if the old private key was disclosed.

Local checks use newly generated synthetic keys and do not contact Apple:

```sh
ruby fastlane/signing_key_test.rb
```

The iOS Xcode project remains independent of these Fastlane files; it requires no iOS `scripts/` directory, Node.js or H5 source to build and archive.

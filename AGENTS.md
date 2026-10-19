# Lunmi development

- The H5 source is `lunmi_h5/`. The iOS project is `LunmiBrafer/LunmiBrafer.xcodeproj`, scheme `LunmiBrafer`.
- The user requires all subsequent project changes to remain synchronized with the iOS project. After changing H5 source, assets, locales, configuration or build scripts, run `pnpm sync:ios` in `lunmi_h5/`, then `pnpm check:ios-sync`. Do not finish a task with stale bundled resources.
- `LunmiBrafer/LunmiBrafer/lunimcenter.bundledata` is the single generated H5 resource file (two compression layers, AES-256-GCM). Its manifest is encrypted inside the file; do not restore a separate `manifest.json`, `lunimcenter/` resource directory or plaintext `Web/` bundle. Edit H5 source rather than the generated package. `build:h5` automatically repackages it; the Xcode build phase also checks and refreshes it. The `LunimcenterPackageKey` declaration is embedded in `LunimcenterArchive.swift`; keep it paired with the package and never print its key value.
- Use `pnpm watch:ios` during continuous H5 editing. This is a local file watcher, not a scheduled Codex automation.
- After native changes, build the `LunmiBrafer` scheme for an available iOS simulator. Do not introduce a second app name or recreate the project under another name.
- Keep existing English/Japanese switching, 18+ legal copy and `lunmi_user@gmail.com` consistent.
- Preserve the existing bridge message names. Treat messages as untrusted input; allow native actions only from the bundled main-frame origin. Never simulate successful Apple login, permission authorization, payment or server delivery.
- Backend API addresses, signing Team, production Bundle ID and payment verification require real configuration. Do not invent credentials or server contracts.
- Apply `.cursor/rules/ios-sync.mdc` for the synchronization workflow.

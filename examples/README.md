# Examples

These examples are used to quickly verify two integration methods (iframe / SDK).

## 1) iframe Example

Open `examples/iframe/index.html` and replace `viewerUrl` and `messagesUrl` with your actual deployment addresses.

## 2) SDK Example (Local to this repository)

First, build the embed package:

```bash
npm install
npm run embed:build
```

Then open `examples/sdk/index.html`. This example references `packages/embed/dist/index.js` via a relative path.

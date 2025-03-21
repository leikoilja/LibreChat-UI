# LibreChat UI

<div align="center">
  <img src="build/icon.png" alt="icon" width="200"/>
</div>

## Overview

LibreChat UI is a native desktop application wrapper for self-hosted LibreChat instances, built using Electron. This application provides a convenient way to access your LibreChat instance directly from your desktop.

## Features

- Native desktop application for LibreChat
- Cross-platform support (for now it's just macOS, but feel free to request more OS support)
- Easy access to self-hosted or [managed](https://librechat-librechat.hf.space) LibreChat instances

## Installation

Grab the executable from the [Releases](https://github.com/leikoilja/librechat-ui/releases) page or follow the instructions below to build the application yourself.

## macOS: Important - Quarantine and Code Signing

Due to current code signing configurations (or lack thereof) the macOS releases may trigger Gatekeeper warnings ("App is damaged" or "Unidentified developer").

If you encounter this:

1.  **Move the app to your Applications folder.** This is important.
2.  **Open Terminal:** Open the Terminal application on your Mac.
3.  **Remove Quarantine Attribute:** Run the following command in the Terminal, replacing `/Applications/LibreChat UI.app` with the actual path to the LibreChat UI application if you moved it elsewhere:

    ```bash
    xattr -d com.apple.quarantine "/Applications/LibreChat UI.app"
    ```

    *   **Note:** `xattr` is a command-line tool for manipulating extended attributes of files. The `com.apple.quarantine` attribute is added to downloaded files as a security measure by macOS.

4.  **Open the Application:** You should now be able to open the application. You may still see a warning about the developer being unidentified, but you should be able to proceed.

**Why is this necessary?**

Ideally, the application would be properly code-signed to avoid these warnings. However, until code signing is fully configured in the automated build process, this workaround is required.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Requirements

- Node.js (version compatible with Electron 33.x)
- npm or yarn

#### Clone the Repository

```bash
git clone https://github.com/leikoilja/librechat-ui.git
cd librechat-ui
```

#### Install Dependencies

```bash
yarn install
```

### Development

#### Start the Application

```bash
yarn start
```

#### Build Directory

```bash
yarn app:dir
```

#### Create Distribution Package

```bash
yarn app:dist
```

## Technologies

- Electron
- Electron Builder
- Electron Store

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
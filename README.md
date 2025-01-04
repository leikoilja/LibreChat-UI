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
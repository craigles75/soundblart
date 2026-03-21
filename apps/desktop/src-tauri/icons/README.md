# icons/

Place app icon files here. Tauri expects:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns`  (macOS)
- `icon.ico`   (Windows)

Generate them from a master 1024x1024 PNG using:

```
cargo tauri icon path/to/icon.png
```

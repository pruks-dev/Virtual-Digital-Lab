# Virtual Digital Lab

A web-based digital circuit simulator built with vanilla JavaScript, HTML, and CSS. Designed for education and quick prototyping of digital logic circuits.

## Features

- **Logic Gates** — AND, OR, NOT, NAND, NOR, XOR
- **Sequential Logic** — D Flip-Flop, JK Flip-Flop (rising-edge triggered)
- **Input/Output** — Toggle inputs, view live 1/0 values
- **Wiring** — Click-to-connect wiring between pins, bidirectional support, wire selection and deletion
- **Group Selection** — Shift+click multi-select, marquee rectangle drag-selection
- **Drag & Drop** — Drag gates from toolbar palettes onto workspace, group drag to move
- **Snap to Grid** — 24px grid alignment
- **Zoom** — 25%–300% zoom via Ctrl+wheel or toolbar buttons
- **Undo/Redo** — Full state snapshots (max 50), Ctrl+Z / Ctrl+Shift+Z
- **Copy/Paste** — Ctrl+C / Ctrl+V for selected gates with internal wire routing
- **Save/Load** — Export/import `.dcs` circuit files
- **Deletion** — Drag to trash bin, right-click context menu, Delete/Backspace key
- **Dark/Light Theme** — Toggle with sliding switch, persisted in localStorage
- **Keyboard Shortcuts** — Ctrl+Z undo, Ctrl+Y redo, Ctrl+C copy, Ctrl+V paste, Delete remove

## Usage

1. Open `index.html` in any modern browser (or serve with `python3 -m http.server 8080`)
2. Drag gates from the toolbar palettes (I/O, Logic, Seq) onto the workspace
3. Click a pin to start wiring, then click another pin to connect
4. Click INPUT gates to toggle their value — simulation runs automatically
5. Use zoom, undo/redo, and save/load as needed

## License

MIT License — see [LICENSE](LICENSE)

## Author

**Pruk Sasithong, Ph.D.** — pruk.s@eng.kmutnb.ac.th  
Department of Electrical and Computer Engineering  
Faculty of Engineering  
King Mongkut's University of Technology North Bangkok

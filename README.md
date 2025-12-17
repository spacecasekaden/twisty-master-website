# Twisty Puzzle Master 🧩

A stunning 3D twisty puzzle game featuring Rubik's Cubes (2×2 to 30×30), Pyraminx, and Megaminx puzzles!

## Features

- **Rubik's Cubes**: From 2×2×2 all the way up to 30×30×30
- **Pyraminx**: The classic triangular pyramid puzzle
- **Megaminx**: The 12-sided dodecahedron challenge
- **Full 3D interaction**: Click and drag to rotate faces
- **Timer & Move counter**: Track your solving progress
- **Scramble & Reset**: Get a random scramble or reset to solved state
- **Keyboard controls**: Use standard cube notation (U, D, L, R, F, B)

## How to Play

1. **Select a puzzle** from the left sidebar
2. **Adjust cube size** using the slider (for Rubik's Cube)
3. **Click SCRAMBLE** to randomize the puzzle
4. **Rotate the view**: Click and drag on empty space
5. **Turn a face**: Click on a cubie and drag in the direction you want to turn

## Controls

### Mouse
- **Rotate View**: Click + Drag on background
- **Turn Face**: Click on a cubie face + Drag
- **Zoom**: Scroll wheel

### Keyboard (Rubik's Cube)
- `U` - Up face clockwise
- `D` - Down face clockwise
- `L` - Left face clockwise
- `R` - Right face clockwise
- `F` - Front face clockwise
- `B` - Back face clockwise
- `M` - Middle layer (follows L)
- `E` - Equatorial layer (follows D)
- `S` - Standing layer (follows F)
- Hold `Shift` for counter-clockwise moves

## Running the Game

```bash
npx serve .
```

Then open http://localhost:3000 in your browser.

## Technologies Used

- **Three.js** - 3D graphics rendering
- **Vanilla JavaScript** - Game logic
- **CSS3** - Cyberpunk neon UI theme

## Browser Support

Works best in modern browsers with WebGL support:
- Chrome (recommended)
- Firefox
- Safari
- Edge

Enjoy solving! 🎮


# DiffractionFun

Interactive web application for visualizing 2D Fourier transforms in real-time.

## Features

- **Drawing Panel**: Draw patterns on the left canvas using your mouse
- **Fourier Transform Display**: See the 2D Fourier transform update in real-time on the right canvas
- **Clear Button**: Reset both canvases to start fresh
- **Labeled Axes**: Both panels show x/y axes for spatial domain and kx/ky axes for frequency domain

## Usage

Visit the live application at: https://thealpacaalgorithm.github.io/DiffractionFun/

1. Draw patterns on the left canvas by clicking and dragging your mouse
2. Watch as the right canvas automatically updates to show the 2D Fourier transform
3. Click the "Clear" button to reset and draw something new

## How It Works

The application performs a discrete 2D Fourier transform on the drawing in the spatial domain (left panel) and visualizes the result in the frequency domain (right panel). The transform is computed using:

- Discrete Fourier Transform (DFT) algorithm
- Logarithmic scaling for better visualization
- Zero-frequency component shifted to center
- Real-time auto-updating as you draw

## Local Development

To run locally, simply open `index.html` in a web browser, or serve it with any HTTP server:

```bash
python3 -m http.server 8000
```

Then navigate to `http://localhost:8000/index.html`
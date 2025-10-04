# R & Python Web IDE

Welcome to the R & Python Web IDE, a powerful, browser-based development environment that allows you to write and execute both R and Python code directly in your web browser. This application is powered by **WebR** and **Pyodide**, which bring the R and Python runtimes to the browser via WebAssembly, eliminating the need for any server-side computation.

This IDE mimics the experience of a desktop application, providing a feature-rich environment for data analysis, visualization, and scripting.


## ✨ Key Features

- **Dual Language Support**: Seamlessly switch between R and Python environments with a single click. The entire IDE context, including the editor and output panels, adapts to your chosen language.
- **Advanced Code Editor**: Utilizes the Monaco Editor (the engine behind VS Code) for a premium coding experience with syntax highlighting, code suggestions, and keyboard shortcuts (`Ctrl/Cmd + Enter` to run).
- **Interactive Console**: Each language has its own interactive REPL in the "Console" tab, allowing you to execute commands on the fly.
- **Environment Viewer**: Inspect all the variables, functions, and data frames currently in your workspace.
- **Interactive Data Viewer**: Click on an R `data.frame` or a Python `pandas.DataFrame` in the environment to view it in a sortable, interactive table.
- **Plot Viewer**: Automatically captures and displays plots generated with R's base graphics, `ggplot2`, or Python's `matplotlib`. You can navigate through multiple plots and download them as PNGs.
- **Resizable Layout**: Adjust the size of the editor and output panels by dragging the divider to suit your workflow.
- **Zero Backend Dependency**: All code execution happens entirely within your browser, ensuring privacy and speed.

## 🚀 How to Use

1.  **Select a Language**: At the top right of the editor panel, choose between **R** and **Python**. The editor will load with a sample script for the selected language.
2.  **Write Code**: Write or modify your script in the editor panel on the left.
3.  **Run Code**:
    - Click the **Run** button.
    - Use the keyboard shortcut: `Ctrl + Enter` (on Windows/Linux) or `Cmd + Enter` (on macOS).
4.  **View Results**:
    - **Console**: See direct output from your script (e.g., from `print()` statements) in the "Console" tab. You can also type commands directly into the input prompt at the bottom of the console.
    - **Environment**: Check the "Environment" tab to see all the objects (variables, functions, data frames) created by your script.
    - **Tables / Viewer**: If you create a `data.frame` in R or a `DataFrame` in Python, click its name in the "Environment" tab to open it in the "Tables" (for R) or "Viewer" (for Python) tab. For R, you can also use the `View()` command.
    - **Plots**: Any graphical output will automatically appear in the "Plots" tab. Use the arrow buttons to navigate if your script generates multiple plots.

## 📋 Examples

### R Example

```r
# Welcome to the R Playground powered by WebR!
# The mtcars dataset is pre-loaded
dt.mtcars <- mtcars

# Using View() will display the data frame in the "Tables" tab
View(dt.mtcars)

# A more complex plot with ggplot2
# This can take a moment to load the package for the first time.
if (!require("ggplot2")) install.packages("ggplot2")
library(ggplot2)

ggplot(mtcars, aes(x = wt, y = mpg, color = factor(cyl))) +
  geom_point(size = 4) +
  labs(
    title = "Fuel Efficiency by Weight and Cylinders",
    x = "Weight (1000 lbs)",
    y = "Miles per Gallon (MPG)",
    color = "Cylinders"
  ) +
  theme_minimal()
```

### Python Example

```python
# Welcome to the Python Playground powered by Pyodide!
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Create a pandas DataFrame
# Click 'my_df' in the 'Environment' tab to view it.
data = {'col1': [1, 2, 3, 4], 'col2': [4, 5, 6, 7]}
my_df = pd.DataFrame(data)
print("My DataFrame:")
print(my_df)

# Generate a plot
# The output will appear in the "Plots" tab.
x = np.linspace(0, 10, 100)
y = np.sin(x) * np.exp(-x/5)

plt.figure()
plt.plot(x, y)
plt.title("Damped Sine Wave")
plt.xlabel("x")
plt.ylabel("sin(x) * exp(-x/5)")
plt.grid(True)
```

## 🛠️ Technologies Used

-   **React**: For building the user interface.
-   **TypeScript**: For type-safe JavaScript.
-   **WebR**: The R programming language compiled for WebAssembly.
-   **Pyodide**: The Python scientific stack compiled for WebAssembly.
-   **Monaco Editor**: The code editor that powers VS Code.
-   **Tailwind CSS**: For UI styling.
-   **Vite**: For the development environment and build tooling.

## ⚙️ Development and Setup

This project is set up using Vite for a modern development experience.

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation
1.  Clone the repository to your local machine.
2.  Navigate to the project directory in your terminal.
3.  Install the necessary dependencies:
    ```bash
    npm install
    ```

### Running the Development Server
To run the application in development mode with hot-reloading:
```bash
npm run dev
```
This will start a local development server. Open the URL provided in the terminal (usually `http://localhost:5173`) in your browser.

**Important**: The development server is configured to provide the necessary Cross-Origin Isolation headers required by WebR and Pyodide.

### Building for Production
To create an optimized static build of the application:
```bash
npm run build
```
This command will generate a `dist` directory containing all the static files for your application.

### Serving the Production Build
You can serve the contents of the `dist` folder using any static file server. For example, using Python 3:
```bash
# First, build the app
npm run build

# Then, navigate into the output directory
cd dist

# Serve the files
python -m http.server
```
Then open `http://localhost:8000` in your browser. Note that for WebR and Pyodide to function correctly, the server must provide specific Cross-Origin Isolation headers (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`). The `index.html` includes these as meta tags, which works for most simple servers.

---

This project was created to demonstrate the power of WebAssembly for running complex applications like data science environments directly in the browser.

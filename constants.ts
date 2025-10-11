
export const INITIAL_CODE = `
# Welcome to the R Playground powered by WebR!
# Type your R code in the editor and click "Run".
dt.mtcars <- mtcars

# Example 1: Basic plotting
# The output will appear in the "Plots" tab.
plot(1:20, (1:20)^2, main="A Simple Scatter Plot", xlab="X-axis", ylab="Y-axis", col="blue", pch=19)

# Example 2: Working with data frames
# Console output will show the printed data frame.
my_data <- data.frame(
  ID = 1:5,
  Name = c("Alice", "Bob", "Charlie", "David", "Eve"),
  Score = c(85, 92, 78, 88, 95)
)
print("My Data Frame:")
print(my_data)

# Example 3: Using View()
# This will display the data frame in the "Viewer" tab.
# The Viewer provides an interactive table.
View(mtcars)

# Example 4: A more complex plot with ggplot2
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
`;


export const INITIAL_PYTHON_CODE = `
# Welcome to the Python Playground!
# This environment is powered by Pyodide (Python in WebAssembly).
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Example 1: Basic printing
print("Hello, Python!")

# Example 2: Working with pandas DataFrames
# Click the variable name in the 'Environment' tab to view it.
data = {'col1': [1, 2, 3], 'col2': [4, 5, 6]}
my_df = pd.DataFrame(data)
print("My DataFrame:")
print(my_df)

# Example 3: Generating a plot
# The output will appear in the "Plots" tab.
x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.figure()
plt.plot(x, y)
plt.title("Sine Wave")
plt.xlabel("x")
plt.ylabel("sin(x)")
plt.grid(True)
# The plot is captured automatically after the script runs.

# Example 4: A figure object in the environment
# Click 'fig_object' in the Environment tab to view it in Plots.
fig_object, ax = plt.subplots()
ax.plot([1, 2, 3], [9, 4, 1])
ax.set_title("A Figure Object")

# This variable will appear in the environment viewer
a_variable = 42
`;